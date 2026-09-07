(function () {
  function fallbackCopy(tex) {
    var ta = document.createElement('textarea');
    ta.value = tex;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  function copyText(tex) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(tex).catch(function () {
        fallbackCopy(tex);
      });
    }
    fallbackCopy(tex);
    return Promise.resolve();
  }

  function makeButton(tex) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mb-math-copy';
    btn.setAttribute('aria-label', '数式の LaTeX をコピー');
    btn.textContent = 'copy';
    btn.addEventListener('click', function () {
      copyText(tex).then(function () {
        btn.textContent = 'copied';
        setTimeout(function () {
          btn.textContent = 'copy';
        }, 1200);
      });
    });
    return btn;
  }

  function attachCopyUi(item) {
    var root = item.typesetRoot;
    if (!root || !root.parentNode) return;
    var wrap = document.createElement(item.display ? 'div' : 'span');
    wrap.className = item.display ? 'mb-math-block' : 'mb-math-inline';
    root.parentNode.insertBefore(wrap, root);
    wrap.appendChild(root);
    wrap.appendChild(makeButton(item.math));
  }

  window.MathJax = {
    tex: {
      inlineMath: [['$', '$']],
      displayMath: [['$$', '$$']]
    },
    startup: {
      pageReady: function () {
        return MathJax.startup.defaultPageReady().then(function () {
          for (var item of MathJax.startup.document.math) {
            attachCopyUi(item);
          }
        });
      }
    }
  };
})();
