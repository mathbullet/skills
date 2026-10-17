---
name: ja-document
description: 日本語の文書を書くときの規範
---

shared の規範は、どの文書にも従う。summary の規範は原文の要点をまとめる文書に、details の規範は論文の詳細解説に従う。documenting-with-sources と writing-quotation の2スキルが必要。

## shared

- [reference/shared/translation.md](reference/shared/translation.md)：訳語の決め方、専門用語の示し方
- [reference/shared/sentence.md](reference/shared/sentence.md)：文の組み立て方、文末と表記
- [reference/shared/source-fidelity.md](reference/shared/source-fidelity.md)：原文の内容の扱い（何を書き、何を書き加えないか）
- [reference/shared/headings.md](reference/shared/headings.md)：文書の題と見出しの立て方
- [reference/shared/math.md](reference/shared/math.md)：数式を伴う説明の構成、数式表記、変数一覧
- [reference/shared/figure.md](reference/shared/figure.md)：図の描き方と、論文の図表の抽出と挿入
- [reference/shared/fonts.md](reference/shared/fonts.md)：文書と図で使う書体
- [reference/shared/terms.md](reference/shared/terms.md)：対訳表。利用者が各々で設定する

## summary

- [reference/summary/structure.md](reference/summary/structure.md)：文書の構成
- [reference/summary/argument-flow.md](reference/summary/argument-flow.md)：文書の冒頭に置く「議論の流れ」の置き方と書き方
- [reference/summary/source-fidelity.md](reference/summary/source-fidelity.md)：原文の修辞と比喩の扱い

## details

- [reference/details/structure.md](reference/details/structure.md)：文書の構成、箇条書きと地の文の使い分け
- [reference/details/quotation.md](reference/details/quotation.md)：引用ブロックを主体とした構成と、出所参照の書式
- [reference/details/results.md](reference/details/results.md)：概念の初出の定義、数値結果、実験の手順の書き方

## 出力先と履歴

文書は、既定ではプロジェクトルート直下の `reports/` に作成する。ディレクトリがなければ作る。ユーザーが出力先を指定した場合は、それに従う。

このスキルを使って文書を作成したら、[history.jsonl](history.jsonl) に1行を追加する。各行は、作成日（`date`）、文書の題（`title`）、文書の絶対パス（`path`）、原文の URL（`source`、ない場合は `null`）を持つ JSON オブジェクトとする。
