# fonts

文書と図で使う書体の規範。

## 書体の割り当て

- 英字と数字は Ubuntu Sans で組む。太さは、通常を 400、太字を 700 とする。
- 日本語はヒラギノ角ゴシックで組む。太さは、通常を W3、太字を W6 とする。
- コード、識別子、URL は Ubuntu Mono で組む。
- 数式は Euler で組む。
- 見出し、本文、ラベル、図の中の文字で、書体を変えない。同じ文書の中で、要素ごとに見た目が変わらないようにするためである。
- 英字と日本語が混ざる文では、英字を Ubuntu Sans、日本語をヒラギノ角ゴシックで組む。LaTeX では、英字の書体を `\setmainfont` で、日本語の書体を xeCJK の `\setCJKmainfont` で別々に指定する。CSS では、`"Ubuntu Sans", "Hiragino Sans", sans-serif` の順に指定する。Ubuntu Sans には日本語の字形がないので、日本語の文字だけがヒラギノ角ゴシックで表示される。

## 推奨と代替

- 上記の書体は推奨である。ない場合はシステムにある書体を使う。
- ヒラギノ角ゴシックは macOS に標準で入っている。
- Ubuntu Sans と Ubuntu Mono は、Homebrew では `brew install --cask font-ubuntu-sans font-ubuntu-mono` で導入できる。

## 数式の中の書体

- 図の中の数式や記号も、数式モード（`$...$`）で Euler に組む。
- 数式の中で `\mathsf`、`\textsf`、`\text` を使わない。これらは Ubuntu Sans で組まれ、1つの式の中に2つの書体が混ざるためである。
