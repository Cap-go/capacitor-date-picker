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
  { id: "forKeyStringInterpolation", pattern: /forKey:\s*\\\(/g },
  { id: "forKeyConcatenation", pattern: /forKey:\s*"[^"]*"\s*\+/g },
  { id: "selectorConcatenation", pattern: /Selector\s*\(\s*[^)]*\+/g },
  { id: "selectorInterpolation", pattern: /Selector\s*\(\s*\\\(/g },
];

const KVC_INLINE_STRING_FOR_KEY = /\.setValue\s*\([\s\S]*?forKey:\s*"[^"]*"/g;

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
  for (let offset = 0; offset <= 2; offset++) {
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

function scanFile(filePath) {
  const txt = fs.readFileSync(filePath, "utf8");
  const lines = txt.split(/\r?\n/);
  const hits = [];

  for (const rule of HARD_BAN_RULES) {
    for (const match of collectMatches(txt, rule.pattern)) {
      const line = lineNumberAtIndex(txt, match.index);
      hits.push({ rule: rule.id, line, text: lineTextAt(txt, line) });
    }
  }

  for (const rule of RUNTIME_NAME_RULES) {
    for (const match of collectMatches(txt, rule.pattern)) {
      const line = lineNumberAtIndex(txt, match.index);
      hits.push({ rule: rule.id, line, text: lineTextAt(txt, line) });
    }
  }

  for (const match of collectMatches(txt, KVC_INLINE_STRING_FOR_KEY)) {
    const line = lineNumberAtIndex(txt, match.index);
    if (!hasAllowComment(lines, line)) {
      hits.push({
        rule: "kvcInlineStringForKey",
        line,
        text: lineTextAt(txt, line),
      });
    }
  }

  return hits;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iosSources = path.join(repoRoot, "ios", "Sources");

if (!fs.existsSync(iosSources)) {
  console.error(`[ios-2.5.2] ERROR: missing ${iosSources}`);
  process.exit(2);
}

const violations = [];
for (const file of walkSwiftFiles(iosSources)) {
  for (const hit of scanFile(file)) {
    violations.push({
      ...hit,
      file: path.relative(repoRoot, file),
    });
  }
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
