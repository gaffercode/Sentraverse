#!/usr/bin/env node
// Secret scan for this capsule: stops secrets and local data files before they reach Git.
//   node <this file>            every tracked file under this capsule (CI)
//   node <this file> --staged   only what is staged for the next commit (.githooks/pre-commit)
// Exit 0 = clean, 1 = findings, 2 = could not run. A finding names the file, the line and the rule; the matched
// text is never printed. Zero dependencies: Node and Git only, and nothing outside this capsule is read.
// A line that has to stay can carry the marker "secret-scan:allow"; a path prefix listed in .secret-scan-allow
// (one per line, "#" for comments) is skipped. --root <folder> scans another working tree (used by the tests).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const staged = args.includes("--staged");
const rootFlag = args.indexOf("--root");
const root = rootFlag >= 0 ? args[rootFlag + 1] : join(dirname(fileURLToPath(import.meta.url)), "..");

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOW_MARKER = "secret-scan:allow";

// Files that never belong in Git, whatever they contain. Matched against the file name.
const FORBIDDEN_FILES = [
  ["local env file", /^\.env(?:\.(?!(?:example|sample|template)$).+)?$/],
  ["key or certificate file", /\.(?:pem|key|p12|pfx)$/i],
  ["SSH private key", /^id_(?:rsa|ed25519)/],
  ["database, dump or backup file", /\.(?:sqlite3?|db|dump|pgdump|bak|backup)$|\.sql\.gz$/i],
  ["credentials file", /^(?:service-account|credentials).*\.json$/i],
];

// Formats that are secrets wherever they appear.
const TOKEN_RULES = [
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Anthropic or OpenAI key", /\bsk-(?:ant|proj|live)-[A-Za-z0-9_-]{16,}/],
  ["Stripe live key", /\b[sr]k_live_[A-Za-z0-9]{16,}/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{16,}/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[abprs]-[0-9A-Za-z-]{10,}/],
  ["JSON Web Token", /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
];

const DATABASE_URL = /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?):\/\/[^\s:/@"'`]+:([^\s@/"'`]+)@/g;
const PLACEHOLDER = /^(?:postgres|password|passwd|pass|secret|example|changeme|change-me|user|username|test|dummy|x+|\*+|\.{3}|<.*>|\[.*\]|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|your[-_a-z]*)$/i;

// NAME=value pairs are checked only in configuration-like files, where a long value next to a secret name is a secret.
const CONFIG_FILE = /^(?:\.env.*|.*\.(?:env|ya?ml|toml|ini|conf|cfg|properties|json|sh|ps1|service)|Dockerfile.*)$/i;
const ASSIGNED = /\b([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSCODE|API_KEY|PRIVATE_KEY)[A-Z0-9_]*)["']?\s*[:=]\s*["']?([^\s"'#,]{20,})/g;
const NOT_A_SECRET_NAME = /_(?:HASH|FILE|ID|URL|DIR|PATH|NAME)$/;
const NOT_A_SECRET_VALUE = /^[$<{/.]|example|placeholder|changeme|your[-_]|x{6,}/i;

function git(gitArgs) {
  const result = spawnSync("git", gitArgs, { cwd: root, encoding: "buffer", maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) return null;
  return result.stdout;
}

function candidates() {
  const listed = staged
    ? git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z", "--relative"])
    : git(["ls-files", "-z"]);
  if (listed === null) return null;
  return listed.toString("utf8").split("\0").filter(Boolean);
}

function contentOf(path) {
  if (staged) return git(["show", `:./${path}`]);
  const file = join(root, path);
  return existsSync(file) ? readFileSync(file) : null;
}

function allowedPrefixes() {
  const file = join(root, ".secret-scan-allow");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

function scanText(path, text) {
  const findings = [];
  const configFile = CONFIG_FILE.test(basename(path));
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.includes(ALLOW_MARKER)) return;
    for (const [rule, pattern] of TOKEN_RULES) if (pattern.test(line)) findings.push(`${path}:${index + 1}  ${rule}`);
    for (const match of line.matchAll(DATABASE_URL)) {
      if (!PLACEHOLDER.test(match[1])) findings.push(`${path}:${index + 1}  database URL with a password`);
    }
    if (!configFile) return;
    for (const match of line.matchAll(ASSIGNED)) {
      const [, name, value] = match;
      const looksReal = /[A-Za-z]/.test(value) && /[0-9]/.test(value) && !NOT_A_SECRET_VALUE.test(value);
      if (!NOT_A_SECRET_NAME.test(name) && looksReal) findings.push(`${path}:${index + 1}  value assigned to ${name}`);
    }
  });
  return findings;
}

const files = candidates();
if (files === null) {
  console.error("secret-scan: could not list files; run it inside a Git working tree.");
  process.exit(2);
}
const allowed = allowedPrefixes();
const findings = [];
for (const path of files) {
  if (allowed.some((prefix) => path === prefix || path.startsWith(prefix))) continue;
  const forbidden = FORBIDDEN_FILES.find(([, pattern]) => pattern.test(basename(path)));
  if (forbidden) {
    findings.push(`${path}  forbidden file: ${forbidden[0]}`);
    continue;
  }
  const content = contentOf(path);
  if (content === null || content.length > MAX_BYTES || content.subarray(0, 8000).includes(0)) continue;
  findings.push(...scanText(path, content.toString("utf8")));
}

if (findings.length > 0) {
  console.error(`secret-scan: ${findings.length} finding(s). Nothing was committed or printed in full.`);
  for (const finding of findings) console.error(`  ${finding}`);
  console.error(`Remove the secret or the file. If a line is a deliberate, harmless example, add "${ALLOW_MARKER}" to it.`);
  process.exit(1);
}
console.log(`secret-scan: ${files.length} file(s) checked${staged ? " (staged)" : ""}, no findings.`);
