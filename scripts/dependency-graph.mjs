import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const skillName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const svgPaths = { light: 'assets/skill-dependencies-light.svg', dark: 'assets/skill-dependencies-dark.svg' };
const colors = { light: '1F2328', dark: 'E6EDF3' };

export function requires(text, path) {
  const lines = (text.replace(/^﻿/, '').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1] ?? '').split('\n');
  const start = lines.findIndex(line => /^metadata:\s*$/.test(line));
  if (start < 0) return [];
  for (const line of lines.slice(start + 1)) {
    if (!/^\s/.test(line)) break;
    const match = line.match(/^\s+requires:\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[1].replace(/^(["'])(.*)\1$/, '$2').trim();
    const names = value.split(/\s+/).filter(Boolean);
    const invalid = names.find(name => !skillName.test(name));
    if (invalid) throw new Error(`${path}: metadata.requires のスキル名が不正です: ${invalid}`);
    return names;
  }
  return [];
}

export function graphSource(skills) {
  const known = new Set(skills.map(skill => skill.name));
  const edges = skills.flatMap(skill => skill.requires.map(dependency => [skill.name, dependency]));
  if (!edges.length) return null;
  const nodes = [...new Set(edges.flat())].sort();
  const dependencies = new Map(nodes.map(node => [node, edges.filter(([from]) => from === node).map(([, to]) => to)]));
  const depth = new Map();
  const visit = (node, trail) => {
    if (trail.includes(node)) throw new Error('スキルの依存が循環しています: ' + [...trail, node].join(' -> '));
    if (!depth.has(node)) depth.set(node, Math.max(-1, ...dependencies.get(node).map(next => visit(next, [...trail, node]))) + 1);
    return depth.get(node);
  };
  nodes.forEach(node => visit(node, []));
  const levels = Math.max(...depth.values()) + 1;
  const layers = Array.from({ length: levels }, (_, level) => nodes.filter(node => depth.get(node) === level));
  const x = new Map();
  const place = () => layers.forEach(members => members.forEach((node, index) => x.set(node, (index - (members.length - 1) / 2) * 4.2)));
  const neighbors = (node, upward) => edges.filter(edge => edge[upward ? 0 : 1] === node).map(edge => edge[upward ? 1 : 0]);
  const order = (members, upward) => members.sort((left, right) => {
    const center = node => { const near = neighbors(node, upward); return near.length ? near.reduce((sum, next) => sum + x.get(next), 0) / near.length : x.get(node); };
    return center(left) - center(right) || left.localeCompare(right, 'en');
  });
  place();
  for (let sweep = 0; sweep < 4; sweep++) {
    for (let level = 1; level < levels; level++) { order(layers[level], true); place(); }
    for (let level = levels - 2; level >= 0; level--) { order(layers[level], false); place(); }
  }
  const lines = [];
  layers.forEach((members, level) => members.forEach(node => {
    lines.push(`\\node[${known.has(node) ? 'skill' : 'skill, dashed'}] (${node}) at (${x.get(node).toFixed(2)},${(level * 2.2).toFixed(2)}) {${node}};`);
  }));
  for (const [from, to] of edges) lines.push(`\\draw[dep] (${from}) -- (${to});`);
  return lines.join('\n');
}

const hash = text => createHash('sha256').update(text).digest('hex');

export function renderSection(source) {
  if (!source) return '';
  return [
    `<!-- graph: ${hash(source)} -->`,
    '<picture>',
    `  <source media="(prefers-color-scheme: dark)" srcset="${svgPaths.dark}" />`,
    `  <img alt="Skill dependency graph" src="${svgPaths.light}" />`,
    '</picture>',
  ].join('\n');
}

export const sectionHash = text => text.match(/<!-- graph: ([0-9a-f]{64}) -->/)?.[1] ?? null;

function document(source, color) {
  return String.raw`\documentclass[tikz,border=6pt]{standalone}
\usetikzlibrary{arrows.meta}
\definecolor{fg}{HTML}{${color}}
\begin{document}
\sffamily
\begin{tikzpicture}[
  skill/.style={draw=fg, text=fg, line width=0.7pt, inner sep=5pt, minimum height=0.8cm},
  dep/.style={draw=fg, line width=0.7pt, -{Stealth[length=2.4mm]}, shorten >=1pt}]
${source}
\end{tikzpicture}
\end{document}
`;
}

async function compile(tex) {
  const dir = await mkdtemp(join(tmpdir(), 'skill-graph-'));
  try {
    await writeFile(join(dir, 'graph.tex'), tex);
    try {
      await run('lualatex', ['-interaction=nonstopmode', '-halt-on-error', '-no-shell-escape', 'graph.tex'], { cwd: dir });
      await run('pdftocairo', ['-svg', 'graph.pdf', 'graph.svg'], { cwd: dir });
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error('依存関係図の生成には lualatex と pdftocairo が必要です。');
      throw new Error('依存関係図の TikZ を変換できませんでした。' + (error.stderr || ''));
    }
    const svg = (await readFile(join(dir, 'graph.svg'), 'utf8')).replace(/<\?xml[^>]*\?>\s*/, '').trim();
    return svg.replace(/<svg\b[^>]*>/, tag => tag.replace(/\s(width|height)="([\d.]+)(pt)?"/g, (_, name, value) => ` ${name}="${(Number(value) * 1.5).toFixed(2)}"`)) + '\n';
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function renderSvgs(source) {
  const [light, dark] = await Promise.all([compile(document(source, colors.light)), compile(document(source, colors.dark))]);
  return { light, dark };
}
