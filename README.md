# Туристична навігація на дорогах України: системний путівник

Веб-версія путівника для проєктувальників туристичних дорожніх знаків. Живий сайт: [touristroadguide.a3.kyiv.ua](https://touristroadguide.a3.kyiv.ua/). PDF-версія 1.0 (31 грудня 2021) лежить у `docs/PDF/`.

Путівник розробили «Агенти змін» на замовлення Державного агентства розвитку туризму України. Зворотний зв'язок: tourism@a3.kyiv.ua або форма на головній сторінці.

## Як влаштовано

- Сайт на [Docsify 4](https://docsify.js.org/) без збірки: `docs/index.html` підключає Docsify з CDN, контент лежить у markdown.
- Хостинг: GitHub Pages з гілки `master`, тека `/docs`, домен у `docs/CNAME`. Кожен push у `master` оновлює сайт.
- Шрифт Road UI підключається з `cdn.a3.kyiv.ua`.

| Шлях | Що це |
|---|---|
| `docs/index.md`, `docs/1-principles.md` … `docs/7-construction.md` | Розділи путівника |
| `docs/appendix-a-icons.md` | Додаток А: бібліотека піктограм (блок між `<!-- icons:start -->` і `<!-- icons:end -->` генерується скриптом) |
| `docs/_sidebar.md` | Зміст у бічній панелі |
| `docs/assets/img/<розділ>/` | Ілюстрації (PNG з InDesign-макета) |
| `docs/icons/` | Піктограми: `svg/`, `png/`, `eps/`, `pdf/`, `svg-transparent/`, повний набір в `all/`, архіви в `zip/` |
| `docs/data/icons.json` | Каталог піктограм (назви, групи, файли) |
| `docs/css/style.css` | Стилі поверх теми docsify-themeable |
| `docs/js/guide.js` | Ядро: реєстрація модулів, якорі на нумерованих абзацах, lazy-loading |
| `docs/js/icons.js` | Пошук і «Копіювати SVG» у бібліотеці піктограм |
| `docs/js/widgets.js` | Калькулятор значущості (2.1), матриця типів знаків (4.1), транслітератор (6.3), форма зворотного зв'язку |
| `scripts/build-icons.py` | Збирає `docs/icons/`, `icons.json` і блок галереї з папки Production/Icons на Google Drive |
| `PLAN.md` | План робіт і стан |

## Правила для контенту

- Нумеровані пункти: `<span class="p-number">2.1.7</span> Текст…`. На сайті номер стає посиланням `#/2-object-types?id=p-2-1-7`.
- Підписи: `<p class="caption">Ілюстрація 2.1 — …</p>` одразу після зображення, `<p class="caption">Таблиця 2.1 — …</p>` перед таблицею.
- Заголовки мають стабільні латинські id: `## 2.1 Точка інтересу :id=poi`. На них посилаються сайдбар і внутрішні лінки, тому не змінюйте id без оновлення `_sidebar.md`.
- Номери доріг: `<span class="road-num m">М 06</span>` (класи `m`, `n` червоні, `e` зелений, `r`, `t`, `blue` сині).
- Віджети вставляються порожнім блоком: `<div class="widget" data-widget="poi-calc"></div>` (`poi-calc`, `translit`, `feedback`).

## Локальний перегляд

```bash
cd docs && python3 -m http.server 8765
# http://localhost:8765
```

## Оновити піктограми

Джерело: Shared drive A3 → `Projects/Road Wayfinding/Stage 8. Tourism wayfinding feat DART/7. Production/Icons` (57 піктограм × SVG/PNG/EPS/PDF + DWG + AI). Каталог назв і груп описано у `SECTIONS` всередині скрипта.

```bash
python3 scripts/build-icons.py            # копіює з Drive, збирає все
python3 scripts/build-icons.py --no-copy  # лише перегенерувати json, zip і markdown
```

Нова піктограма: додати файл у Production/Icons у всіх форматах, додати запис у `SECTIONS`, запустити скрипт, закомітити.

## Форма зворотного зв'язку

`docs/js/widgets.js` має константу `FEEDBACK_ENDPOINT`. Поки вона порожня, кнопка «Надіслати» відкриває поштовий клієнт з готовим листом на tourism@a3.kyiv.ua. Щоб повідомлення йшли без поштового клієнта, створіть форму на [Formspree](https://formspree.io/) (або сумісному сервісі) і впишіть її URL у константу.

## Ліцензія

Текст та ілюстрації: CC BY-ND. Піктограми можна вільно використовувати на знаках із зазначенням авторства, але не можна змінювати їхню форму.
