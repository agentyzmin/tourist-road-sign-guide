/* Icon library: search/filter over the static gallery and "copy SVG" buttons. */
(function () {
  'use strict';

  function normalize(s) {
    return (s || '').toLowerCase().replace(/[’'`]/g, '').replace(/\s+/g, ' ').trim();
  }

  function initSearch(root) {
    var input = root.querySelector('#icon-search');
    if (!input) return;
    var cards = Array.prototype.slice.call(root.querySelectorAll('.icon-card'));
    var groups = Array.prototype.slice.call(root.querySelectorAll('.icon-group'));
    var empty = root.querySelector('.icon-empty');
    var headings = Array.prototype.slice.call(root.querySelectorAll('h2[id]')).filter(function (h) {
      return ['categories', 'additional', 'services'].indexOf(h.id) !== -1;
    });

    function apply() {
      var q = normalize(input.value);
      var shown = 0;
      cards.forEach(function (card) {
        var hit = !q || normalize(card.getAttribute('data-search')).indexOf(q) !== -1;
        card.hidden = !hit;
        if (hit) shown++;
      });
      groups.forEach(function (g) {
        g.hidden = !g.querySelector('.icon-card:not([hidden])');
      });
      headings.forEach(function (h) {
        var next = h.nextElementSibling, any = false;
        while (next && next.tagName !== 'H2') {
          if (next.classList && next.classList.contains('icon-group') && !next.hidden) { any = true; break; }
          next = next.nextElementSibling;
        }
        h.hidden = !any;
      });
      if (empty) empty.hidden = shown !== 0;
    }

    input.addEventListener('input', apply);
    // Deep link: #/appendix-a-icons?q=музей
    var m = /[?&]q=([^&]+)/.exec(location.hash);
    if (m) { input.value = decodeURIComponent(m[1]); apply(); }
  }

  function initCopy(root) {
    root.querySelectorAll('.icon-copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = btn.getAttribute('data-src');
        fetch(src).then(function (r) { return r.text(); }).then(function (svg) {
          return navigator.clipboard.writeText(svg);
        }).then(function () {
          var label = btn.textContent;
          btn.textContent = 'Скопійовано';
          btn.classList.add('is-done');
          setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 1500);
        }).catch(function () {
          window.open(src, '_blank');
        });
      });
    });
  }

  window.GuideModules.register({
    name: 'icons',
    init: function (root) {
      initSearch(root);
      initCopy(root);
    },
  });
})();
