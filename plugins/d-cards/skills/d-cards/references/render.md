# データ形式、生成、更新

## データ形式

```json
{
  "schemaVersion": 1,
  "themes": [{
    "id": "theme-id",
    "name": "テーマ名",
    "description": "テーマの説明",
    "cards": [{
      "id": "A1",
      "title": "問い",
      "context": ["背景の段落"],
      "figure": { "tikz": "tikzpicture の中身", "caption": "図の説明" },
      "options": [{ "id": "x", "label": "選択肢", "consequence": "選んだ場合の帰結" }],
      "recommendation": { "option": "x", "reason": "推奨の理由" }
    }]
  }]
}
```

- `description`、`figure`、`recommendation` は省略できる
- `figure` には、`tikz` と `svg` のどちらか一方と、`caption` を指定する
- 実例は examples/sample.json にある

## 生成

```sh
node scripts/render.mjs cards.json output.html
```

`scripts/` は、このスキルのディレクトリからの相対パスである。
生成した HTML は単独で動き、回答はブラウザーに保存される。
保存先の指定がなければ作業ディレクトリに、`{yyyymmdd}-{内容を表すケバブケース}.html` の名前で置く。

生成には次が必要である。

- Node.js：標準機能だけを使う
- html スキルの document.css：このスキルと同じ階層に html スキルがあれば自動で読む。別の場所にある場合は、環境変数 `D_CARDS_DOCUMENT_CSS` にパスを指定する
- lualatex と pdftocairo：TikZ の図がある場合に限って必要である

## 更新

回答を保ったまま HTML を更新するときは、既存のデータとハッシュを取得してから、同じファイルに生成する。

```sh
node scripts/render.mjs --inspect output.html
node scripts/render.mjs cards.json output.html --if-match SHA256
```

- ファイル名と `documentId` は変えない
- 問いや選択肢の意味が変わるカードには、新しいカード ID を付ける
- ハッシュが一致しない場合は、読み直して統合する

## 確認

生成した HTML は、ブラウザーで次を確認する。

- カードの移動
- 回答の入力
- コピー
- 再読み込みした後の回答の復元
