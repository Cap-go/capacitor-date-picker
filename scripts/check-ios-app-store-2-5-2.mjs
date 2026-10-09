#!/usr/bin/env node
/**
 * App Store Guideline 2.5.2 guard for iOS plugin sources.
 *
 * Fails when native Swift code uses dynamic dispatch or private KVC patterns
 * commonly flagged during App Review.
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

/** @type {{ id: string, pattern: RegExp }[]} */
const RULES = [
  { id: "NSSelectorFromString", pattern: /\bNSSelectorFromString\s*\(/g },
  { id: "performSelector", pattern: /\bperformSelector\s*\(/g },
  { id: "NSClassFromString", pattern: /\bNSClassFromString\s*\(/g },
  { id: "methodSwizzling", pattern: /swizzl/gi },
  { id: "dlopen", pattern: /\bdlopen\s*\(/g },
  { id: "dlsym", pattern: /\bdlsym\s*\(/g },
  { id: "kvcSetValueForKey", pattern: /\.setValue\s*\([\s\S]*?forKey:/g },
  { id: "uidatePickerTextColorKVC", pattern: /forKey:\s*"textColor"/g },
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

function scanFile(filePath) {
  const txt = fs.readFileSync(filePath, "utf8");
  const hits = [];
  for (const rule of RULES) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match = pattern.exec(txt);
    while (match) {
      const line = lineNumberAtIndex(txt, match.index);
      hits.push({ rule: rule.id, line, text: lineTextAt(txt, line) });
      match = pattern.exec(txt);
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
