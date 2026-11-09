import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const preamble = String.raw`\documentclass[tikz,border=4pt]{standalone}
\usepackage[haranoaji]{luatexja-preset}
\renewcommand{\kanjifamilydefault}{\gtdefault}
\renewcommand{\familydefault}{\sfdefault}
\usetikzlibrary{positioning,arrows.meta,calc,fit,shapes.geometric,decorations.pathreplacing}
\tikzset{every picture/.style={line width=0.8pt,>=Stealth}}
\begin{document}
`;

function assertSafeSvg(svg, at) {
  if (!/^\s*<svg[\s>][\s\S]*<\/svg>\s*$/.test(svg)) throw new Error(at + ' の SVG は <svg> 要素一つにしてください。');
  if (/<(script|foreignObject|iframe|object|embed)\b|\son\w+\s*=|javascript:|(?:xlink:)?href\s*=\s*["'](?!#)/i.test(svg)) {
    throw new Error(at + ' の SVG に、スクリプト、外部参照、イベント属性は使えません。');
  }
}

function prefixIds(svg, prefix) {
  return svg
    .replace(/<\?xml[^>]*\?>\s*/, '')
    .replace(/\sid="([^"]+)"/g, (_, id) => ` id="${prefix}${id}"`)
    .replace(/((?:xlink:)?href=")#([^"]+)"/g, (_, attr, id) => `${attr}#${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`)
    .trim();
}

function scaleRoot(svg, factor) {
  return svg.replace(/<svg\b[^>]*>/, tag => tag.replace(/\s(width|height)="([\d.]+)(pt)?"/g, (_, name, value) => ` ${name}="${(Number(value) * factor).toFixed(2)}"`));
}

async function compileTikz(source, at) {
  const dir = await mkdtemp(join(tmpdir(), 'dc-tikz-'));
  const body = /\\begin\{tikzpicture\}/.test(source) ? source : '\\begin{tikzpicture}\n' + source + '\n\\end{tikzpicture}';
  try {
    await writeFile(join(dir, 'figure.tex'), preamble + body + '\n\\end{document}\n');
    try {
      await run('lualatex', ['-interaction=nonstopmode', '-halt-on-error', '-no-shell-escape', 'figure.tex'], { cwd: dir });
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(at + ' の TikZ を変換する lualatex がありません。figure.svg に手書きの SVG を指定してください。');
      const log = await readFile(join(dir, 'figure.log'), 'utf8').catch(() => '');
      const reason = log.split('\n').filter(line => line.startsWith('!')).slice(0, 3).join(' ');
      throw new Error(at + ' の TikZ を変換できません。' + reason);
    }
    try {
      await run('pdftocairo', ['-svg', 'figure.pdf', 'figure.svg'], { cwd: dir });
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(at + ' の TikZ を変換する pdftocairo がありません。figure.svg に手書きの SVG を指定してください。');
      throw error;
    }
    return await readFile(join(dir, 'figure.svg'), 'utf8');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function renderFigures(data) {
  const figures = {};
  let index = 0;
  for (const theme of data.themes) for (const card of theme.cards) {
    if (!card.figure) continue;
    const at = `themes[${theme.id}].cards[${card.id}].figure`;
    const key = JSON.stringify([theme.id, card.id]);
    let svg;
    if (card.figure.svg !== undefined) {
      assertSafeSvg(card.figure.svg, at);
      svg = card.figure.svg;
    } else {
      svg = scaleRoot(await compileTikz(card.figure.tikz, at), 1.6);
    }
    figures[key] = prefixIds(svg, `dc-fig${++index}-`).replace(/<svg\b/, '<svg role="img"');
  }
  return figures;
}
