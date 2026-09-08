# mathbullet/skills [[en](./README-en.md)]

[mathbullet](https://www.youtube.com/@mathbullet) による Agent skills。

## インストール

```bash
npx skills add mathbullet/skills
```

特定の Skill だけをインストールする場合は、`--skill` で名前を指定する。

```bash
npx skills add mathbullet/skills --skill html
```

Claude Code では、プラグインマーケットプレイスからインストールすることもできる。

```
/plugin marketplace add mathbullet/skills
/plugin install html@skills
/plugin install grilling-viz@skills
```

## Skills

| Skill | 役割 |
|---|---|
| [writing-quotation](plugins/writing-quotation/skills/writing-quotation/SKILL.md) | 外部ソースを引用する際の書式を統一する。 |
| [documenting-with-sources](plugins/documenting-with-sources/skills/documenting-with-sources/SKILL.md) | 典拠に基づく文書に共通する引用・文中参照・ソース一覧の規約を定める。 |
| [survey](plugins/survey/skills/survey/SKILL.md) | 複数のソースを調査し、トピック別の索引を Markdown で作成する。 |
| [paper-details](plugins/paper-details/skills/paper-details/SKILL.md) | 論文の内容を忠実かつ詳細に解説する Markdown 文書を作成する。 |
| [explain](plugins/explain/skills/explain/SKILL.md) | 概念や仕組みを説明する Markdown 文書の構成・記述規約を定める。 |
| [html](plugins/html/skills/html/SKILL.md) | 概念・仕組み・調査内容を視覚的に説明する HTML 文書を作成・編集する。 |
| [ja-text-communication](plugins/ja-text-communication/skills/ja-text-communication/SKILL.md) | 日本語でユーザーとやり取りする際の文章・用語・根拠提示の原則を定める。 |
| [grilling-viz](plugins/grilling-viz/skills/grilling-viz/SKILL.md) | grilling の質問を自己完結したHTMLにし、選択肢と自由入力でまとめて回答・コピーする。回答の保存と、部品・トークンの見本を備える。 |

## Skills 間の依存関係

- `survey` と `paper-details` は `documenting-with-sources` の共通規約に従う。これらのいずれかをインストールするときは常に `documenting-with-sources` もインストールする。
- `documenting-with-sources` は引用ブロックの書式について `writing-quotation` に委ねている。`documenting-with-sources` をインストールするときは常に `writing-quotation` もインストールする。
- `survey` と `paper-details` も `writing-quotation` を直接参照している。
- `grilling-viz` は質問構成を [grilling](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling) に従って行う。同じエージェント環境に別途インストールする。HTMLを作るための `render.mjs` は Node.js の標準機能だけを使い、生成後のHTMLはスキルに依存せず動作する。

相互参照は Skill 名で行われ、必要な Skills が同じエージェント環境にインストールされていれば解決する。

## ライセンス

MIT
