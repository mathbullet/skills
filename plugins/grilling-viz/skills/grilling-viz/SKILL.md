---
name: grilling-viz
description: >
  grilling による質問を、選択肢と自由入力でまとめて回答し、コピーできるHTMLにする。
---

# Grilling Viz

grilling に従って質問を構成し、下記に従って可視化する。

## 可視化

[部品見本と利用規範](design-system/component-samples.html) を確認し、次を生成時の正本として使う。

- design-system/tokens.css：デザイン値と用途ラベル
- design-system/components.css：見た目
- scripts/components.js：部品構造
- scripts/answer.js：データ形式・回答処理

以下の `scripts/` は、このスキルのディレクトリからの相対パス。
生成スクリプトは Node.js の標準機能だけで動く。

```sh
node scripts/render.mjs questions.json output.html
node scripts/render.mjs --catalog component-samples.html
```

生成処理は質問データを検証し、JavaScript・CSSのコードテキストをHTML内に埋め込む。
部品見本も上記コマンドで生成してブラウザーで確認する。テンプレート自体を出力先にしない。
生成スクリプトを実行できない場合は、同じ正本を使ってエージェントが埋め込む。
保存先の指定がなければ作業ディレクトリに、日付と内容を表す名前で置く。

- 完成HTMLは、スキルの移動・削除後も単独で動くものにする。
- 回答用HTMLに部品見本や設計説明を混在させない。
- 回答の受渡しは、コピーと元の会話への貼り付けで行う。

## 回答を保持するための更新規則

- 新規生成では生成スクリプトがランダムな識別子をHTML内の `documentId` に書き込む。更新ではファイル名と既存のIDを保つ。
- 質問や選択肢の意味が変わる場合は質問IDを新しくし、旧回答を流用しない。
- 再生成だけを理由に、HTMLから外した質問の保存データを消さない。

更新前に既存データとハッシュを取得し、質問データを編集して同じファイルに生成する。
ハッシュが一致しなければ読み直して統合する。

```sh
node scripts/render.mjs --inspect output.html
node scripts/render.mjs questions.json output.html --if-match SHA256
```

## 確認

HTML単体・オフラインで、入力・コピー・再読み込み後の回答復元を確認する。
ブラウザーを利用できなければ、未確認の操作を報告する。
