import { spawnSync } from 'node:child_process';
import { readFile, writeFile, lstat, mkdir, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { dependencies, graphSource, renderSection, sectionHash, renderSvgs, svgPaths } from './dependency-graph.mjs';

const readmes = ['README.md', 'README-en.md'];
const skillPath = /^plugins\/[^/]+\/skills\/[^/]+\/SKILL\.md$/;
const sections = {
  skills: ['<!-- skills:start -->', '<!-- skills:end -->'],
  dependencies: ['<!-- dependencies:start -->', '<!-- dependencies:end -->'],
};
const svgFiles = Object.values(svgPaths);

function git(args, options = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `git ${args[0]} failed`);
  return result.stdout;
}

function metadata(text, path) {
  const frontmatter = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (!frontmatter) throw new Error(`${path}: frontmatter がありません。`);
  const lines = frontmatter.split('\n');
  const fields = {};
  for (const key of ['name', 'description']) {
    const indices = lines.flatMap((line, index) => line.startsWith(`${key}:`) ? [index] : []);
    if (indices.length !== 1) throw new Error(`${path}: ${key} を一つ指定してください。`);
    const index = indices[0];
    let value = lines[index].slice(key.length + 1).trim();
    const continuation = [];
    for (let next = index + 1; next < lines.length && /^(\s|$)/.test(lines[next]); next++) {
      continuation.push(lines[next].trim());
    }
    if (/^[>|][-+]?\s*(?:#.*)?$/.test(value)) value = continuation.join(' ');
    else {
      value = [value, ...continuation].join(' ').trim();
      if (value.startsWith('"')) {
        const quoted = value.match(/^("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/)?.[1];
        if (!quoted) throw new Error(`${path}: ${key} の引用符を確認してください。`);
        value = JSON.parse(quoted);
      } else if (value.startsWith("'")) {
        const quoted = value.match(/^'((?:[^']|'')*)'\s*(?:#.*)?$/)?.[1];
        if (quoted === undefined) throw new Error(`${path}: ${key} の引用符を確認してください。`);
        value = quoted.replace(/''/g, "'");
      } else {
        value = value.replace(/\s+#.*$/, '');
        if (/^[\[\]{},&*!|>@`]/.test(value)) throw new Error(`${path}: ${key} は文字列で指定してください。`);
      }
    }
    fields[key] = value.replace(/\s+/g, ' ').trim();
    if (!fields[key]) throw new Error(`${path}: ${key} が空です。`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name)) throw new Error(`${path}: name が不正です。`);
  return { ...fields, ...dependencies(text, path), path };
}

function renderList(skills) {
  const names = new Set();
  return skills.sort((left, right) => left.name.localeCompare(right.name, 'en')).map(skill => {
    if (names.has(skill.name)) throw new Error(`name が重複しています: ${skill.name}`);
    names.add(skill.name);
    const description = skill.description.match(/^.*?(?:[。！？]|[.!?](?=\s|$)|$)/u)[0];
    const escaped = description.replace(/[\\`*_[\]<>]/g, '\\$&');
    return `- [${skill.name}](${encodeURI(skill.path).replace(/[()]/g, char => '%' + char.charCodeAt(0).toString(16))})：${escaped}`;
  }).join('\n');
}

function replaceSection(text, [start, end], content, path) {
  if (!text.includes(start) && !text.includes(end)) return text;
  if (text.split(start).length !== 2 || text.split(end).length !== 2 || text.indexOf(start) > text.indexOf(end)) {
    throw new Error(`${path}: ${start} の自動更新範囲が不正です。`);
  }
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  return text.slice(0, text.indexOf(start) + start.length) + newline +
    (content ? content.replace(/\n/g, newline) + newline : '') + text.slice(text.indexOf(end));
}

function generated(skills) {
  const source = graphSource(skills);
  return { list: renderList(skills), source, section: renderSection(source) };
}

function replaceAll(text, { list, section }, path) {
  return replaceSection(replaceSection(text, sections.skills, list, path), sections.dependencies, section, path);
}

const graphChanged = (before, after) => before.includes(sections.dependencies[0]) && sectionHash(before) !== sectionHash(after);

async function workingFile(path) {
  const info = await lstat(path).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!info) return null;
  if (!info.isFile()) throw new Error(`${path}: 通常ファイルが必要です。`);
  return readFile(path, 'utf8');
}

async function workingChanges() {
  const paths = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'plugins']).split('\0').filter(path => skillPath.test(path)))];
  const skills = [];
  for (const path of paths) {
    const content = await workingFile(path);
    if (content !== null) skills.push(metadata(content, path));
  }
  const output = generated(skills);
  const changes = [];
  let render = false;
  for (const path of readmes) {
    const before = await workingFile(path);
    if (before === null) continue;
    const after = replaceAll(before, output, path);
    if (graphChanged(before, after)) render = true;
    if (before !== after) changes.push({ path, before, after });
  }
  for (const path of svgFiles) if (output.source && await workingFile(path) === null) render = true;
  return { changes, source: output.source, render };
}

