import { readFile, open, lstat, link, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { renderFigures } from './figures.mjs';

const { validateDocument } = createRequire(import.meta.url)('./answer.js');
const root = new URL('../', import.meta.url);
const hash = text => createHash('sha256').update(text).digest('hex');
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const htmlText = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const resource = path => readFile(new URL(path, root), 'utf8');
const documentCssPaths = () => [
  process.env.D_CARDS_DOCUMENT_CSS,
  fileURLToPath(new URL('../html/design-system/document.css', root)),
  fileURLToPath(new URL('../html/skills/html/design-system/document.css', root)),
  fileURLToPath(new URL('../../../html/skills/html/design-system/document.css', root)),
].filter(Boolean);

async function readDocumentCss() {
  for (const path of documentCssPaths()) {
    try { return await readFile(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw new Error('html スキルの document.css が見つかりません。D_CARDS_DOCUMENT_CSS にパスを指定してください。');
}

function documentData(html) {
  const match = html.match(/<script type="application\/json" id="dc-data">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('更新対象のHTMLにカードのデータがありません。');
  return validateDocument(JSON.parse(match[1]));
}

const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Sans:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&family=Ubuntu+Mono:wght@400;700&display=swap" rel="stylesheet">`;

async function bundle() {
  const [documentCss, cardsCss, answers, components] = await Promise.all([
    readDocumentCss(), resource('design-system/cards.css'),
    resource('scripts/answer.js'), resource('scripts/components.js'),
  ]);
  new Script(answers, { filename: 'answer.js' });
  new Script(components, { filename: 'components.js' });
  if (/<\/style/i.test(documentCss + cardsCss)) throw new Error('CSSに埋め込めない終了タグがあります。');
  const script = code => '<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>';
  return {
    styles: fonts + '\n<style id="dc-document">\n' + documentCss + '\n</style>\n<style id="dc-cards">\n' + cardsCss + '\n</style>',
    scripts: script(answers) + '\n' + script(components),
  };
}

const json = (id, value) => `<script type="application/json" id="${id}">${safeJSON(value)}</script>`;

async function render(data) {
  const assets = await bundle();
  validateDocument(data);
  const figures = await renderFigures(data);
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlText(data.themes.map(theme => theme.name).join(' / '))}</title>
${assets.styles}
</head>
<body>
<main class="mb-page dc-page" id="dc-app"></main>
<noscript>回答の入力とコピーにはJavaScriptが必要です。</noscript>
${json('dc-data', data)}
${json('dc-figures', figures)}
${assets.scripts}
<script>
try {
  const data = JSON.parse(document.getElementById('dc-data').textContent);
  const figures = JSON.parse(document.getElementById('dc-figures').textContent);
  document.getElementById('dc-app').append(DCardsComponents.workspace(data, figures));
} catch {
  document.getElementById('dc-app').textContent = 'カードのデータを読み込めませんでした。HTMLの生成元で確認してください。';
}
</script>
</body>
</html>
`;
}

async function snapshot(path) {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('保存先は通常のHTMLファイルを指定してください。');
    const text = await readFile(path, 'utf8');
    return { text, sha256: hash(text), mode: stat.mode };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function save(path, html, previous) {
  const temporary = path + '.' + randomUUID() + '.tmp';
  try {
    const file = await open(temporary, 'wx', previous?.mode ?? 0o600);
    try { await file.writeFile(html, 'utf8'); await file.sync(); }
    finally { await file.close(); }
    const current = await snapshot(path);
    if ((current?.sha256 ?? null) !== (previous?.sha256 ?? null)) throw new Error('保存先が変更されました。読み直してから更新してください。');
    if (previous) await rename(temporary, path);
    else await link(temporary, path);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

async function main(args) {
  if (!args.length || args[0] === '--help') {
    console.log(`使い方:
  node scripts/render.mjs cards.json output.html
  node scripts/render.mjs --inspect output.html
  node scripts/render.mjs cards.json output.html --if-match SHA256

新規生成では documentId を生成します。更新前に --inspect でデータとSHA256を取得してください。`);
    return;
  }
  if (args[0] === '--inspect' && args.length === 2) {
    const current = await snapshot(resolve(args[1]));
    if (!current) throw new Error('HTMLが見つかりません。');
    const data = current.text.includes('id="dc-data"') ? documentData(current.text) : null;
    console.log(JSON.stringify({ sha256: current.sha256, data }, null, 2));
    return;
  }
  if (![2, 4].includes(args.length) || (args.length === 4 && (args[2] !== '--if-match' || !/^[a-f0-9]{64}$/.test(args[3])))) {
    throw new Error('--help で引数を確認してください。');
  }
  const output = resolve(args[1]);
  if (!output.toLowerCase().endsWith('.html')) throw new Error('保存先の拡張子は .html にしてください。');
  const lockPath = output + '.lock';
  const lock = await open(lockPath, 'wx').catch(error => {
    if (error.code === 'EEXIST') throw new Error('生成処理のロックがあります。実行中の処理と保存先を確認してください。');
    throw error;
  });
  try {
    const previous = await snapshot(output);
    if (previous ? previous.sha256 !== args[3] : args[3] !== undefined) {
      throw new Error('既存HTMLの上書きには、一致する --if-match が必要です。--inspect で読み直してください。');
    }
    const data = JSON.parse(await readFile(resolve(args[0]), 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('カードのデータはオブジェクトにしてください。');
    const id = previous ? documentData(previous.text).documentId : randomUUID();
    if (previous && data.documentId !== undefined && data.documentId !== id) throw new Error('更新時に documentId を変更できません。');
    data.documentId = id;
    const html = await render(data);
    for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(code);
    documentData(html);
    await save(output, html, previous);
    console.log(JSON.stringify({ file: output, sha256: hash(html), documentId: data.documentId }));
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
