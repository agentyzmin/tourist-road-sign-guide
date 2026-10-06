/* Icon library page (#/icons): dense grid of all icons rendered from data/icons.json,
 * with search, section filters, background toggle and a detail dialog with downloads.
 * Deep link to an icon: #/icons?icon=<slug>. */
(function () {
  'use strict';

  var DATA_URL = 'data/icons.json';
  var FORMAT_LABEL = { svg: 'SVG', png: 'PNG', eps: 'EPS', pdf: 'PDF', 'svg-transparent': 'SVG без тла' };
  var KIND_LABEL = {
    general: 'Загальна піктограма категорії',
    specific: 'Піктограма окремої категорії',
    badge: 'Додаткова позначка',
    service: 'Сервіс',
  };
  var dataPromise = null;
  var openBySlug = null; // set by the rendered page; used when only ?icon= changes

  window.addEventListener('hashchange', function () {
    var slug = iconFromHash();
    if (slug && openBySlug && /^#\/icons(\?|$)/.test(location.hash)) openBySlug(slug);
  });

  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL).then(function (r) {
        if (!r.ok) throw new Error('icons.json ' + r.status);
        return r.json();
      });
    }
    return dataPromise;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function normalize(s) {
    return (s || '').toLowerCase().replace(/[’'`ʼ]/g, '').replace(/\s+/g, ' ').trim();
  }

  function humanSize(n) {
    if (n < 1024) return n + ' Б';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' КБ';
    return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' МБ';
  }

  function flatten(data) {
    var list = [];
    data.sections.forEach(function (section) {
      section.groups.forEach(function (group) {
        group.icons.forEach(function (icon) {
          list.push({
            icon: icon,
            section: section,
            group: group,
            search: normalize([icon.name, icon.en, icon.slug, group.title].concat(icon.also || []).join(' ')),
          });
        });
      });
    });
    return list;
  }

  function iconFromHash() {
    var m = /[?&]icon=([^&]+)/.exec(location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setHashIcon(slug) {
    var base = location.hash.split('?')[0] || '#/icons';
    history.replaceState(null, '', base + (slug ? '?icon=' + encodeURIComponent(slug) : ''));
  }

  function copyText(text, btn, label) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = 'Скопійовано';
      btn.classList.add('is-done');
      setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 1400);
    });
  }

  function render(host, data) {
    var items = flatten(data);
    var state = { query: '', section: 'all', visible: items.slice(), current: -1 };

    var counts = { all: items.length };
    data.sections.forEach(function (s) {
      counts[s.id] = items.filter(function (it) { return it.section.id === s.id; }).length;
    });
    var shortTitle = { categories: 'Категорії', additional: 'Додаткові', services: 'Сервіси' };

    /* ---- toolbar */
    var chips = '<button type="button" class="lib-chip is-active" data-section="all">Усі <span>' + counts.all + '</span></button>' +
      data.sections.map(function (s) {
        return '<button type="button" class="lib-chip" data-section="' + esc(s.id) + '">' +
          esc(shortTitle[s.id] || s.title) + ' <span>' + counts[s.id] + '</span></button>';
      }).join('');

    var downloads = '<a class="button" href="' + esc(data.zips.all) + '" download>Завантажити все (ZIP)</a>' +
      ['svg', 'png', 'eps', 'pdf', 'svg-transparent'].filter(function (f) { return data.zips[f]; }).map(function (f) {
        return '<a class="button button-secondary" href="' + esc(data.zips[f]) + '" download>' + FORMAT_LABEL[f] + '</a>';
      }).join('') +
      Object.keys(data.fullSet || {}).map(function (ext) {
        return '<a class="button button-secondary" href="' + esc(data.fullSet[ext]) + '" download>Набір ' + ext.toUpperCase() + '</a>';
      }).join('');

    host.innerHTML =
      '<div class="lib-toolbar">' +
        '<input type="search" class="lib-search" placeholder="Знайти піктограму українською або англійською…" aria-label="Пошук піктограми">' +
        '<div class="lib-toolbar__row">' +
          '<div class="lib-chips" role="group" aria-label="Розділ">' + chips + '</div>' +
        '</div>' +
        '<div class="lib-downloads">' + downloads + '</div>' +
      '</div>' +
      '<p class="lib-count" aria-live="polite"></p>' +
      '<div class="lib-grid" role="list"></div>' +
      '<p class="lib-empty" hidden>Нічого не знайшли. Спробуйте іншу назву або англійський відповідник.</p>' +
      '<dialog class="lib-dialog" aria-labelledby="lib-dialog-title"></dialog>';

    var grid = host.querySelector('.lib-grid');
    var search = host.querySelector('.lib-search');
    var count = host.querySelector('.lib-count');
    var empty = host.querySelector('.lib-empty');
    var dialog = host.querySelector('.lib-dialog');

    /* ---- grid */
    grid.innerHTML = items.map(function (it, i) {
      var ic = it.icon;
      return '<button type="button" role="listitem" class="lib-tile lib-tile--' + esc(ic.kind) + '" data-index="' + i + '" title="' + esc(ic.name) + '">' +
        '<span class="lib-tile__img"><img src="' + esc(ic.files.svg.path) + '" alt="" loading="lazy"></span>' +
        '<span class="lib-tile__name">' + esc(ic.name) + '</span>' +
        '</button>';
    }).join('');
    var tiles = Array.prototype.slice.call(grid.querySelectorAll('.lib-tile'));

    function apply() {
      var q = normalize(state.query);
      state.visible = [];
      items.forEach(function (it, i) {
        var hit = (state.section === 'all' || it.section.id === state.section) && (!q || it.search.indexOf(q) !== -1);
        tiles[i].hidden = !hit;
        if (hit) state.visible.push(i);
      });
      empty.hidden = state.visible.length !== 0;
      count.textContent = state.visible.length === items.length
        ? items.length + ' піктограм'
        : 'Знайдено: ' + state.visible.length + ' з ' + items.length;
    }

    search.addEventListener('input', function () { state.query = search.value; apply(); });
    host.querySelectorAll('.lib-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        host.querySelectorAll('.lib-chip').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        state.section = chip.getAttribute('data-section');
        apply();
      });
    });
    /* ---- detail dialog */
    function openIcon(index) {
      var it = items[index];
      if (!it) return;
      state.current = index;
      var ic = it.icon;
      var formats = ['svg', 'png', 'eps', 'pdf', 'svg-transparent'].filter(function (f) { return ic.files[f]; });
      var also = ic.also && ic.also.length ? '<p class="lib-dialog__also">Також для: ' + esc(ic.also.join(', ')) + '</p>' : '';
      dialog.innerHTML =
        '<div class="lib-dialog__inner">' +
          '<button type="button" class="lib-dialog__close" aria-label="Закрити">×</button>' +
          '<div class="lib-dialog__preview lib-dialog__preview--' + esc(ic.kind) + '">' +
            '<img src="' + esc(ic.files.svg.path) + '" alt="' + esc(ic.name) + '">' +
          '</div>' +
          '<div class="lib-dialog__body">' +
            '<p class="lib-dialog__kind">' + esc(KIND_LABEL[ic.kind] || '') + ' · ' + esc(it.group.title) + '</p>' +
            '<h3 id="lib-dialog-title" class="lib-dialog__name">' + esc(ic.name) + '</h3>' +
            '<p class="lib-dialog__en">' + esc(ic.en || '') + '</p>' +
            also +
            '<div class="lib-dialog__bg" role="group" aria-label="Тло превʼю">' +
              '<button type="button" class="lib-bg is-active" data-bg="default">З тлом</button>' +
              '<button type="button" class="lib-bg" data-bg="transparent">Без тла</button>' +
            '</div>' +
            '<p class="lib-dialog__label">Завантажити</p>' +
            '<div class="lib-dialog__files">' +
              formats.map(function (f) {
                var ext = f === 'svg-transparent' ? 'svg' : f;
                var name = ic.slug + (f === 'svg-transparent' ? '-transparent' : '') + '.' + ext;
                return '<a class="lib-file" href="' + esc(ic.files[f].path) + '" download="' + esc(name) + '">' +
                  '<strong>' + FORMAT_LABEL[f] + '</strong><span>' + humanSize(ic.files[f].size) + '</span></a>';
              }).join('') +
            '</div>' +
            '<div class="lib-dialog__actions">' +
              '<button type="button" class="lib-action" data-action="copy-svg">Копіювати SVG</button>' +
              '<button type="button" class="lib-action" data-action="copy-link">Копіювати посилання</button>' +
            '</div>' +
            '<p class="lib-dialog__file">Файл: <code>' + esc(ic.slug) + '</code></p>' +
          '</div>' +
          '<div class="lib-dialog__nav">' +
            '<button type="button" class="lib-nav" data-step="-1" aria-label="Попередня піктограма">←</button>' +
            '<button type="button" class="lib-nav" data-step="1" aria-label="Наступна піктограма">→</button>' +
          '</div>' +
        '</div>';

      dialog.querySelector('.lib-dialog__close').addEventListener('click', function () { dialog.close(); });
      var previewImg = dialog.querySelector('.lib-dialog__preview img');
      var preview = dialog.querySelector('.lib-dialog__preview');
      dialog.querySelectorAll('.lib-bg').forEach(function (b) {
        b.addEventListener('click', function () {
          dialog.querySelectorAll('.lib-bg').forEach(function (x) { x.classList.remove('is-active'); });
          b.classList.add('is-active');
          var t = b.getAttribute('data-bg') === 'transparent';
          previewImg.src = (t && ic.files['svg-transparent'] ? ic.files['svg-transparent'] : ic.files.svg).path;
          preview.classList.toggle('is-transparent', t);
        });
      });
      dialog.querySelector('[data-action="copy-svg"]').addEventListener('click', function (e) {
        var btn = e.currentTarget;
        fetch(ic.files.svg.path).then(function (r) { return r.text(); }).then(function (svg) {
          copyText(svg, btn, 'Копіювати SVG');
        });
      });
      dialog.querySelector('[data-action="copy-link"]').addEventListener('click', function (e) {
        copyText(location.origin + location.pathname + '#/icons?icon=' + encodeURIComponent(ic.slug), e.currentTarget, 'Копіювати посилання');
      });
      dialog.querySelectorAll('.lib-nav').forEach(function (b) {
        b.addEventListener('click', function () { step(parseInt(b.getAttribute('data-step'), 10)); });
      });

      setHashIcon(ic.slug);
      if (!dialog.open) dialog.showModal();
    }

    function step(delta) {
      var list = state.visible.length ? state.visible : items.map(function (_, i) { return i; });
      var pos = list.indexOf(state.current);
      var next = list[(pos + delta + list.length) % list.length];
      openIcon(next);
    }

    grid.addEventListener('click', function (e) {
      var tile = e.target.closest('.lib-tile');
      if (tile) openIcon(parseInt(tile.getAttribute('data-index'), 10));
    });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close(); // click on backdrop
    });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    dialog.addEventListener('close', function () {
      setHashIcon(null);
      var tile = tiles[state.current];
      if (tile) tile.focus();
      state.current = -1;
    });

    apply();

    openBySlug = function (slug) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].icon.slug === slug) {
          if (state.current !== i || !dialog.open) openIcon(i);
          return;
        }
      }
    };
    var deep = iconFromHash();
    if (deep) openBySlug(deep);
  }

  window.GuideModules.register({
    name: 'icon-library',
    init: function (root) {
      root.querySelectorAll('[data-widget="icon-library"]').forEach(function (host) {
        if (host.dataset.ready) return;
        host.dataset.ready = '1';
        host.innerHTML = '<p class="lib-count">Завантаження…</p>';
        loadData().then(function (data) { render(host, data); }).catch(function (err) {
          host.innerHTML = '<p>Не вдалося завантажити каталог піктограм. Оновіть сторінку.</p>';
          console.error('[icon-library]', err);
        });
      });
    },
  });
})();
