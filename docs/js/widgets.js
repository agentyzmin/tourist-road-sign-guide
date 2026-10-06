/* Interactive widgets: POI significance calculator (2.1), sign-type matrix and
 * cross-chapter navigation (4.1 / A1…C3), transliteration (6.3). Feedback form is disabled. */
(function () {
  'use strict';

  var GENERATOR = 'https://touristroadsign.a3.kyiv.ua/';
  /* Feedback form is disabled. To re-enable: uncomment the constants below, the
   * feedbackForm() block and its line in init(), and the placeholder in index.md. */
  // var FEEDBACK_ENDPOINT = ''; // Formspree-style endpoint; empty = mailto: fallback
  // var FEEDBACK_EMAIL = 'tourism@a3.kyiv.ua';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  /* ------------------------------------------------------------ POI calculator */
  var CRITERIA = [
    'Об’єкт занесено в один з державних реєстрів',
    'Об’єкт має державне або національне значення',
    'Об’єкт використовується',
    'Об’єкт зберіг первинну функцію',
    'Відкритий до відвідування',
    'Об’єкт має інформаційний центр',
    'Збережена цілісність об’єкта',
    'Наявна супутня інфраструктура',
    'Об’єкт пропонує різні види активностей та інтересу',
    'Наявні дві або більше точок інтересу поруч з об’єктом',
    'Об’єкт представлено в основних онлайн-путівниках',
    'Об’єкт безпосередньо пов’язано з об’єктами нематеріальної культурної спадщини',
  ];
  var DISTANCE = [[2, 2, 3], [3, 4, 5], [5, 5, 8], [6, 6, 13], [7, 8, 21], [9, 10, 34], [11, 12, 55]];

  function limitFor(score) {
    for (var i = 0; i < DISTANCE.length; i++) {
      if (score >= DISTANCE[i][0] && score <= DISTANCE[i][1]) return DISTANCE[i][2];
    }
    return null;
  }

  function poiCalculator(host) {
    if (host.dataset.ready) return;
    host.dataset.ready = '1';
    var list = el('div', { 'class': 'poi-calc__list' });
    var boxes = CRITERIA.map(function (name, i) {
      var cb = el('input', { type: 'checkbox', id: 'poi-c' + i });
      list.appendChild(el('label', { 'for': 'poi-c' + i }, [cb, el('span', { text: name })]));
      return cb;
    });
    var distInput = el('input', { type: 'number', min: '0', step: '0.5', placeholder: 'км', 'class': 'poi-calc__dist', 'aria-label': 'Відстань від маршруту до точки інтересу, км' });
    var score = el('strong', { text: '0' });
    var limit = el('strong', { text: '—' });
    var verdict = el('p', { 'class': 'poi-calc__verdict' });
    var result = el('div', { 'class': 'poi-calc__result' }, [
      el('p', { html: 'Сума балів: ' }, [score]),
      el('p', { html: 'Гранична відстань: ' }, [limit, el('span', { text: ' км' })]),
      el('p', { 'class': 'poi-calc__distrow' }, [el('span', { text: 'Відстань від маршруту: ' }), distInput]),
      verdict,
    ]);

    function update() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      var lim = limitFor(n);
      score.textContent = n;
      limit.textContent = lim === null ? '—' : lim;
      var d = parseFloat(String(distInput.value).replace(',', '.'));
      verdict.className = 'poi-calc__verdict';
      if (n < 2) {
        verdict.textContent = 'Менше двох критеріїв: точку інтересу на туристичних знаках не відображають (можливий виняток — п. 2.1.8).';
        verdict.classList.add('is-no');
      } else if (isNaN(d)) {
        verdict.textContent = 'Введіть відстань від маршруту, щоб перевірити, чи варто вказувати точку на знаках.';
      } else if (d <= lim * 1.05) {
        verdict.textContent = 'Відстань у межах граничної: точку варто вказувати на туристичних знаках на цьому маршруті. Перевірте також обов’язкові умови п. 2.1.10.';
        verdict.classList.add('is-yes');
      } else {
        verdict.textContent = 'Відстань більша за граничну: значущість точки неадекватна відстані, на знаках цього маршруту її не відображають (винятки — п. 2.1.8).';
        verdict.classList.add('is-no');
      }
    }
    boxes.forEach(function (b) { b.addEventListener('change', update); });
    distInput.addEventListener('input', update);
    var reset = el('button', { type: 'button', 'class': 'button button-secondary poi-calc__reset', text: 'Скинути' });
    reset.addEventListener('click', function () {
      boxes.forEach(function (b) { b.checked = false; });
      distInput.value = '';
      update();
    });
    host.appendChild(el('h4', { 'class': 'widget__title', text: 'Калькулятор значущості точки інтересу' }));
    host.appendChild(el('p', { 'class': 'widget__hint', text: 'Позначте критерії, яким відповідає точка інтересу, і вкажіть відстань від маршруту. Калькулятор застосовує таблицю 2.1.' }));
    host.appendChild(list);
    host.appendChild(result);
    host.appendChild(reset);
    update();
  }

  /* ------------------------------------------------------------ sign types */
  var SIGN_NAMES = {
    a1: 'Попередній знак до окремої точки інтересу', a2: 'Попередній знак до туристичного маршруту', a3: 'Попередній знак до туристичного населеного пункту',
    b1: 'Напрямний знак до окремої точки інтересу', b2: 'Напрямний знак до туристичного маршруту', b3: 'Напрямний знак до туристичного населеного пункту',
    c1: 'Підтверджувальний знак окремої точки інтересу', c2: 'Підтверджувальний знак туристичного маршруту', c3: 'Підтверджувальний знак туристичного населеного пункту',
  };
  var GENERATOR_TYPES = { b1: 1, b2: 1, b3: 1, c1: 1, c2: 1, c3: 1 };

  function signLinks(code, currentPage) {
    var letter = code[0];
    var targets = [
      { page: '4-sign-types', id: code, label: 'Що це за знак' },
      { page: '5-placement', id: letter === 'c' ? code : 'type-' + letter, label: 'Де розміщувати' },
      { page: '7-construction', id: code, label: 'Як побудувати' },
    ];
    var wrap = el('p', { 'class': 'sign-links' }, [el('span', { 'class': 'sign-links__label', text: code.toUpperCase() + ':' })]);
    targets.forEach(function (t) {
      if (t.page === currentPage) return;
      wrap.appendChild(el('a', { href: '#/' + t.page + '?id=' + t.id, text: t.label }));
    });
    if (GENERATOR_TYPES[code]) {
      wrap.appendChild(el('a', { href: GENERATOR, target: '_blank', rel: 'noopener', text: 'Згенерувати знак ↗' }));
    }
    return wrap;
  }

  function currentPage() {
    var m = /^#\/([^?]+)/.exec(location.hash);
    return m ? m[1].replace(/^\/|\/$/g, '') : '';
  }

  function signNavigation(root) {
    var page = currentPage();
    if (['4-sign-types', '5-placement', '7-construction'].indexOf(page) === -1) return;
    root.querySelectorAll('h4[id]').forEach(function (h) {
      if (!/^[abc][123]$/.test(h.id) || h.dataset.signNav) return;
      h.dataset.signNav = '1';
      h.insertAdjacentElement('afterend', signLinks(h.id, page));
    });
  }

  function signMatrix(root) {
    var table = root.querySelector('table.sign-matrix');
    if (!table || table.dataset.ready) return;
    table.dataset.ready = '1';
    var panel = el('div', { 'class': 'sign-matrix__panel', hidden: '' });
    table.insertAdjacentElement('afterend', panel);
    table.querySelectorAll('td[data-sign]').forEach(function (td) {
      td.setAttribute('tabindex', '0');
      td.setAttribute('role', 'button');
      function activate() {
        var code = td.dataset.sign;
        table.querySelectorAll('td.is-active').forEach(function (x) { x.classList.remove('is-active'); });
        td.classList.add('is-active');
        panel.innerHTML = '';
        panel.appendChild(el('strong', { text: code.toUpperCase() + ' — ' + SIGN_NAMES[code] }));
        var links = signLinks(code, '');
        links.firstChild.remove();
        panel.appendChild(links);
        panel.hidden = false;
      }
      td.addEventListener('click', activate);
      td.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
    });
  }

  /* ------------------------------------------------------------ transliteration */
  /* Modified KMU 2010 rules, identical to translit.a3.kyiv.ua (a3-tools/a3_translit). */
  function translit(input) {
    return (input || '')
      .replace(/іє/g, 'ie').replace(/Іє/g, 'Ie')
      .replace(/ія/g, 'ia').replace(/Ія/g, 'Ia')
      .replace(/зг/g, 'zgh').replace(/Зг/g, 'Zgh')
      .replace(/ьо/g, 'io')
      .replace(/а/g, 'a').replace(/б/g, 'b').replace(/в/g, 'v').replace(/г/g, 'h').replace(/ґ/g, 'g')
      .replace(/д/g, 'd').replace(/е/g, 'e')
      .replace(/(^|\s)є/g, '$1ye').replace(/є/g, 'ie')
      .replace(/ж/g, 'zh').replace(/з/g, 'z').replace(/и/g, 'y').replace(/і/g, 'i')
      .replace(/(^|\s)ї/g, '$1yi').replace(/ї/g, 'i')
      .replace(/(^|\s)й/g, '$1y').replace(/й/g, 'i')
      .replace(/к/g, 'k').replace(/л/g, 'l').replace(/м/g, 'm').replace(/н/g, 'n').replace(/о/g, 'o')
      .replace(/п/g, 'p').replace(/р/g, 'r').replace(/с/g, 's').replace(/т/g, 't').replace(/у/g, 'u')
      .replace(/ф/g, 'f').replace(/х/g, 'kh').replace(/ц/g, 'ts').replace(/ч/g, 'ch').replace(/ш/g, 'sh')
      .replace(/щ/g, 'sch').replace(/ь/g, '')
      .replace(/(^|\s)ю/g, '$1yu').replace(/ю/g, 'iu')
      .replace(/(^|\s)я/g, '$1ya').replace(/я/g, 'ia')
      .replace(/А/g, 'A').replace(/Б/g, 'B').replace(/В/g, 'V').replace(/Г/g, 'H').replace(/Ґ/g, 'G')
      .replace(/Д/g, 'D').replace(/Е/g, 'E')
      .replace(/(^|\s)Є/g, '$1Ye').replace(/Є/g, 'Ie')
      .replace(/Ж/g, 'Zh').replace(/З/g, 'Z').replace(/И/g, 'Y').replace(/І/g, 'I')
      .replace(/(^|\s)Ї/g, '$1Yi').replace(/Ї/g, 'I')
      .replace(/(^|\s)Й/g, '$1Y').replace(/Й/g, 'I')
      .replace(/К/g, 'K').replace(/Л/g, 'L').replace(/М/g, 'M').replace(/Н/g, 'N').replace(/О/g, 'O')
      .replace(/П/g, 'P').replace(/Р/g, 'R').replace(/С/g, 'S').replace(/Т/g, 'T').replace(/У/g, 'U')
      .replace(/Ф/g, 'F').replace(/Х/g, 'Kh').replace(/Ц/g, 'Ts').replace(/Ч/g, 'Ch').replace(/Ш/g, 'Sh')
      .replace(/Щ/g, 'Sch').replace(/Ь/g, '')
      .replace(/(^|\s)Ю/g, '$1Yu').replace(/Ю/g, 'Iu')
      .replace(/(^|\s)Я/g, '$1Ya').replace(/Я/g, 'Ia')
      .replace(/['’]/g, '');
  }
  window.GuideTranslit = translit;

  function translitWidget(host) {
    if (host.dataset.ready) return;
    host.dataset.ready = '1';
    var src = el('textarea', { rows: '3', placeholder: 'Введіть назву українською, наприклад: Пересопниця', 'aria-label': 'Текст українською' });
    var out = el('textarea', { rows: '3', readonly: '', placeholder: 'Транслітерація', 'aria-label': 'Результат транслітерації' });
    var copy = el('button', { type: 'button', 'class': 'button button-secondary', text: 'Копіювати' });
    src.addEventListener('input', function () { out.value = translit(src.value); });
    copy.addEventListener('click', function () {
      if (!out.value) return;
      navigator.clipboard && navigator.clipboard.writeText(out.value).then(function () {
        copy.textContent = 'Скопійовано';
        setTimeout(function () { copy.textContent = 'Копіювати'; }, 1500);
      });
    });
    host.appendChild(el('h4', { 'class': 'widget__title', text: 'Транслітератор' }));
    host.appendChild(el('p', { 'class': 'widget__hint', text: 'Транслітерація за таблицею 6.1: модифікована паспортна КМУ 2010.' }));
    host.appendChild(el('div', { 'class': 'translit__io' }, [src, out]));
    host.appendChild(copy);
  }

  /* ------------------------------------------------------------ feedback form (disabled)
  / * ------------------------------------------------------------ feedback form * /
  function feedbackForm(host) {
    if (host.dataset.ready) return;
    host.dataset.ready = '1';
    var form = el('form', { 'class': 'feedback-form', novalidate: '' });
    var msg = el('textarea', { name: 'message', rows: '5', required: '', placeholder: 'Опишіть ситуацію, нестиковку або пропозицію. Якщо йдеться про конкретний пункт, вкажіть його номер, наприклад 5.3.2.' });
    var email = el('input', { type: 'email', name: 'email', placeholder: 'Ваша пошта для відповіді (необов’язково)' });
    var page = el('input', { type: 'hidden', name: 'page', value: location.href });
    var honey = el('input', { type: 'text', name: '_gotcha', tabindex: '-1', autocomplete: 'off', 'class': 'feedback-form__honey', 'aria-hidden': 'true' });
    var submit = el('button', { type: 'submit', 'class': 'button', text: 'Надіслати' });
    var status = el('p', { 'class': 'feedback-form__status', 'aria-live': 'polite' });
    form.appendChild(el('label', {}, [el('span', { text: 'Повідомлення' }), msg]));
    form.appendChild(el('label', {}, [el('span', { text: 'Пошта' }), email]));
    form.appendChild(page);
    form.appendChild(honey);
    form.appendChild(el('div', { 'class': 'feedback-form__row' }, [submit, status]));
    host.appendChild(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!msg.value.trim()) { status.textContent = 'Напишіть повідомлення.'; msg.focus(); return; }
      if (honey.value) return;
      page.value = location.href;
      if (!FEEDBACK_ENDPOINT) {
        var body = msg.value + '\n\n— ' + location.href + (email.value ? '\n' + email.value : '');
        location.href = 'mailto:' + FEEDBACK_EMAIL + '?subject=' + encodeURIComponent('Путівник: зворотний зв’язок') + '&body=' + encodeURIComponent(body);
        status.textContent = 'Відкриваємо поштовий клієнт…';
        return;
      }
      submit.disabled = true;
      status.textContent = 'Надсилаємо…';
      fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form),
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        form.reset();
        status.textContent = 'Дякуємо! Повідомлення надіслано.';
      }).catch(function () {
        status.textContent = 'Не вдалося надіслати. Напишіть на ' + FEEDBACK_EMAIL + '.';
      }).then(function () { submit.disabled = false; });
    });
  }
  */

  /* ------------------------------------------------------------ register */
  window.GuideModules.register({
    name: 'widgets',
    init: function (root) {
      root.querySelectorAll('[data-widget="poi-calc"]').forEach(poiCalculator);
      root.querySelectorAll('[data-widget="translit"]').forEach(translitWidget);
      // root.querySelectorAll('[data-widget="feedback"]').forEach(feedbackForm);
      signMatrix(root);
      signNavigation(root);
    },
  });
})();
