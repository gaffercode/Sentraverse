import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Repository contract: every environment variable the site reads is listed in `.env.example`
// with a placeholder, and local secrets or data files can never be committed by accident.

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const RUNTIME_DIRS = ['app', 'components', 'src'];
const SOURCE_FILE = /\.(?:ts|tsx|mjs|js|jsx)$/;
const TEST_FILE = /\.(?:test|spec)\./;
// Set by Node, Next.js or the host, never by a developer's env file.
const PLATFORM_VARIABLES = new Set(['NODE_ENV', 'CI', 'PORT', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'NEXT_RUNTIME']);

function sourceFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(path));
    else if (SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name)) found.push(path);
  }
  return found;
}

function variablesReadByTheSite() {
  const names = new Set();
  for (const dir of RUNTIME_DIRS) {
    for (const file of sourceFiles(join(root, dir))) {
      for (const [, name] of readFileSync(file, 'utf8').matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) names.add(name);
    }
  }
  return [...names].filter((name) => !PLATFORM_VARIABLES.has(name)).sort();
}

function envExample() {
  const entries = new Map();
  for (const line of readFileSync(join(root, '.env.example'), 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (match) entries.set(match[1], match[2].trim());
  }
  return entries;
}

// The capsule's own `.gitignore` is judged alone, in an empty temporary repository. Asked in place, Git would
// also apply the rules of any repository that encloses this folder and the developer's global excludes, and
// the capsule must not lean on either.
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
const gitInstalled = spawnSync('git', ['--version'], { env: gitEnv }).status === 0;

function ignoredByThisCapsule(paths) {
  const sandbox = mkdtempSync(join(tmpdir(), 'capsule-ignore-'));
  try {
    spawnSync('git', ['init', '--quiet'], { cwd: sandbox, env: gitEnv });
    copyFileSync(join(root, '.gitignore'), join(sandbox, '.gitignore'));
    const ask = (path) =>
      spawnSync('git', ['-c', 'core.excludesFile=', 'check-ignore', '--quiet', '--no-index', path], { cwd: sandbox, env: gitEnv }).status === 0;
    return paths.filter(ask);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

test('.env.example lists every environment variable the site reads', () => {
  const documented = envExample();
  const missing = variablesReadByTheSite().filter((name) => !documented.has(name));
  assert.deepEqual(missing, []);
});

test('.env.example holds no value for keys, tokens, secrets or passwords', () => {
  const filled = [...envExample()].filter(([name, value]) => /KEY|TOKEN|SECRET|PASSWORD/.test(name) && value !== '');
  assert.deepEqual(filled.map(([name]) => name), []);
});

test('.gitignore keeps local env files, databases, dumps and keys out of Git', { skip: !gitInstalled && 'git is not installed' }, () => {
  const mustBeIgnored = [
    '.env',
    '.env.local',
    '.env.production',
    'apps/web/.env',
    'data.sqlite',
    'local.sqlite3',
    'dev.db',
    'prod.dump',
    'db.bak',
    'backup.sql.gz',
    'backups/2026-11-21.sql',
    'server.pem',
    'private.key',
    'id_rsa',
    'service-account.json',
  ];
  const ignored = ignoredByThisCapsule(mustBeIgnored);
  assert.deepEqual(mustBeIgnored.filter((path) => !ignored.includes(path)), []);
});

test('.gitignore still lets .env.example be committed', { skip: !gitInstalled && 'git is not installed' }, () => {
  assert.deepEqual(ignoredByThisCapsule(['.env.example']), []);
});
