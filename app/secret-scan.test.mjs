import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// The scanner runs for real against a throwaway Git repository. Every "secret" below is assembled from pieces at
// run time, so this file holds no token-shaped text itself.
const here = dirname(fileURLToPath(import.meta.url));
const script = [join(here, "..", "scripts", "secret-scan.mjs"), join(here, "secret-scan.mjs")].find(existsSync) ?? join(here, "..", "scripts", "secret-scan.mjs");
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
const git = (cwd, ...args) => spawnSync("git", args, { cwd, env: gitEnv, encoding: "utf8" });
const skip = git(tmpdir(), "--version").status !== 0 && "git is not installed";

const mix = (prefix, length) => prefix + "a1B2c3D4e5F6g7H8".repeat(8).slice(0, length);
const privateKey = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
const githubToken = mix("ghp_", 36);
const url = (scheme, user, password) => [scheme, "://", user, ":", password, "@", "db.internal:5432/app"].join("");
const longValue = mix("", 24);

function scan(files, { stage = Object.keys(files), mode = ["--staged"] } = {}) {
  const repo = mkdtempSync(join(tmpdir(), "secret-scan-"));
  try {
    git(repo, "init", "--quiet");
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(repo, path)), { recursive: true });
      writeFileSync(join(repo, path), text);
    }
    if (stage.length > 0) git(repo, "add", "--force", "--", ...stage);
    const run = spawnSync(process.execPath, [script, "--root", repo, ...mode], { env: gitEnv, encoding: "utf8" });
    return { status: run.status, output: run.stdout + run.stderr };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}
const status = (files, options) => scan(files, options).status;

test("a clean staged change passes", { skip }, () => {
  const result = scan({ "src/app.mjs": "export const greeting = 'halo';\n", ".env.example": "API_KEY=\nDATABASE_URL=\n", "db/migrations/0006_backup_codes.sql": "create table backup_codes (id int);\n" });
  assert.equal(result.status, 0, result.output);
});

test("a staged token or private key is refused and never echoed", { skip }, () => {
  const result = scan({ "notes.md": `first line\n${privateKey}\n`, "src/client.mjs": `const token = "${githubToken}";\n` });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /notes\.md:2 {2}private key block/);
  assert.match(result.output, /src\/client\.mjs:1 {2}GitHub token/);
  assert.ok(!result.output.includes(githubToken), "the token itself must not be printed");
});

test("the provider keys these projects use are refused in any text file", { skip }, () => {
  const keys = {
    "Dify app key": mix("app-", 24),
    "OpenAI or OpenRouter key": mix("sk-or-v1-", 48),
    "Resend key": `${mix("re_", 8)}_${mix("", 24)}`,
    "Stripe or Clerk secret key": mix("sk_test_", 40),
    "webhook signing secret": mix("whsec_", 32),
  };
  for (const [rule, key] of Object.entries(keys)) {
    const result = scan({ "lib/client.ts": `const key = "${key}";\n` });
    assert.equal(result.status, 1, `${rule}: ${result.output}`);
    assert.ok(result.output.includes(rule) && !result.output.includes(key), rule);
  }
  assert.equal(status({ "lib/client.ts": `const key = "sk-ant-${"x".repeat(24)}"; const cls = "app-shell";\n` }), 0, "placeholders and ordinary identifiers pass");
});

test("env files, key files, databases and data exports are refused by name", { skip }, () => {
  const paths = [".env.local", ".envrc", "deploy/server.pem", "data/local.sqlite", "data/local.db-wal", "exports/rekap.xlsx", "exports/pasien.csv"];
  const result = scan(Object.fromEntries(paths.map((path) => [path, "x\n"])));
  assert.equal(result.status, 1, result.output);
  for (const path of paths) assert.ok(result.output.includes(`${path}  forbidden file`), path);
  assert.equal(status({ "keys/id_rsa.pub": "ssh-rsa AAAA\n" }), 0, "a public key is not a secret");
});

test("a database dump is refused whatever it is called; a migration passes", { skip }, () => {
  const dump = "--\n-- PostgreSQL database dump\n--\nCOPY public.patients (id, name) FROM stdin;\n";
  const result = scan({ "exports/melinda_2026-11-21.sql": dump });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /melinda_2026-11-21\.sql:2 {2}database dump/);
  assert.equal(status({ "db/migrations/0001_init.sql": "create table profile (user_id text primary key);\n" }), 0);
});