function stagedChanges() {
  const entries = git(['ls-files', '--stage', '-z']).split('\0').filter(Boolean).map(line => {
    const [mode, oid, stage, path] = line.match(/^(\d+) (\w+) (\d)\t([\s\S]*)$/).slice(1);
    return { mode, oid, stage, path };
  }).filter(entry => skillPath.test(entry.path) || readmes.includes(entry.path) || svgFiles.includes(entry.path));
  if (entries.some(entry => entry.stage !== '0')) throw new Error('Skills または README に競合があるため、自動更新を中止しました。');
  if (entries.some(entry => !['100644', '100755'].includes(entry.mode))) throw new Error('Skills と README は通常ファイルである必要があります。');
  const content = entry => git(['cat-file', 'blob', entry.oid]);
  const output = generated(entries.filter(entry => skillPath.test(entry.path)).map(entry => metadata(content(entry), entry.path)));
  let render = output.source !== null && svgFiles.some(path => !entries.some(entry => entry.path === path));
  const changes = entries.filter(entry => readmes.includes(entry.path)).flatMap(entry => {
    const before = content(entry);
    const after = replaceAll(before, output, entry.path);
    if (graphChanged(before, after)) render = true;
    return before === after ? [] : [{ ...entry, after }];
  });
  const stale = output.source === null ? entries.filter(entry => svgFiles.includes(entry.path)).map(entry => entry.path) : [];
  return { changes, source: output.source, render, stale };
}

async function main() {
  if (process.argv.slice(2).some(argument => argument !== '--staged')) throw new Error('Usage: node scripts/update-readme.mjs [--staged]');
  const staged = process.argv.includes('--staged');
  const env = { ...process.env };
  delete env.GIT_INDEX_FILE;
  if (staged && process.env.GIT_INDEX_FILE && resolve(process.env.GIT_INDEX_FILE) !== resolve(git(['rev-parse', '--git-path', 'index'], { env }).trim())) return;
  process.env.SKILLS_README_SYNC_ACTIVE = '1';
  process.chdir(git(['rev-parse', '--show-toplevel']).trim());
  if (staged) {
    const changed = git(['diff', '--cached', '--name-only', '-z']).split('\0');
    if (!changed.some(path => skillPath.test(path) || readmes.includes(path) || svgFiles.includes(path))) return;
  }
  const index = staged ? stagedChanges() : { changes: [], source: null, render: false, stale: [] };
  const working = await workingChanges();
  for (const change of working.changes) {
    if (await workingFile(change.path) !== change.before) throw new Error(`${change.path}: 更新中に編集されたため、中止しました。`);
  }
  const svgs = {};
  for (const { source, render } of [index, working]) {
    if (render && source && !svgs[source]) svgs[source] = await renderSvgs(source);
  }
  const indexEntries = index.changes.map(change => ({ mode: change.mode, path: change.path, after: change.after }));
  if (index.render && index.source) {
    for (const [theme, path] of Object.entries(svgPaths)) indexEntries.push({ mode: '100644', path, after: svgs[index.source][theme] });
  }
  if (indexEntries.length) {
    const entries = indexEntries.map(change => {
      const oid = git(['hash-object', '-w', '--stdin'], { input: change.after }).trim();
      return `${change.mode} ${oid}\t${change.path}\0`;
    }).join('');
    git(['update-index', '-z', '--index-info'], { input: entries });
  }
  if (index.stale.length) git(['update-index', '--force-remove', '--', ...index.stale]);
  for (const change of working.changes) await writeFile(change.path, change.after);
  if (working.render && working.source) {
    for (const [theme, path] of Object.entries(svgPaths)) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, svgs[working.source][theme]);
    }
  }
  if (!working.source) for (const path of svgFiles) await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (working.changes.length || indexEntries.length || index.stale.length) console.log('Skills の一覧と依存関係図を README に反映しました。');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
