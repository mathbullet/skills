import { spawnSync } from 'node:child_process';
import { readdir, mkdtemp, mkdir, cp, stat, rm } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

function git(args, options = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'git ' + args[0] + ' が失敗しました。');
  return result.stdout;
}

async function testFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await testFiles(path));
    else if (entry.isFile() && /\.(test|spec)\.[cm]?js$/.test(entry.name)) files.push(path);
  }
  return files.sort();
}

async function main() {
  const root = git(['rev-parse', '--show-toplevel']).trim();
  process.chdir(root);
  const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']);
  if (staged) {
    const ignored = spawnSync('git', ['check-ignore', '--no-index', '-z', '--stdin'], { input: staged, encoding: 'utf8' });
    if (ignored.error || ![0, 1].includes(ignored.status)) throw ignored.error || new Error(ignored.stderr);
    if (ignored.stdout) throw new Error('除外対象のファイルがステージされています。コミットから外してください:\n' + ignored.stdout.split('\0').filter(Boolean).join('\n'));
  }
  const snapshot = await mkdtemp(join(tmpdir(), 'skills-pre-commit-'));
  try {
    git(['checkout-index', '--all', '--prefix=' + snapshot + sep]);
    const tests = [];
    const copiedDirectories = new Set();
    for (const file of await testFiles(root)) {
      const path = relative(root, file);
      const parts = path.split(sep);
      const testDirectory = parts.findIndex(part => ['tests', 'test', '__tests__'].includes(part));
      const scope = testDirectory < 0 ? dirname(path) : parts.slice(0, testDirectory).join(sep);
      if (!await stat(join(snapshot, scope)).catch(() => null)) continue;
      if (testDirectory < 0) {
        await mkdir(dirname(join(snapshot, path)), { recursive: true });
        await cp(file, join(snapshot, path));
      } else {
        const directory = parts.slice(0, testDirectory + 1).join(sep);
        if (!copiedDirectories.has(directory)) {
          await cp(join(root, directory), join(snapshot, directory), { recursive: true });
          copiedDirectories.add(directory);
        }
      }
      tests.push(path);
    }
    if (!tests.length) throw new Error('ステージ済みコードに対するローカルテストがありません。テストを用意してください。');
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_') && !key.startsWith('NODE_TEST_')));
    for (const [variable, config] of [
      ['GRILLING_VIZ_PLAYWRIGHT', 'grilling-viz.playwright-module'],
      ['GRILLING_VIZ_CHROMIUM', 'grilling-viz.chromium-path'],
    ]) {
      if (!env[variable]) env[variable] = spawnSync('git', ['config', '--get', config], { encoding: 'utf8' }).stdout.trim();
    }
    if (!env.GRILLING_VIZ_PLAYWRIGHT) {
      try { env.GRILLING_VIZ_PLAYWRIGHT = createRequire(join(root, 'package.json')).resolve('playwright'); } catch {}
    }
    console.log('ステージ済みコードで ' + tests.length + ' 個のテストファイルを実行します。');
    const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: snapshot, env, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('テストが失敗したため、コミットを中止しました。');
  } finally {
    await rm(snapshot, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
