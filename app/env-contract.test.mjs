import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
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

function isIgnored(path) {
  return spawnSync('git', ['check-ignore', '--quiet', '--no-index', path], { cwd: root }).status === 0;
}

const insideGit = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root }).status === 0;

test('.env.example lists every environment variable the site reads', () => {
  const documented = envExample();
  const missing = variablesReadByTheSite().filter((name) => !documented.has(name));
  assert.deepEqual(missing, []);
});

test('.env.example holds no value for keys, tokens, secrets or passwords', () => {
  const filled = [...envExample()].filter(([name, value]) => /KEY|TOKEN|SECRET|PASSWORD/.test(name) && value !== '');
  assert.deepEqual(filled.map(([name]) => name), []);
});

test('.gitignore keeps local env files, databases, dumps and keys out of Git', { skip: !insideGit && 'not a Git checkout' }, () => {
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
  assert.deepEqual(mustBeIgnored.filter((path) => !isIgnored(path)), []);
});

test('.gitignore still lets .env.example be committed', { skip: !insideGit && 'not a Git checkout' }, () => {
  assert.equal(isIgnored('.env.example'), false);
});
