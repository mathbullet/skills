# mathbullet/skills [[en](./README-en.md)]

mathbullet による Claude Code skills。プラグインマーケットプレイスとして配布している。

このうち 6 つの skill は、典拠を備えた Markdown 成果物を書くこと、および解説ドキュメント（Markdown もしくは HTML 文書）を作ることに焦点を当てている。これらは互いに相互参照している。`survey` と `paper-details` は `documenting-with-sources` の上に構築され、`documenting-with-sources` は引用ブロックの書式について `writing-quotation` に委ねている。もう 1 つの `ja-text-communication` は、ユーザーとの日本語コミュニケーションで守るべき原則をまとめた skill で、文章を書く前に参照することを意図している。

## インストール

```
/plugin marketplace add mathbullet/skills
/plugin install writing-quotation@skills
/plugin install documenting-with-sources@skills
/plugin install survey@skills
/plugin install paper-details@skills
/plugin install explain@skills
/plugin install html@skills
/plugin install ja-text-communication@skills
```

skill はユーザーの依頼に基づいて自動的に起動する。覚えておくべきスラッシュコマンドはない。必要なものだけインストールすればよい。

## プラグイン

| プラグイン | 目的 |
|---|---|
| [writing-quotation](plugins/writing-quotation/skills/writing-quotation/SKILL.md) | Markdown 文書の中で外部ソースを引用するときの書式ルール。 |
| [documenting-with-sources](plugins/documenting-with-sources/skills/documenting-with-sources/SKILL.md) | 典拠付きの執筆成果物に共通する規約（引用、文中参照、ソース一覧、捏造した関連づけの禁止）。 |
| [survey](plugins/survey/skills/survey/SKILL.md) | トピックを索引化された Markdown レポートに変える、複数ソースの調査 skill。 |
| [paper-details](plugins/paper-details/skills/paper-details/SKILL.md) | 学術論文の忠実で詳細な Markdown 解説を作る（批評ではなく内容の記述）。 |
| [explain](plugins/explain/skills/explain/SKILL.md) | 概念や仕組みの Markdown 解説を書くための規約。 |
| [html](plugins/html/skills/html/SKILL.md) | 概念・仕組み・調査内容を、HTML による視覚的な説明ドキュメントとして作成・編集する。 |
| [ja-text-communication](plugins/ja-text-communication/skills/ja-text-communication/SKILL.md) | ユーザーとの日本語テキストコミュニケーションで守るべき原則。文章を書く前に参照する（用語導入、翻訳、圧縮の禁止、参照、論理、根拠、作業報告、文脈の保持）。 |

## skill 間の依存関係

- `survey` と `paper-details` は `documenting-with-sources` の共通規約に従う。これらのいずれかをインストールするときは常に `documenting-with-sources` もインストールする。
- `documenting-with-sources` は引用ブロックの書式について `writing-quotation` に委ねている。`documenting-with-sources` をインストールするときは常に `writing-quotation` もインストールする。
- `survey` と `paper-details` も `writing-quotation` を直接参照している。

相互参照は skill 名で行われ、両方の skill が同じ Claude Code インスタンスにインストールされていれば解決する。

## ライセンス

MIT
