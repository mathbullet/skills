---
name: html
description: 概念・仕組み・調査内容を、HTML による視覚的な説明ドキュメントとして作成・編集する。
---

# HTML による説明ドキュメント

## 文章

説明内容と日本語表現を補うため、次のスキルの併用を推奨する。

- `explain`：概念や仕組みを説明するときの用語定義、説明の粒度、構成
- [`japanese-tech-writing`](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d)：日本語の技術文書、記事、解説文の構成と文章規範
- [`cognitive-rhythm-writing`](https://gist.github.com/k16shikano/eb2929f13ed19c97188393d297be8432)：読み物としての緩急が必要な長文の文章規範

いずれも推奨スキルであり、`html` の必須依存ではない。

## 成果物

- HTML を作る
- ビルドなしでブラウザが直接描画できる状態にする
- 保存先が指定されている場合は従う。指定がなければ現在の作業ディレクトリへ保存する
- ファイル名は `{yyyymmdd}-{内容を表すケバブケース}.html` とする。既存ファイルの更新では名前を変えない
- 個別の文書管理システム、メタデータ、Viewer、公開先に関する規則は、このスキルを参照する上位スキルの指示に従う

## デザインシステム

作成前に `design-system/component-samples.html` を確認する。コンポーネント集は `design-system/document.css`、数式コピー機能は `design-system/math-copy.js` を正とする。

既定では、成果物と一緒に必要なファイルを配置し、次の相対パスで読み込む。上位スキルが共有アセットのパスを指定した場合は、その指定を優先する。

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Sans:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&family=Ubuntu+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./design-system/document.css">
<script src="./design-system/math-copy.js"></script>
<script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
<script>document.addEventListener("DOMContentLoaded", () => hljs.highlightAll());</script>
```

主要規則は次のとおり。

- 背景は `#FAF9F6`。部品は白地、黒罫線、角丸を基本とする
- 自然言語は Ubuntu Sans と Noto Sans JP、コード・URL・日付は Ubuntu Mono を使う
- 有彩色はリンク青 `#2990DA` とアクセント赤 `#D63A2F` に限定する
- 赤い強調は原則として 1 ページ 1 箇所までとする
- シンタックスハイライトとコード差分の色は、意味を区別する機能色としてこの制限の対象外とする
- 余白は上下左右の均衡を保つ
- 引用は `.mb-quote` を使い、原文と訳文を同じ文字サイズ・色で上下に並べる
- `.mb-chip` は並列の固有名や分類名の列挙にだけ使う
- 絵文字や矢印文字を図記号として使わない。必要な記号はインライン SVG で描く
- 表は短い対応関係に使い、3 列までを基本とする
- 行見出しのセルには `.mb-rowlabel` を付け、語中の折り返しを防ぐ
- コード差分は `pre.mb-diff` を使い、変更理由を散文で説明してから必要な断片を示す
- ページ固有の `<style>` は図の配置調整など最小限にとどめる

## 構成とフォーマット

説明対象に合わせて、並置、図解、タイムライン、要約、折りたたみを使い分ける。
一方向の単純な手順を、必要性なくフローチャートにしない。

基本構成は次の順とする。

1. 用語リスト
2. 背景
3. 本論
4. 具体例
5. 補足・限界・関連事項

h1 とリード文の後に `.mb-toc` の目次を置き、各 h2 に対応する `id` を付ける。
用語リストは `.mb-wrap` 内の `aside.mb-glossary` に置く。
専門用語は本文で使う前に 1〜2 文で定義する。

## 図

- `.mb-figure` は、画像・SVGなどの視覚資料とキャプションを一つにまとめる外枠である。特定の図形や「矢印で結んだ箱」を意味しない
- `.mb-figure-frame` は視覚資料の表示面、`figcaption` は図番号・説明・出所の表示領域として使う
- 原典に重要な図がある場合は、出所を明示して引用する
- 原典の図があるのに模倣図を作らない
- 自作図はインライン SVG とし、アスキーアートを使わない
- 黒一色の線画を基本とし、`.mb-figure-frame` に載せる
- ノード数が多い場合は縦方向を優先する
- 矢印が交差する構成を避ける
- 単なる直列手順は番号付きの説明として表現する

## コード

- Highlight.js を必ず読み込み、言語に応じたシンタックスハイライトを適用する
- `pre code` には `language-javascript`、`language-python`、`language-html` などの言語クラスを必ず付ける
- ハイライトしないテキストには `language-plaintext` を付ける
- 独自の色付けでコードを装飾せず、`document.css` の `.hljs-*` 規則を使う
- `pre.mb-diff code` には `nohighlight` を付け、差分専用の色と行頭記号を使う

## 数式

- MathJax 3 を使う
- インライン数式は `$...$`、ディスプレイ数式は `$$...$$` とする
- ベクトルと行列は `\boldsymbol{...}` を使う
- スカラー、添字、集合名は装飾しない
- 名前付きの演算は `\mathtt{...}`、標準 LaTeX コマンドはそのまま使う
- `math-copy.js` により、すべての数式から LaTeX 原文をコピーできるようにする
- ページ側で `window.MathJax` を再定義しない
- 未知のコマンドを別記法へ勝手に置換しない

## 印刷と PDF

印刷対応は `document.css` の `@media print` を使う。
PDF 化はユーザーから明示的に依頼された場合だけ `render-pdf.sh` を実行する。
