#!/usr/bin/env node
// Secret scan for this capsule: stops secrets and data files before they reach Git.
//   node <this file>            every tracked file under this capsule (CI)
//   node <this file> --staged   only what is staged for the next commit (.githooks/pre-commit)
// Exit 0 = clean, 1 = findings, 2 = could not run. A finding names the file, the line and the rule; the matched
// text is never printed. Zero dependencies: Node and Git only, and nothing outside this capsule is read.
//
// What it refuses: known token formats, private keys, URLs that carry a password, filled secrets in
// configuration files, database dumps, and by name: env files, key files, databases and data exports
// (spreadsheets, CSV and similar). What it cannot do: tell real data from sample data inside an ordinary text,
// JSON or SQL file, or recognise a secret that has no known shape. It is a net, not a proof.
//
// Exceptions are deliberate and visible: a line may end with a comment holding "secret-scan:allow", and a
// tracked .secret-scan-allow file may list exact paths (or folders ending in "/"), one per line, "#" for comments.
// Env files can never be listed. Every exception used is counted in the output.
// --root <folder> scans another working tree (used by the tests).
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_TEXT_BYTES = 20 * 1024 * 1024;
const ALLOW_FILE = ".secret-scan-allow";
const ALLOW_MARKER = /(?:^|\s)(?:#|\/\/|--|\/\*|<!--)\s*secret-scan:allow\b/;

const ENV_FILE = /^\.env(?:\.(?!(?:example|sample|template)$).+)?$|^\.envrc$/;
// Other files that do not belong in Git. A reviewed exception goes into .secret-scan-allow by its exact path.
const FORBIDDEN_FILES = [
  ["key or certificate file", /\.(?:pem|key|p12|pfx)$/i],
  ["SSH private key", /^id_(?:rsa|ed25519|ecdsa|dsa)(?!.*\.pub$)/],
  ["database, dump or backup file", /\.(?:sqlite3?|db|dump|pgdump|bak|backup)$|\.sql\.gz$|\.(?:db|sqlite3?)-(?:wal|shm|journal)$/i],
  ["credentials file", /^(?:service-account|credentials).*\.json$/i],
  ["data export (spreadsheet, table or statistics file)", /\.(?:xlsx|xls|xlsm|ods|csv|tsv|parquet|sav|dta|mdb|accdb|dbf)$/i],
];

// Formats that are secrets wherever they appear. "mixed" rules need both a letter and a digit, which keeps
// ordinary identifiers out.
const TOKEN_RULES = [
  { rule: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { rule: "Anthropic key", pattern: /\bsk-ant-[A-Za-z0-9_-]{16,}/g },
  { rule: "OpenAI or OpenRouter key", pattern: /\bsk-(?:proj-|or-v1-|live-)?[A-Za-z0-9_-]{32,}/g, mixed: true },
  { rule: "Stripe or Clerk secret key", pattern: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/g, mixed: true },
  { rule: "webhook signing secret", pattern: /\bwhsec_[A-Za-z0-9+/=]{20,}/g, mixed: true },
  { rule: "Dify app key", pattern: /\bapp-[A-Za-z0-9]{20,}\b/g, mixed: true },
  { rule: "Resend key", pattern: /\bre_[A-Za-z0-9]{6,}_[A-Za-z0-9]{16,}\b/g, mixed: true },
  { rule: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{16,}/g },
  { rule: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g },
  { rule: "npm token", pattern: /\bnpm_[A-Za-z0-9]{30,}\b/g, mixed: true },
  { rule: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { rule: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { rule: "Slack token", pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}/g },
  { rule: "JSON Web Token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g },
];
const TOKEN_PLACEHOLDER = /x{4,}|example|placeholder|redacted|your[-_]/i;

const DUMP_SIGNATURE = /^-- (?:PostgreSQL|MySQL|MariaDB) (?:database )?dump\b|^-- Dumped from database version|^COPY [\w."]+ \([^)]*\) FROM stdin;/i;

const URL_CREDENTIALS = /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?|https?|s?ftp|ssh):\/\/[^\s:/@"'`]*:([^\s@/"'`]+)@/gi;

// NAME=value and "name": "value" pairs are checked only in configuration-like files. The name must end in a
// secret word (API_KEY, client_secret, apiKey), so PASSCODE_HASH, TOKEN_FILE or max_tokens are not secrets.
const CONFIG_FILE = /^(?:\.env.*|\.npmrc|\.pypirc|\.netrc|.*\.(?:env|ya?ml|toml|ini|conf|cfg|properties|json|sh|ps1|service|tfvars)|Dockerfile.*)$/i;
const ASSIGNMENT = /(?<![A-Za-z0-9_.-])["']?([A-Za-z_][A-Za-z0-9_.-]*)["']?\s*[:=]\s*["']?([^\s"'#,;]+)/g;
const SECRET_NAME = /(?:secret|token|password|passwd|passcode|api[_-]?key|(?:private|secret|access|encryption|signing|jwt|master|session|service[_-]?role)[_-]?key)$/i;
const NOT_A_VALUE = /^(?:[$<{[%(]|\/|\.\.?\/|[A-Za-z]:\\|https?:\/\/)|\$\{|\{\{|^(?:changeme|change-me|example.*|placeholder|dummy|redacted|postgres|password|secret|null|none|true|false|undefined|todo|x{3,}|\*+|\.{3,}|your[-_].*)$/i;
const TEMPLATED = /[${}%<>[\]*]/;
const PLACEHOLDER_PASSWORD = /^(?:postgres|password|passwd|pass|secret|example|changeme|change-me|user|username|test|dummy|x+|\.{3,}|your[-_a-z]*)$/i;

function stop(message) {
  console.error(`secret-scan: ${message}`);
  process.exit(2);
}

const args = process.argv.slice(2).map((arg) => arg.trim());
const staged = args.includes("--staged");
const rootFlag = args.indexOf("--root");
if (rootFlag >= 0 && !args[rootFlag + 1]) stop("--root needs a folder.");
const root = rootFlag >= 0 ? args[rootFlag + 1] : join(dirname(fileURLToPath(import.meta.url)), "..");

function git(gitArgs) {
  const result = spawnSync("git", gitArgs, { cwd: root, encoding: "buffer", maxBuffer: 256 * 1024 * 1024 });
  return result.status === 0 ? result.stdout : null;
}

function candidates() {
  const listed = staged
    ? git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z", "--relative"])
    : git(["ls-files", "-z"]);
  return listed === null ? null : listed.toString("utf8").split("\0").filter(Boolean);
}

// Staged mode reads the index, so the hook judges exactly what the commit will hold.
function contentOf(path) {
  if (staged) return git(["show", `:./${path}`]);
  const file = join(root, path);
  return lstatSync(file, { throwIfNoEntry: false })?.isFile() ? readFileSync(file) : null;
}

// Only an allow file that Git knows about counts: an untracked one cannot switch the scan off unseen.
function allowList() {
  const content = staged
    ? git(["show", `:./${ALLOW_FILE}`])
    : git(["ls-files", "--error-unmatch", "--", ALLOW_FILE]) && contentOf(ALLOW_FILE);
  if (!content) return [];
  return content.toString("utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

function textOf(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.subarray(2).toString("utf16le");
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return Buffer.from(buffer.subarray(2)).swap16().toString("utf16le");
  return buffer.subarray(0, 8000).includes(0) ? null : buffer.toString("utf8");
}

function scanText(path, text, count) {
  const findings = [];
  const configFile = CONFIG_FILE.test(basename(path));
  text.split(/\r?\n/).forEach((line, index) => {
    const here = `${path}:${index + 1}`;
    const found = [];
    for (const { rule, pattern, mixed } of TOKEN_RULES) {
      for (const [token] of line.matchAll(pattern)) {
        const real = !TOKEN_PLACEHOLDER.test(token) && new Set(token).size > 6 && (!mixed || (/[A-Za-z]/.test(token) && /[0-9]/.test(token)));
        if (real) found.push(rule);
      }
    }
    if (DUMP_SIGNATURE.test(line)) found.push("database dump");
    for (const [, password] of line.matchAll(URL_CREDENTIALS)) {
      if (!TEMPLATED.test(password) && !PLACEHOLDER_PASSWORD.test(password)) found.push("URL with a password");
    }
    if (configFile) {
      for (const [, name, value] of line.matchAll(ASSIGNMENT)) {
        const longEnough = value.length >= (/passcode$/i.test(name) ? 6 : 8);
        if (SECRET_NAME.test(name) && longEnough && !NOT_A_VALUE.test(value)) found.push(`value assigned to ${name}`);
      }
    }
    if (found.length === 0) return;
    if (ALLOW_MARKER.test(line)) count.lines += 1;
    else findings.push(...new Set(found.map((rule) => `${here}  ${rule}`)));
  });
  return findings;
}

function main() {
  const files = candidates();
  if (files === null) stop("could not list files; run it inside a Git working tree.");
  const allowed = allowList();
  const isAllowed = (path) => allowed.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry));
  const count = { lines: 0, paths: 0 };
  const findings = [];
  const skipped = [];
  for (const path of files) {
    const name = basename(path);
    if (ENV_FILE.test(name)) {
      findings.push(`${path}  forbidden file: local env file`);
      continue;
    }
    if (isAllowed(path)) {
      count.paths += 1;
      continue;
    }
    const forbidden = FORBIDDEN_FILES.find(([, pattern]) => pattern.test(name));
    if (forbidden) {
      findings.push(`${path}  forbidden file: ${forbidden[0]}`);
      continue;
    }
    const content = contentOf(path);
    const text = content === null || content.length > MAX_TEXT_BYTES ? null : textOf(content);
    if (text === null) skipped.push(path);
    else findings.push(...scanText(path, text, count));
  }

  const notes = [];
  if (skipped.length > 0) notes.push(`${skipped.length} not read (binary, link or over 20 MB): ${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? ", ..." : ""}`);
  if (count.lines + count.paths > 0) notes.push(`${count.paths} path(s) and ${count.lines} line(s) allowed on purpose`);
  const note = notes.length > 0 ? ` ${notes.join("; ")}.` : "";

  if (findings.length > 0) {
    console.error(`secret-scan: ${findings.length} finding(s). Nothing was printed in full.${note}`);
    for (const finding of findings) console.error(`  ${finding}`);
    console.error(`Remove the secret or the file. A deliberate, harmless example line may end with a comment holding "secret-scan:allow"; a reviewed file goes into ${ALLOW_FILE} by its exact path.`);
    process.exit(1);
  }
  console.log(`secret-scan: ${files.length} file(s) checked${staged ? " (staged)" : ""}, no findings.${note}`);
}

try {
  main();
} catch (error) {
  stop(`stopped by an unexpected error (${error instanceof Error ? error.message : "unknown"}).`);
}
