/* Guide modules: small Docsify plugins that run after every page render.
 * Each module exposes `init(root)`; guide.js registers them with Docsify. */
(function () {
  'use strict';

  var modules = [];
  window.GuideModules = {
    register: function (mod) { modules.push(mod); },
  };

  /* Paragraph numbers become permalinks: <span class="p-number">2.1.7</span> → <a id="p-2-1-7" href="#/page?id=p-2-1-7"> */
  function paragraphAnchors(root) {
    var route = (window.location.hash.split('?')[0] || '#/');
    root.querySelectorAll('span.p-number').forEach(function (span) {
      var num = span.textContent.trim();
      if (!/^\d+(\.\d+)+$/.test(num) || span.querySelector('a')) return;
      var id = 'p-' + num.replace(/\./g, '-');
      span.id = id;
      var a = document.createElement('a');
      a.href = route + '?id=' + id;
      a.className = 'p-anchor';
      a.title = 'Посилання на пункт ' + num;
      a.textContent = num;
      a.addEventListener('click', function () {
        var url = location.origin + location.pathname + route + '?id=' + id;
        if (navigator.clipboard) navigator.clipboard.writeText(url).catch(function () {});
        span.classList.add('is-copied');
        setTimeout(function () { span.classList.remove('is-copied'); }, 1200);
      });
      span.textContent = '';
      span.appendChild(a);
    });
  }

  /* External links open in a new tab. */
  function externalLinks(root) {
    root.querySelectorAll('a[href^="http"]').forEach(function (a) {
      if (a.host !== location.host) { a.target = '_blank'; a.rel = 'noopener'; }
    });
  }

  /* Scroll to ?id=p-… after render (Docsify only scrolls to headings it knows about). */
  function scrollToParagraph() {
    var m = /[?&]id=(p-[\d-]+)/.exec(location.hash);
    if (!m) return;
    var el = document.getElementById(m[1]);
    if (el) el.scrollIntoView({ block: 'start' });
  }

  function plugin(hook) {
    hook.doneEach(function () {
      var root = document.querySelector('.markdown-section') || document;
      paragraphAnchors(root);
      externalLinks(root);
      modules.forEach(function (mod) {
        try { mod.init(root); } catch (e) { console.error('[guide] module failed', mod.name, e); }
      });
      scrollToParagraph();
    });
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = [].concat(window.$docsify.plugins || [], plugin);
})();
