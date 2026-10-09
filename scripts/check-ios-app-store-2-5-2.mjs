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
 *
 * Self-test fixtures cover implicit-self KVC, paren-in-string boundaries, and runtime keys.
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
  {
    id: "stringConcatKeyAssignment",
    pattern: /\b(?:let|var)\s+\w+\s*=\s*"[^"]*"\s*\+/g,
  },
  {
    id: "selectorIdentifierArgument",
    pattern: /Selector\s*\(\s*[a-z_][a-zA-Z0-9_]*\s*\)/g,
  },
];

const QUALIFIED_FOR_KEY = /forKey:\s*[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)+/;
const INLINE_FOR_KEY = /forKey:\s*"/;
const UNQUALIFIED_FOR_KEY = /forKey:\s*(?![A-Za-z_][\w]*\.)[A-Za-z_][\w]*\s*[,)]/;

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

function findClosingParen(txt, openIndex) {
  let depth = 0;
  let i = openIndex;
  let inLineComment = false;
  let inBlockComment = false;
  let inString = false;
  let stringQuote = "";
  let escape = false;

  while (i < txt.length) {
    const ch = txt[i];
    const next = txt[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inString) {
      if (escape) {
        escape = false;
        i++;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        i++;
        continue;
      }
      if (ch === stringQuote) {
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringQuote = ch;
      i++;
      continue;
    }

    if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
    i++;
  }
  return -1;
}

function nextSetValueSite(txt, from) {
  const dot = txt.indexOf(".setValue(", from);
  const word = /\bsetValue\(/g;
  word.lastIndex = from;
  let implicit = -1;
  let match = word.exec(txt);
  while (match) {
    const idx = match.index;
    if (idx > 0 && txt[idx - 1] === ".") {
      match = word.exec(txt);
      continue;
    }
    implicit = idx;
    break;
  }

  if (dot === -1 && implicit === -1) {
    return null;
  }
  if (dot !== -1 && (implicit === -1 || dot <= implicit)) {
    return { index: dot, implicit: false };
  }
  return { index: implicit, implicit: true };
}

function findSetValueCalls(txt) {
  const calls = [];
  let search = 0;
  while (search < txt.length) {
    const site = nextSetValueSite(txt, search);
    if (!site) {
      break;
    }
    const open = txt.indexOf("(", site.index);
    if (open === -1) {
      break;
    }
    const end = findClosingParen(txt, open);
    if (end === -1) {
      break;
    }
    const body = txt.slice(site.index, end);
    calls.push({ start: site.index, end, body, implicit: site.implicit });
    search = end;
  }
  return calls;
}

function checkSetValueKvc(call, lines, txt, fileLabel) {
  if (!/forKey:/.test(call.body)) {
    return [];
  }

  const line = lineNumberAtIndex(txt, call.start);
  const hits = [];
  const allowed = hasAllowComment(lines, line);

  if (INLINE_FOR_KEY.test(call.body) && !allowed) {
    hits.push({
      rule: "kvcInlineStringForKey",
      line,
      text: lineTextAt(txt, line),
      file: fileLabel,
    });
  }

  if (UNQUALIFIED_FOR_KEY.test(call.body)) {
    hits.push({
      rule: "kvcUnqualifiedIdentifierForKey",
      line,
      text: lineTextAt(txt, line),
      file: fileLabel,
    });
  }

  if (QUALIFIED_FOR_KEY.test(call.body) && !allowed) {
    hits.push({
      rule: "kvcQualifiedForKeyMissingAllow",
      line,
      text: lineTextAt(txt, line),
      file: fileLabel,
    });
  }

  return hits;
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
    hits.push(...checkSetValueKvc(call, lines, txt, fileLabel));
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
    // appstore-2.5.2-allow: test fixture
    picker.setValue(a, forKey: StaticKeys.other)
  `;
  const badAdjacent = `
    // appstore-2.5.2-allow: first call only
    picker.setValue(a, forKey: StaticKeys.other)
    picker.setValue(b, forKey: "textColor")
  `;
  const badInterpolation = `Selector("set\\(name):")`;
  const badImplicit = `setValue(color, forKey: "textColor")`;
  const badParenInString = `picker.setValue(")", forKey: "textColor")`;
  const badRuntimeKey = `let key = "text" + "Color"; picker.setValue(color, forKey: key)`;
  const badSelectorId = `Selector(key)`;

  const expectations = [
    [good, 0, "good fixture"],
    [badAdjacent, "kvcInlineStringForKey", "adjacent inline forKey"],
    [badInterpolation, "selectorInterpolatedString", "selector interpolation"],
    [badImplicit, "kvcInlineStringForKey", "implicit self setValue"],
    [badParenInString, "kvcInlineStringForKey", "paren inside string literal"],
    [badRuntimeKey, "stringConcatKeyAssignment", "runtime key concat"],
    [badSelectorId, "selectorIdentifierArgument", "selector identifier"],
  ];

  for (const [fixture, expect, label] of expectations) {
    const hits = scanText(fixture);
    if (expect === 0) {
      if (hits.length !== 0) {
        console.error(`[ios-2.5.2] self-test FAIL: ${label}`);
        process.exit(1);
      }
      continue;
    }
    if (!hits.some((h) => h.rule === expect)) {
      console.error(`[ios-2.5.2] self-test FAIL: expected ${expect} for ${label}`);
      process.exit(1);
    }
  }

  const badUnqualifiedAllowed = `
    // appstore-2.5.2-allow: should not waive unqualified key
    picker.setValue(color, forKey: key)
  `;
  if (!scanText(badUnqualifiedAllowed).some((h) => h.rule === "kvcUnqualifiedIdentifierForKey")) {
    console.error("[ios-2.5.2] self-test FAIL: unqualified forKey identifier");
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
