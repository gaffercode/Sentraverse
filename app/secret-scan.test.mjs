import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// The scanner runs for real against a throwaway Git repository. Every "secret" below is assembled from pieces at
// run time, so this file holds no token-shaped text itself.
const script = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "secret-scan.mjs");
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
const git = (cwd, ...args) => spawnSync("git", args, { cwd, env: gitEnv, encoding: "utf8" });
const gitInstalled = git(tmpdir(), "--version").status === 0;

const privateKey = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
const githubToken = "ghp_" + "a1B2".repeat(9);
const databaseUrl = (password) => ["postgres", "://", "app", ":", password, "@", "db.internal:5432/app"].join("");

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

test("a clean staged change passes", { skip: !gitInstalled && "git is not installed" }, () => {
  const result = scan({ "src/app.mjs": "export const greeting = 'halo';\n", ".env.example": "API_KEY=\nDATABASE_URL=\n" });
  assert.equal(result.status, 0, result.output);
});

test("a staged token or private key is refused and never echoed", { skip: !gitInstalled && "git is not installed" }, () => {
  const result = scan({ "notes.md": `first line\n${privateKey}\n`, "src/client.mjs": `const token = "${githubToken}";\n` });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /notes\.md:2 {2}private key block/);
  assert.match(result.output, /src\/client\.mjs:1 {2}GitHub token/);
  assert.ok(!result.output.includes(githubToken), "the token itself must not be printed");
});

test("local env files, key files and database files are refused by name", { skip: !gitInstalled && "git is not installed" }, () => {
  const result = scan({ ".env.local": "PORT=3000\n", "deploy/server.pem": "x\n", "data/local.sqlite": "x\n" });
  assert.equal(result.status, 1, result.output);
  for (const path of [".env.local", "deploy/server.pem", "data/local.sqlite"]) assert.ok(result.output.includes(`${path}  forbidden file`), path);
});

test("a database URL fails with a real-looking password and passes with a placeholder", { skip: !gitInstalled && "git is not installed" }, () => {
  assert.equal(scan({ "docs/setup.md": `${databaseUrl("Zk7pQ2mW9x")}\n` }).status, 1);
  assert.equal(scan({ "docs/setup.md": `${databaseUrl("postgres")}\n${databaseUrl("<password>")}\n` }).status, 0);
});

test("a filled secret in a config file fails; an empty one, a hash and a marked example pass", { skip: !gitInstalled && "git is not installed" }, () => {
  const value = "q7Rk2ZtM9vB4xL1nP8sD5wH3";
  assert.equal(scan({ "deploy/app.env": `SERVICE_API_KEY=${value}\n` }).status, 1);
  const harmless = `SERVICE_API_KEY=\nSERVICE_TOKEN_HASH=${value}\nSERVICE_API_KEY=${value} # secret-scan:allow\n`;
  assert.equal(scan({ "deploy/app.env": harmless }).status, 0);
});

test("--staged looks only at what is staged; the default mode looks at every tracked file", { skip: !gitInstalled && "git is not installed" }, () => {
  const files = { "a.md": "fine\n", "b.md": `${privateKey}\n` };
  assert.equal(scan(files, { stage: ["a.md"] }).status, 0);
  assert.equal(scan(files, { mode: [] }).status, 1);
});

test("outside a Git working tree it stops with exit code 2", () => {
  const folder = mkdtempSync(join(tmpdir(), "secret-scan-nogit-"));
  try {
    const run = spawnSync(process.execPath, [script, "--root", folder], { env: { ...gitEnv, GIT_CEILING_DIRECTORIES: dirname(folder) }, encoding: "utf8" });
    assert.equal(run.status, 2, run.stdout + run.stderr);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
