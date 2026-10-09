#!/usr/bin/env node
/**
 * App Store Guideline 2.5.2 guard for iOS plugin sources.
 *
 * Blocks runtime-built selectors/class names and unobfuscated dynamic dispatch.
 * Allows documented private API usage when keyed by compile-time static constants
 * and marked with `// appstore-2.5.2-allow: <reason>` on the call site.
 *
 * Usage:
 *   node scripts/check-ios-app-store-2-5-2.mjs
 *   node scripts/check-ios-app-store-2-5-2.mjs --self-test
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".build",
  ".gradle",
  "Pods",
  "DerivedData",
  ".swiftpm",
  ".git",
  "example-app",
]);

const ALLOW_TAG = "appstore-2.5.2-allow:";

/** @type {{ id: string, pattern: RegExp }[]} */
const HARD_BAN_RULES = [
  { id: "NSSelectorFromString", pattern: /\bNSSelectorFromString\s*\(/g },
  { id: "performSelector", pattern: /\bperformSelector\s*\(/g },
  { id: "NSClassFromString", pattern: /\bNSClassFromString\s*\(/g },
  { id: "methodSwizzling", pattern: /swizzl/gi },
  { id: "dlopen", pattern: /\bdlopen\s*\(/g },
  { id: "dlsym", pattern: /\bdlsym\s*\(/g },
];

/** @type {{ id: string, pattern: RegExp }[]} */
const RUNTIME_NAME_RULES = [
  { id: "forKeyConcatenation", pattern: /forKey:\s*"[^"]*"\s*\+/g },
  { id: "selectorConcatenation", pattern: /Selector\s*\(\s*[^)]*\+/g },
  {
    id: "forKeyInterpolatedString",
    pattern: /forKey:\s*"[^"]*\\\([^"]*"/g,
  },
  {
    id: "selectorInterpolatedString",
    pattern: /Selector\s*\(\s*"[^"]*\\\([^"]*"\s*\)/g,
  },
];

function walkSwiftFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        stack.push(path.join(dir, e.name));
        continue;
      }
      if (e.isFile() && e.name.endsWith(".swift")) {
        out.push(path.join(dir, e.name));
      }
    }
  }
  out.sort();
  return out;
}

function lineNumberAtIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function lineTextAt(text, lineNumber) {
  const lines = text.split(/\r?\n/);
  return (lines[lineNumber - 1] ?? "").trim();
}

function hasAllowComment(lines, lineNumber) {
  const index = lineNumber - 1;
  for (let offset = 0; offset <= 1; offset++) {
    const line = lines[index - offset];
    if (line?.includes(ALLOW_TAG)) {
      return true;
    }
  }
  return false;
}

function collectMatches(txt, pattern) {
  const re = new RegExp(pattern.source, pattern.flags);
  const hits = [];
  let match = re.exec(txt);
  while (match) {
    hits.push({ index: match.index, length: match[0].length });
    match = re.exec(txt);
  }
  return hits;
}

function findSetValueCalls(txt) {
  const calls = [];
  let search = 0;
  while (search < txt.length) {
    const marker = txt.indexOf(".setValue(", search);
    if (marker === -1) {
      break;
    }
    const open = txt.indexOf("(", marker);
    if (open === -1) {
      break;
    }
    let depth = 0;
    let end = -1;
    for (let i = open; i < txt.length; i++) {
      const ch = txt[i];
      if (ch === "(") {
        depth++;
      } else if (ch === ")") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end === -1) {
      break;
    }
    calls.push({ start: marker, end, body: txt.slice(marker, end) });
    search = end;
  }
  return calls;
}

function scanText(txt, fileLabel = "<inline>") {
  const lines = txt.split(/\r?\n/);
  const hits = [];

  for (const rule of HARD_BAN_RULES) {
    for (const match of collectMatches(txt, rule.pattern)) {
      const line = lineNumberAtIndex(txt, match.index);
      hits.push({ rule: rule.id, line, text: lineTextAt(txt, line), file: fileLabel });
    }
  }

  for (const rule of RUNTIME_NAME_RULES) {
    for (const match of collectMatches(txt, rule.pattern)) {
      const line = lineNumberAtIndex(txt, match.index);
      hits.push({ rule: rule.id, line, text: lineTextAt(txt, line), file: fileLabel });
    }
  }

  for (const call of findSetValueCalls(txt)) {
    if (!/forKey:\s*"/.test(call.body)) {
      continue;
    }
    const line = lineNumberAtIndex(txt, call.start);
    if (!hasAllowComment(lines, line)) {
      hits.push({
        rule: "kvcInlineStringForKey",
        line,
        text: lineTextAt(txt, line),
        file: fileLabel,
      });
    }
  }

  return hits;
}

function scanFile(filePath) {
  const txt = fs.readFileSync(filePath, "utf8");
  const rel = path.relative(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    filePath,
  );
  return scanText(txt, rel);
}

function runSelfTest() {
  const good = `
    // appstore-2.5.2-allow: test fixture
    picker.setValue(color, forKey: StaticKeys.textColorKey)
    picker.setValue(a, forKey: StaticKeys.other)
  `;
  const badAdjacent = `
    // appstore-2.5.2-allow: first call only
    picker.setValue(a, forKey: StaticKeys.other)
    picker.setValue(b, forKey: "textColor")
  `;
  const badInterpolation = `Selector("set\\(name):")`;

  const goodHits = scanText(good);
  const adjacentHits = scanText(badAdjacent);
  const interpolationHits = scanText(badInterpolation);

  if (goodHits.length !== 0) {
    console.error("[ios-2.5.2] self-test FAIL: expected no hits in good fixture");
    process.exit(1);
  }
  if (!adjacentHits.some((h) => h.rule === "kvcInlineStringForKey")) {
    console.error("[ios-2.5.2] self-test FAIL: expected adjacent inline forKey hit");
    process.exit(1);
  }
  if (!interpolationHits.some((h) => h.rule === "selectorInterpolatedString")) {
    console.error("[ios-2.5.2] self-test FAIL: expected selector interpolation hit");
    process.exit(1);
  }
  console.log("[ios-2.5.2] self-test OK");
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
  process.exit(0);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iosSources = path.join(repoRoot, "ios", "Sources");

if (!fs.existsSync(iosSources)) {
  console.error(`[ios-2.5.2] ERROR: missing ${iosSources}`);
  process.exit(2);
}

runSelfTest();

const violations = [];
for (const file of walkSwiftFiles(iosSources)) {
  violations.push(...scanFile(file));
}

if (violations.length) {
  console.error("[ios-2.5.2] FAIL");
  for (const v of violations) {
    console.error(`- ${v.rule}: ${v.file}:${v.line}: ${v.text}`);
  }
  process.exit(1);
}

console.log("[ios-2.5.2] OK");
process.exit(0);
