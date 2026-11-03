// Rules of the html skill, checked statically on an HTML string inside a browser.
// run-lint.sh loads this file into headless Chrome and calls LintRules.runFromInput().

var LintRules = (function () {
  "use strict";

  var ALLOWED_CHROMATIC = ["#2990da", "#d63a2f"];
  var MONOCHROME_SVG = ["#111110", "#000000", "#ffffff", "#faf9f6", "#1a1a1a"];
  var CHROMA_THRESHOLD = 24;
  var ALLOWED_FONTS = [
    "var(--mb-font-sans)", "var(--mb-font-mono)",
    "ubuntu sans", "noto sans jp", "ubuntu mono",
    "sans-serif", "monospace", "inherit", "initial", "unset",
  ];
  var LAYOUT_CLASSES = [
    ".mb-glossary", ".mb-page", ".mb-hero", ".mb-wrap", ".mb-main",
    ".mb-header", ".mb-lede", ".mb-toc", ".mb-summary",
  ];
  var LAYOUT_PROPS = [
    "width", "max-width", "min-width", "display", "position", "float",
    "grid-template-columns", "grid-column",
  ];
  var CODE_TAGS = ["CODE", "PRE", "KBD", "SAMP", "SCRIPT", "STYLE"];
  var ARROW_OR_EMOJI = /[←-⇿⟰-⟿⤀-⥿⬀-⯿]|\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
  var MATH_SEGMENT = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g;

  function decodeBase64(text) {
    var bin = atob(text);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function encodeBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function flattenRules(cssText) {
    var sheet = new CSSStyleSheet();
    try {
      sheet.replaceSync(cssText);
    } catch (e) {
      return [];
    }
    var out = [];
    (function walk(rules, media) {
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (r instanceof CSSStyleRule) {
          out.push({ selector: r.selectorText, style: r.style, media: media, key: media + r.cssText });
        } else if (r instanceof CSSMediaRule) {
          walk(r.cssRules, media + "@media " + r.conditionText + " ");
        } else if (r.cssRules) {
          walk(r.cssRules, media);
        }
      }
    })(sheet.cssRules, "");
    return out;
  }

  function styleOf(cssText) {
    var el = document.createElement("div");
    el.setAttribute("style", cssText);
    return el.style;
  }

  function normalizeColor(value) {
    var ctx = normalizeColor.ctx || (normalizeColor.ctx = document.createElement("canvas").getContext("2d"));
    ctx.fillStyle = "#010203";
    ctx.fillStyle = value;
    var v = ctx.fillStyle;
    if (v === "#010203" && value.toLowerCase() !== "#010203") return null;
    var m = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      return "#" + [m[1], m[2], m[3]].map(function (n) {
        return ("0" + Number(n).toString(16)).slice(-2);
      }).join("");
    }
    return v.toLowerCase();
  }

  function chroma(hex) {
    var n = [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); });
    return Math.max.apply(null, n) - Math.min.apply(null, n);
  }

  function colorsIn(value) {
    var tokens = value.match(/#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)|[a-zA-Z]+/g) || [];
    var out = [];
    tokens.forEach(function (t) {
      if (/^[a-zA-Z]+$/.test(t)) {
        if (["transparent", "currentcolor", "inherit", "initial", "unset", "none"].indexOf(t.toLowerCase()) >= 0) return;
        if (!CSS.supports("color", t)) return;
      }
      var c = normalizeColor(t);
      if (c) out.push({ token: t, hex: c });
    });
    return out;
  }

  function selectorTargets(selector, names) {
    return selector.split(",").some(function (part) {
      return part.trim().split(/[\s>+~]+/).some(function (compound) {
        var tag = compound.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
        return tag && names.indexOf(tag[0].toLowerCase()) >= 0;
      });
    });
  }

  function hasAncestor(node, tags) {
    for (var el = node.parentElement; el; el = el.parentElement) {
      if (tags.indexOf(el.tagName.toUpperCase()) >= 0) return true;
    }
    return false;
  }

  function maskNonMarkup(source) {
    return source.replace(/<!--[\s\S]*?-->|(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, function (all, open, tag, inner, close) {
      if (!open) return all.replace(/[^\n]/g, " ");
      return open + inner.replace(/[^\n]/g, " ") + close;
    });
  }

  function Context(source, fileName, documentCss, mathCopyJs) {
    this.source = source;
    this.masked = maskNonMarkup(source);
    this.fileName = fileName;
    this.doc = new DOMParser().parseFromString(source, "text/html");
    this.mathCopyJs = mathCopyJs;

    var docKeys = {};
    flattenRules(documentCss).forEach(function (r) { docKeys[r.key] = true; });
    var rules = [];
    Array.prototype.forEach.call(this.doc.querySelectorAll("style"), function (el) {
      flattenRules(el.textContent).forEach(function (r) {
        if (!docKeys[r.key]) rules.push(r);
      });
    });
    this.pageRules = rules;
    this.styledElements = Array.prototype.slice.call(this.doc.querySelectorAll("[style]"));
    this.violations = [];
  }

  Context.prototype.report = function (rule, severity, line, message) {
    this.violations.push({ rule: rule, severity: severity, line: line, message: message });
  };

  Context.prototype.lineOfElement = function (el) {
    var tag = el.tagName.toLowerCase();
    var same = this.doc.getElementsByTagName(tag);
    var index = Array.prototype.indexOf.call(same, el);
    var re = new RegExp("<" + tag + "[\\s>/]", "gi");
    var m;
    var k = 0;
    while ((m = re.exec(this.masked))) {
      if (k === index) return this.lineAt(m.index);
      k++;
    }
    return null;
  };

  Context.prototype.lineOfText = function (text) {
    var i = this.source.indexOf(text);
    return i < 0 ? null : this.lineAt(i);
  };

  Context.prototype.lineOfRule = function (rule) {
    var first = rule.selector.split(",")[0].trim();
    return this.lineOfText(first);
  };

  Context.prototype.lineAt = function (index) {
    return this.source.slice(0, index).split("\n").length;
  };

  Context.prototype.proseText = function () {
    if (this._prose !== undefined) return this._prose;
    var walker = this.doc.createTreeWalker(this.doc.body || this.doc.documentElement, NodeFilter.SHOW_TEXT);
    var parts = [];
    var n;
    while ((n = walker.nextNode())) {
      if (!hasAncestor(n, CODE_TAGS)) parts.push(n.nodeValue);
    }
    this._prose = parts.join("");
    return this._prose;
  };

  Context.prototype.hasMath = function () {
    return this.proseText().search(MATH_SEGMENT) >= 0;
  };

  Context.prototype.scripts = function () {
    return Array.prototype.slice.call(this.doc.querySelectorAll("script"));
  };

  Context.prototype.isMathCopyInline = function (script) {
    var norm = function (s) { return s.replace(/\s+/g, ""); };
    return !script.src && norm(script.textContent) === norm(this.mathCopyJs);
  };

  Context.prototype.declarations = function () {
    var out = [];
    this.pageRules.forEach(function (r) {
      for (var i = 0; i < r.style.length; i++) {
        var p = r.style[i];
        out.push({ source: "rule", rule: r, selector: r.selector, prop: p, value: r.style.getPropertyValue(p) });
      }
    });
    this.styledElements.forEach(function (el) {
      var s = styleOf(el.getAttribute("style"));
      for (var i = 0; i < s.length; i++) {
        var p = s[i];
        out.push({ source: "attr", element: el, prop: p, value: s.getPropertyValue(p) });
      }
    });
    return out;
  };

  Context.prototype.lineOfDecl = function (d) {
    return d.source === "rule" ? this.lineOfRule(d.rule) : this.lineOfElement(d.element);
  };

  var checks = [];
  function rule(id, severity, fn) {
    checks.push({ id: id, severity: severity, fn: fn });
  }

  rule("file-name", "error", function (ctx, report) {
    var m = ctx.fileName.match(/^(\d{4})(\d{2})(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.html$/);
    var valid = false;
    if (m) {
      var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      valid = d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
    }
    if (!valid) report(null, "ファイル名が {yyyymmdd}-{ケバブケース}.html ではない: " + ctx.fileName);
  });

  rule("required-assets", "error", function (ctx, report) {
    var links = Array.prototype.map.call(ctx.doc.querySelectorAll("link[href]"), function (l) { return l.getAttribute("href"); });
    var fonts = links.filter(function (h) { return /fonts\.googleapis\.com\/css2/.test(h); }).join(" ");
    ["Ubuntu+Sans", "Noto+Sans+JP", "Ubuntu+Mono"].forEach(function (f) {
      if (fonts.indexOf("family=" + f) < 0) report(null, "Google Fonts で " + f.replace(/\+/g, " ") + " を読み込んでいない");
    });
    var cssLinked = links.some(function (h) { return /(^|\/)document\.css$/.test(h); });
    var cssEmbedded = Array.prototype.some.call(ctx.doc.querySelectorAll("style"), function (s) { return /--mb-bg\s*:/.test(s.textContent); });
    if (!cssLinked && !cssEmbedded) report(null, "document.css を読み込みも埋め込みもしていない");
    var scripts = ctx.scripts();
    if (!scripts.some(function (s) { return /highlight(\.min)?\.js$/.test(s.getAttribute("src") || ""); })) {
      report(null, "Highlight.js を読み込んでいない");
    }
    if (!scripts.some(function (s) { return /hljs\.highlightAll\(\)/.test(s.textContent); })) {
      report(null, "hljs.highlightAll() を呼び出していない");
    }
  });

  rule("background", "error", function (ctx, report) {
    ctx.declarations().forEach(function (d) {
      if (!/^background(-color)?$/.test(d.prop)) return;
      var targetsRoot = d.source === "rule"
        ? selectorTargets(d.selector, ["html", "body"])
        : ["HTML", "BODY"].indexOf(d.element.tagName) >= 0;
      if (!targetsRoot) return;
      var ok = /var\(--mb-bg\)/.test(d.value) || colorsIn(d.value).every(function (c) { return c.hex === "#faf9f6"; });
      if (!ok) report(ctx.lineOfDecl(d), "html または body の背景を " + d.value + " に上書きしている");
    });
  });

  rule("no-radius", "error", function (ctx, report) {
    ctx.declarations().forEach(function (d) {
      if (!/radius$/.test(d.prop)) return;
      if (/^(0(px)?|50%)( (0(px)?|50%))*$/.test(d.value.trim())) return;
      report(ctx.lineOfDecl(d), d.prop + ": " + d.value + " で角丸を使っている");
    });
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("rect[rx], rect[ry]"), function (el) {
      var rx = parseFloat(el.getAttribute("rx") || "0");
      var ry = parseFloat(el.getAttribute("ry") || "0");
      if (rx > 0 || ry > 0) report(ctx.lineOfElement(el), "SVG の rect に rx・ry で角丸を付けている");
    });
  });

  rule("font-family", "error", function (ctx, report) {
    function check(value, line) {
      var bad = value.split(",").map(function (f) { return f.trim().replace(/^["']|["']$/g, "").toLowerCase(); })
        .filter(function (f) { return f && ALLOWED_FONTS.indexOf(f) < 0; });
      if (bad.length) report(line, "許可されていない書体を指定している: " + bad.join(", "));
    }
    ctx.declarations().forEach(function (d) {
      if (d.prop === "font-family") check(d.value, ctx.lineOfDecl(d));
    });
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("[font-family]"), function (el) {
      check(el.getAttribute("font-family"), ctx.lineOfElement(el));
    });
  });

  rule("chromatic-color", "error", function (ctx, report) {
    function check(value, line, where) {
      colorsIn(value).forEach(function (c) {
        if (chroma(c.hex) > CHROMA_THRESHOLD && ALLOWED_CHROMATIC.indexOf(c.hex) < 0) {
          report(line, where + " で許可されていない有彩色 " + c.token + " を使っている");
        }
      });
    }
    ctx.declarations().forEach(function (d) {
      if (d.source === "rule" && /\.hljs|\.mb-diff/.test(d.selector)) return;
      if (d.source === "attr" && d.element.closest(".mb-diff")) return;
      check(d.value, ctx.lineOfDecl(d), d.prop);
    });
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("[fill], [stroke], [stop-color], [color]"), function (el) {
      ["fill", "stroke", "stop-color", "color"].forEach(function (a) {
        if (el.hasAttribute(a)) check(el.getAttribute(a), ctx.lineOfElement(el), a);
      });
    });
  });

  rule("accent-count", "warning", function (ctx, report) {
    var accented = new Set(Array.prototype.slice.call(ctx.doc.querySelectorAll("em")));
    ctx.declarations().forEach(function (d) {
      if (!/--mb-accent|#d63a2f/i.test(d.value)) return;
      if (d.source === "attr") {
        accented.add(d.element);
        return;
      }
      try {
        Array.prototype.forEach.call(ctx.doc.querySelectorAll(d.selector), function (el) { accented.add(el); });
      } catch (e) {
        return;
      }
    });
    if (accented.size >= 2) report(null, "赤い強調が " + accented.size + " 箇所ある（原則 1 ページ 1 箇所まで）");
  });

  rule("quote-structure", "error", function (ctx, report) {
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("blockquote:not(.mb-quote)"), function (el) {
      report(ctx.lineOfElement(el), "blockquote に mb-quote クラスがない");
    });
    ctx.declarations().forEach(function (d) {
      if (d.prop !== "font-size" && d.prop !== "color") return;
      var target = d.source === "rule" ? /\.mb-quote-ja/.test(d.selector) : d.element.classList.contains("mb-quote-ja");
      if (target) report(ctx.lineOfDecl(d), ".mb-quote-ja の " + d.prop + " を上書きしている");
    });
  });

  rule("emoji-arrow", "error", function (ctx, report) {
    var walker = ctx.doc.createTreeWalker(ctx.doc.body || ctx.doc.documentElement, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walker.nextNode())) {
      if (hasAncestor(n, CODE_TAGS)) continue;
      var text = n.nodeValue.replace(MATH_SEGMENT, "");
      var m = text.match(ARROW_OR_EMOJI);
      if (m) report(ctx.lineOfText(m[0]), "絵文字または矢印文字 " + m[0] + " を使っている");
    }
  });

  rule("table-columns", "warning", function (ctx, report) {
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("table"), function (table) {
      var max = 0;
      Array.prototype.forEach.call(table.rows, function (row) {
        var n = 0;
        Array.prototype.forEach.call(row.cells, function (c) { n += c.colSpan || 1; });
        max = Math.max(max, n);
      });
      if (max >= 4) report(ctx.lineOfElement(table), "表が " + max + " 列ある（3 列までを基本とする）");
    });
  });

  rule("table-rules", "error", function (ctx, report) {
    var tags = ["table", "thead", "tbody", "tfoot", "tr", "th", "td"];
    ctx.declarations().forEach(function (d) {
      if (!/^border(?!-collapse|-spacing)/.test(d.prop)) return;
      if (/^border(-\w+)?-(radius|image.*)$/.test(d.prop)) return;
      var target = d.source === "rule"
        ? selectorTargets(d.selector, tags)
        : tags.indexOf(d.element.tagName.toLowerCase()) >= 0;
      if (target) report(ctx.lineOfDecl(d), "表に罫線 " + d.prop + ": " + d.value + " を追加している");
    });
  });

  rule("diff-nohighlight", "error", function (ctx, report) {
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("pre.mb-diff code:not(.nohighlight)"), function (el) {
      report(ctx.lineOfElement(el), "pre.mb-diff の code に nohighlight クラスがない");
    });
  });

  rule("toc-position", "error", function (ctx, report) {
    var h1 = ctx.doc.querySelector("h1");
    var lede = ctx.doc.querySelector(".mb-lede");
    var toc = ctx.doc.querySelector("nav.mb-toc");
    if (!h1 || !lede || !toc) {
      report(null, "h1、.mb-lede、nav.mb-toc のいずれかがない");
      return;
    }
    var follows = function (a, b) { return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); };
    if (!follows(h1, lede) || !follows(lede, toc)) {
      report(ctx.lineOfElement(toc), "h1、.mb-lede、nav.mb-toc の順に並んでいない");
    }
  });

  rule("toc-ids", "error", function (ctx, report) {
    var toc = ctx.doc.querySelector("nav.mb-toc");
    var links = toc
      ? Array.prototype.map.call(toc.querySelectorAll(":scope > ol > li > a[href^='#']"), function (a) { return decodeURIComponent(a.getAttribute("href").slice(1)); })
      : [];
    var ids = [];
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("h2"), function (h) {
      if (h.closest("aside")) return;
      if (!h.id) {
        report(ctx.lineOfElement(h), "h2「" + h.textContent.trim() + "」に id がない");
        return;
      }
      ids.push(h.id);
      if (links.indexOf(h.id) < 0) report(ctx.lineOfElement(h), "h2 #" + h.id + " が目次にない");
    });
    links.forEach(function (l) {
      if (ids.indexOf(l) < 0) report(ctx.lineOfElement(toc), "目次のリンク #" + l + " に対応する h2 がない");
    });
  });

  rule("glossary-markup", "error", function (ctx, report) {
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("aside.mb-glossary"), function (aside) {
      var line = ctx.lineOfElement(aside);
      if (!aside.querySelector("dl")) report(line, "用語リストに dl がない");
      if (aside.querySelector("ul, ol, table")) report(line, "用語リストに dl 以外のリストや表を使っている");
      Array.prototype.forEach.call(aside.querySelectorAll("dl"), function (dl) {
        Array.prototype.forEach.call(dl.children, function (c) {
          if (["DT", "DD", "DIV"].indexOf(c.tagName) < 0) report(line, "dl の子に " + c.tagName.toLowerCase() + " がある");
        });
      });
    });
  });

  rule("glossary-layout", "error", function (ctx, report) {
    ctx.declarations().forEach(function (d) {
      if (d.source !== "rule" || LAYOUT_PROPS.indexOf(d.prop) < 0) return;
      var hit = LAYOUT_CLASSES.filter(function (c) { return d.selector.indexOf(c) >= 0; });
      if (hit.length) report(ctx.lineOfDecl(d), hit.join(", ") + " の " + d.prop + " をページ固有の CSS で変えている");
    });
  });

  rule("figure-caption", "error", function (ctx, report) {
    Array.prototype.forEach.call(ctx.doc.querySelectorAll(".mb-figure"), function (fig) {
      if (!fig.querySelector("figcaption")) report(ctx.lineOfElement(fig), ".mb-figure に figcaption がない");
    });
  });

  rule("figure-frame", "error", function (ctx, report) {
    Array.prototype.forEach.call(ctx.doc.querySelectorAll(".mb-figure svg, .mb-figure img"), function (el) {
      if (el.parentElement.closest("svg")) return;
      if (!el.closest(".mb-figure-frame")) report(ctx.lineOfElement(el), el.tagName.toLowerCase() + " が .mb-figure-frame の外にある");
    });
  });

  rule("figure-monochrome", "warning", function (ctx, report) {
    Array.prototype.forEach.call(ctx.doc.querySelectorAll(".mb-figure svg *"), function (el) {
      ["fill", "stroke"].forEach(function (a) {
        var v = el.getAttribute(a);
        if (!v || /^(none|transparent|currentcolor)$/i.test(v) || /var\(--mb-(ink|ink-body|border|surface|bg)\)/.test(v)) return;
        colorsIn(v).forEach(function (c) {
          if (MONOCHROME_SVG.indexOf(c.hex) < 0) report(ctx.lineOfElement(el), "図の " + a + " に " + v + " を使っている（黒一色の線画を基本とする）");
        });
      });
    });
  });

  rule("code-language", "error", function (ctx, report) {
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("pre > code"), function (el) {
      if (!/(^|\s)(language-\S+|nohighlight)(\s|$)/.test(el.className)) {
        report(ctx.lineOfElement(el), "pre > code に言語クラスがない");
      }
    });
  });

  rule("code-coloring", "error", function (ctx, report) {
    Array.prototype.forEach.call(ctx.doc.querySelectorAll("pre [style]"), function (el) {
      report(ctx.lineOfElement(el), "コードの中で style 属性を使っている");
    });
    ctx.declarations().forEach(function (d) {
      if (d.source !== "rule" || !/^(color|background(-color)?)$/.test(d.prop)) return;
      if (/\.mb-diff/.test(d.selector)) return;
      if (/\.hljs/.test(d.selector) || selectorTargets(d.selector, ["pre", "code"])) {
        report(ctx.lineOfDecl(d), d.selector + " の " + d.prop + " をページ固有の CSS で指定している");
      }
    });
  });

  rule("mathjax-version", "error", function (ctx, report) {
    var srcs = ctx.scripts().map(function (s) { return s.getAttribute("src") || ""; }).filter(function (s) { return /mathjax/i.test(s); });
    srcs.forEach(function (s) {
      if (!/mathjax@3|mathjax\/3\./i.test(s)) report(null, "MathJax 3 以外を読み込んでいる: " + s);
    });
    if (ctx.hasMath() && !srcs.length) report(null, "数式があるのに MathJax を読み込んでいない");
  });

  rule("math-delimiters", "error", function (ctx, report) {
    var text = ctx.proseText().replace(MATH_SEGMENT, "");
    var m = text.match(/(^|[^\\])(\\[(\[])/);
    if (m) report(ctx.lineOfText(m[2]), "数式の区切りに " + m[2] + " を使っている（$...$ と $$...$$ を使う）");
  });

  rule("mathjax-redefine", "error", function (ctx, report) {
    ctx.scripts().forEach(function (s) {
      if (s.src || ctx.isMathCopyInline(s)) return;
      if (/(^|[^.\w])(window\.)?MathJax\s*=(?!=)/.test(s.textContent)) {
        report(ctx.lineOfElement(s), "ページの script で MathJax を再定義している");
      }
    });
  });

  rule("math-copy", "error", function (ctx, report) {
    if (!ctx.hasMath()) return;
    var present = ctx.scripts().some(function (s) {
      return /(^|\/)math-copy\.js$/.test(s.getAttribute("src") || "") || ctx.isMathCopyInline(s);
    });
    if (!present) report(null, "数式があるのに math-copy.js を読み込みも埋め込みもしていない");
  });

  rule("print-media", "error", function (ctx, report) {
    ctx.pageRules.forEach(function (r) {
      if (/@media [^@]*\bprint\b/.test(r.media)) report(ctx.lineOfRule(r), "ページ固有の CSS に @media print がある");
    });
  });

  function lint(source, options) {
    var ctx = new Context(source, options.fileName, options.documentCss, options.mathCopyJs);
    checks.forEach(function (c) {
      try {
        c.fn(ctx, function (line, message) { ctx.report(c.id, c.severity, line, message); });
      } catch (e) {
        ctx.report(c.id, "error", null, "検査中に例外が発生した: " + e.message);
      }
    });
    var errors = ctx.violations.filter(function (v) { return v.severity === "error"; }).length;
    return {
      file: options.fileName,
      errors: errors,
      warnings: ctx.violations.length - errors,
      violations: ctx.violations,
    };
  }

  function runFromInput() {
    var input = window.__LINT_INPUT__;
    var result = lint(decodeBase64(input.html), {
      fileName: decodeBase64(input.fileName),
      documentCss: decodeBase64(input.documentCss),
      mathCopyJs: decodeBase64(input.mathCopyJs),
    });
    var out = document.createElement("pre");
    out.textContent = "LINTRESULT:" + encodeBase64(JSON.stringify(result)) + "\nLINTERRORS:" + result.errors;
    document.body.appendChild(out);
  }

  return { lint: lint, runFromInput: runFromInput, rules: checks.map(function (c) { return c.id; }) };
})();