test("a URL that carries a password fails; templates and placeholders pass", { skip }, () => {
  for (const line of [url("postgres", "app", "Zk7pQ2mW9x"), url("rediss", "", "Zk7pQ2mW9x"), url("https", "deploy", "Zk7pQ2mW9x")]) {
    assert.equal(status({ "docs/setup.md": `${line}\n` }), 1, line.split(":")[0]);
  }
  const harmless = [url("postgres", "postgres", "postgres"), url("postgres", "app", "<password>"), url("postgres", "${process.env.DB_USER}", "${process.env.DB_PASS}"), url("mysql", "%s", "%s")];
  assert.equal(status({ "docs/setup.md": `${harmless.join("\n")}\n` }), 0);
});

test("a filled secret in a config file fails, also short, letters-only or lower-case ones", { skip }, () => {
  const filled = [
    ["deploy/app.env", `SERVICE_API_KEY=${longValue}\n`],
    ["deploy/app.env", `MEDIFY_PASSWORD=${["Rahasia", "2026"].join("-")}\n`],
    ["deploy/app.env", `CRON_SECRET=${"abcdefghijklmnopqrstuvwx"}\n`],
    ["deploy/app.env", `REVIEW_PASSCODE=${["482", "913"].join("")}\n`],
    ["deploy/config.yml", `api_key: "${longValue}"\n`],
    ["deploy/config.json", `{ "apiKey": "${longValue}" }\n`],
    [".npmrc", `//registry.npmjs.org/:_authToken=${longValue}\n`],
  ];
  for (const [path, text] of filled) assert.equal(status({ [path]: text }), 1, text.split(/[=:]/)[0]);
  const harmless = [
    "SERVICE_API_KEY=", `SERVICE_TOKEN_HASH=${longValue}`, "SERVICE_TOKEN_FILE=/run/secrets/token", "POSTGRES_PASSWORD=postgres",
    "API_KEY=${{ secrets.API_KEY }}", "MAX_TOKENS=100000000", "TOKEN_TTL=360000000", `SERVICE_API_KEY=${longValue} # secret-scan:allow example`,
  ];
  const result = scan({ "deploy/app.env": `${harmless.join("\n")}\n` });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /1 line\(s\) allowed on purpose/);
});

test("the allow marker counts only as a trailing comment", { skip }, () => {
  assert.equal(status({ "deploy/app.env": `SERVICE_API_KEY=${longValue}secret-scan:allow\n` }), 1);
});

test("the allow file must be tracked and exact, and can never allow an env file", { skip }, () => {
  const files = { "data/sources.csv": "id,title\n1,UU\n", ".secret-scan-allow": "# reviewed: public list\ndata/sources.csv\n" };
  assert.equal(status(files, { stage: ["data/sources.csv"] }), 1, "an untracked allow file does not count");
  const allowed = scan(files);
  assert.equal(allowed.status, 0, allowed.output);
  assert.match(allowed.output, /1 path\(s\) and 0 line\(s\) allowed on purpose/);
  assert.equal(status({ "data-private/x.csv": "a\n", ".secret-scan-allow": "data\n" }), 1, "a name is not a prefix");
  assert.equal(status({ "data/x.csv": "a\n", ".secret-scan-allow": "data/\n" }), 0, "a folder ends with a slash");
  assert.equal(status({ ".env.production": "PORT=1\n", ".secret-scan-allow": ".env.production\n" }), 1);
});

test("UTF-16 text is read, and files it cannot read are named", { skip }, () => {
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`${privateKey}\n`, "utf16le")]);
  assert.equal(status({ "notes.txt": utf16 }), 1);
  const result = scan({ "logo.bin": Buffer.from([1, 0, 2, 0, 3]) });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /1 not read \(binary, link or over 20 MB\): logo\.bin/);
});

test("--staged looks only at what is staged; the default mode looks at every tracked file", { skip }, () => {
  const files = { "a.md": "fine\n", "b.md": `${privateKey}\n` };
  assert.equal(status(files, { stage: ["a.md"] }), 0);
  assert.equal(status(files, { stage: ["a.md"], mode: ["--staged\r"] }), 0, "a hook file saved with Windows line endings still means --staged");
  assert.equal(status(files, { mode: [] }), 1);
});

test("it stops with exit code 2 when it cannot run", () => {
  const folder = mkdtempSync(join(tmpdir(), "secret-scan-nogit-"));
  try {
    const env = { ...gitEnv, GIT_CEILING_DIRECTORIES: dirname(folder) };
    assert.equal(spawnSync(process.execPath, [script, "--root", folder], { env, encoding: "utf8" }).status, 2);
    assert.equal(spawnSync(process.execPath, [script, "--root"], { env, encoding: "utf8" }).status, 2);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
