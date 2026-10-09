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
  { id: "NSSelectorFromString", pattern: /\bNSSelectorFromString\s*\(/ },
  { id: "performSelector", pattern: /\bperformSelector\s*\(/ },
  { id: "NSClassFromString", pattern: /\bNSClassFromString\s*\(/ },
  { id: "methodSwizzling", pattern: /swizzl/i },
  { id: "dlopen", pattern: /\bdlopen\s*\(/ },
  { id: "dlsym", pattern: /\bdlsym\s*\(/ },
  { id: "kvcSetValueForKey", pattern: /\.setValue\s*\([^,]+,\s*forKey:/ },
  { id: "uidatePickerTextColorKVC", pattern: /forKey:\s*"textColor"/ },
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

function scanFile(filePath) {
  const txt = fs.readFileSync(filePath, "utf8");
  const lines = txt.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        hits.push({ rule: rule.id, line: i + 1, text: line.trim() });
      }
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
