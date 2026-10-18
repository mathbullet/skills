---
name: ja-explainer
description: 日本語の文書を書くときの規範
---

documenting-with-sources と writing-quotation の2スキルが必要。

どの粒度で文書化するか（summary、details）が指定されなかった場合は、書き始める前にユーザーに尋ねる。

## shared

どの文書でも適用される。

- [references/shared/translation.md](references/shared/translation.md)：訳語の決め方、専門用語の示し方
- [references/shared/sentence.md](references/shared/sentence.md)：文の組み立て方、文末と表記
- [references/shared/source-fidelity.md](references/shared/source-fidelity.md)：原文の内容の扱い（何を書き、何を書き加えないか）
- [references/shared/headings.md](references/shared/headings.md)：文書の題と見出しの立て方
- [references/shared/math.md](references/shared/math.md)：数式を伴う説明の構成、数式表記、変数一覧
- [references/shared/figure.md](references/shared/figure.md)：図の描き方と、論文の図表の抽出と挿入
- [references/shared/fonts.md](references/shared/fonts.md)：文書と図で使う書体
- `references/shared/terms.md`：対訳表。利用者が各々で設定する

## summary

要点をまとめる文書で適用される。

- [references/summary/structure.md](references/summary/structure.md)：文書の構成
- [references/summary/argument-flow.md](references/summary/argument-flow.md)：文書の冒頭に置く「議論の流れ」の置き方と書き方
- [references/summary/source-fidelity.md](references/summary/source-fidelity.md)：原文の修辞と比喩の扱い

## details

論文の詳細解説で適用される。

- [references/details/structure.md](references/details/structure.md)：文書の構成、箇条書きと地の文の使い分け
- [references/details/quotation.md](references/details/quotation.md)：引用ブロックを主体とした構成と、出所参照の書式
- [references/details/results.md](references/details/results.md)：概念の初出の定義、数値結果、実験の手順の書き方

## 出力先と履歴

文書は、既定ではプロジェクトルート直下の `reports/` に作成する。ディレクトリがなければ作る。ユーザーが出力先を指定した場合は、それに従う。

このスキルを使って文書を作成したら、`history.jsonl` に1行を追加する。各行は、作成日（`date`）、文書の題（`title`）、文書の絶対パス（`path`）、原文の URL（`source`、ない場合は `null`）を持つ JSON オブジェクトとする。
