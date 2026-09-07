import { readFile, open, lstat, link, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Script } from 'node:vm';

const { validateDocument } = createRequire(import.meta.url)('./answer.js');
const root = new URL('../', import.meta.url);
const hash = text => createHash('sha256').update(text).digest('hex');
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const htmlText = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const resource = path => readFile(new URL(path, root), 'utf8');

function documentData(html) {
  const match = html.match(/<script type="application\/json" id="gv-data">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('更新対象のHTMLに質問データがありません。');
  return validateDocument(JSON.parse(match[1]));
}

async function bundle() {
  const [tokens, css, answers, components] = await Promise.all([
    resource('design-system/tokens.css'), resource('design-system/components.css'),
    resource('scripts/answer.js'), resource('scripts/components.js'),
  ]);
  new Script(answers, { filename: 'answer.js' });
  new Script(components, { filename: 'components.js' });
  if (/<\/style/i.test(tokens + css)) throw new Error('CSSに埋め込めない終了タグがあります。');
  const script = code => '<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>';
  return {
    tokens,
    styles: '<style id="gv-tokens">\n' + tokens + '\n</style>\n<style id="gv-components">\n' + css + '\n</style>',
    scripts: script(answers) + '\n' + script(components),
  };
}

async function render(data, catalog) {
  const assets = await bundle();
  if (catalog) {
    const tokens = [...assets.tokens.matchAll(/(--gv-[\w-]+):\s*([^;]+);\s*\/\*\s*(\w+)\s*\|\s*(.*?)\s*\*\//g)]
      .map(([, name, , kind, label]) => ({ name, kind, label }));
    const declarations = [...assets.tokens.matchAll(/--gv-[\w-]+\s*:/g)];
    if (tokens.length !== declarations.length || new Set(tokens.map(token => token.name)).size !== tokens.length) {
      throw new Error('全トークンに一意な宣言と用途ラベルが必要です。');
    }
    const template = await resource('design-system/component-samples.html');
    return template.replace('<!-- gv:styles -->', () => assets.styles)
      .replace('<!-- gv:scripts -->', () => assets.scripts)
      .replace('<!-- gv:token-data -->', () => '<script type="application/json" id="gv-token-data">' + safeJSON(tokens) + '</script>');
  }
  validateDocument(data);
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlText(data.themes.map(theme => theme.name).join(' / '))}</title>
${assets.styles}
</head>
<body class="gv">
<main class="gv-page" id="gv-app"></main>
<noscript>回答の入力とコピーにはJavaScriptが必要です。</noscript>
<script type="application/json" id="gv-data">${safeJSON(data)}</script>
${assets.scripts}
<script>
try {
  const data = JSON.parse(document.getElementById('gv-data').textContent);
  document.getElementById('gv-app').append(GrillingComponents.workspace(data));
} catch {
  document.getElementById('gv-app').textContent = '質問データを読み込めませんでした。HTMLの生成元で確認してください。';
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
  node scripts/render.mjs questions.json output.html
  node scripts/render.mjs --inspect output.html
  node scripts/render.mjs questions.json output.html --if-match SHA256
  node scripts/render.mjs --catalog component-samples.html [--if-match SHA256]

新規生成では documentId を生成します。更新前に --inspect でデータとSHA256を取得してください。
--catalog は見本テンプレートから、全コンポーネントと全トークンを埋め込んだHTMLを生成します。`);
    return;
  }
  if (args[0] === '--inspect' && args.length === 2) {
    const current = await snapshot(resolve(args[1]));
    if (!current) throw new Error('HTMLが見つかりません。');
    const data = current.text.includes('id="gv-data"') ? documentData(current.text) : null;
    console.log(JSON.stringify({ sha256: current.sha256, data }, null, 2));
    return;
  }
  const catalog = args[0] === '--catalog';
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
    let data;
    if (!catalog) {
      data = JSON.parse(await readFile(resolve(args[0]), 'utf8'));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('質問データはオブジェクトにしてください。');
      const id = previous ? documentData(previous.text).documentId : randomUUID();
      if (previous && data.documentId !== undefined && data.documentId !== id) throw new Error('更新時に documentId を変更できません。');
      data.documentId = id;
    }
    const html = await render(data, catalog);
    for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(code);
    if (!catalog) documentData(html);
    await save(output, html, previous);
    console.log(JSON.stringify({ file: output, sha256: hash(html), ...(data && { documentId: data.documentId }) }));
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
