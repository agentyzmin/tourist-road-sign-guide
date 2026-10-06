#!/usr/bin/env python3
"""Build the icon library for the guide.

Reads the production icon set (Google Drive, `7. Production/Icons`), copies every icon into
`docs/icons/<format>/<slug>.<ext>` with short names, derives transparent SVGs (brown background
removed), packs ZIP archives, writes `docs/data/icons.json` and regenerates the gallery block
inside `docs/appendix-a-icons.md` (between `<!-- icons:start -->` and `<!-- icons:end -->`).

Usage:
    python3 scripts/build-icons.py [--src "<path to Production/Icons>"] [--no-copy]

`--no-copy` only rewrites icons.json, the ZIPs and the markdown from files already in docs/icons.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUT = DOCS / "icons"
DATA = DOCS / "data" / "icons.json"
APPENDIX = DOCS / "appendix-a-icons.md"

DEFAULT_SRC = (
    "/Users/alx/Library/CloudStorage/GoogleDrive-alex.kolodko@gmail.com/Shared drives/A3/Projects/"
    "Road Wayfinding/Stage 8. Tourism wayfinding feat DART/7. Production/Icons"
)
SRC_PREFIX = "Tourist Road Signs - Icons - "
FULL_SET_NAME = "TouristRoadSigns-Icons"
FORMATS = ["svg", "png", "eps", "pdf"]
BROWN = "#592d2c"

# --------------------------------------------------------------------------- catalogue
# Order follows Appendix A of the guide. kind: "general" (загальна піктограма категорії) or
# "specific" (піктограма окремої категорії). `also` lists names that share the same icon.
SECTIONS = [
    {
        "id": "categories",
        "title": "І. Піктограми категорій",
        "groups": [
            {"title": "Ремеслене та локальне виробництво", "icons": [
                {"slug": "manufacture", "name": "Ремеслене та локальне виробництво", "en": "Craft and local production", "kind": "general"},
            ]},
            {"title": "Торгівля", "icons": [
                {"slug": "trading", "name": "Торгівля", "en": "Trade", "kind": "general"},
            ]},
            {"title": "Меморіальні кладовища", "icons": [
                {"slug": "cemetery", "name": "Меморіальні кладовища", "en": "Memorial cemeteries", "kind": "general"},
                {"slug": "cemetery-military", "name": "Військові кладовища", "en": "Military cemeteries", "kind": "specific"},
            ]},
            {"title": "Місця пам’яті", "icons": [
                {"slug": "memorial", "name": "Місця пам’яті", "en": "Places of memory", "kind": "general", "also": ["Пам’ятники і меморіали"]},
            ]},
            {"title": "Археологічні пам’ятки", "icons": [
                {"slug": "archeology", "name": "Археологічні пам’ятки", "en": "Archaeological sites", "kind": "general"},
            ]},
            {"title": "Рекреація на воді", "icons": [
                {"slug": "recreation-water", "name": "Рекреація на воді", "en": "Water recreation", "kind": "general"},
                {"slug": "recreation-water-beach", "name": "Пляжі та облаштовані місця для купання", "en": "Beaches and bathing areas", "kind": "specific"},
            ]},
            {"title": "Рекреація на снігу", "icons": [
                {"slug": "recreation-snow", "name": "Рекреація на снігу", "en": "Snow recreation", "kind": "general"},
            ]},
            {"title": "Рекреація на землі", "icons": [
                {"slug": "recreation-ground", "name": "Рекреація на землі", "en": "Land recreation", "kind": "general"},
                {"slug": "recreation-ground-hiking", "name": "Пішохідні маршрути", "en": "Hiking trails", "kind": "specific"},
            ]},
            {"title": "Культурні заклади", "icons": [
                {"slug": "cultural", "name": "Культурні заклади", "en": "Cultural institutions", "kind": "general"},
                {"slug": "cultural-museum", "name": "Музей", "en": "Museum", "kind": "specific"},
                {"slug": "cultural-cinema", "name": "Кінотеатр", "en": "Cinema", "kind": "specific"},
            ]},
            {"title": "Православні релігійні споруди", "icons": [
                {"slug": "church-orthodox", "name": "Православні релігійні споруди", "en": "Orthodox religious buildings", "kind": "general", "also": ["Православні храми"]},
                {"slug": "church-orthodox-monastery", "name": "Православні монастирі", "en": "Orthodox monasteries", "kind": "specific"},
            ]},
            {"title": "Католицькі і протестантські релігійні споруди", "icons": [
                {"slug": "church-catholic", "name": "Католицькі і протестантські релігійні споруди", "en": "Catholic and Protestant religious buildings", "kind": "general", "also": ["Костели, римо-католицькі храми"]},
                {"slug": "church-catholic-monastery", "name": "Римо-католицькі монастирі", "en": "Roman Catholic monasteries", "kind": "specific"},
                {"slug": "church-catholic-greek-church", "name": "Греко-католицькі храми", "en": "Greek Catholic churches", "kind": "specific"},
                {"slug": "church-catholic-greek-monastery", "name": "Греко-католицькі монастирі", "en": "Greek Catholic monasteries", "kind": "specific"},
            ]},
            {"title": "Юдейські релігійні споруди", "icons": [
                {"slug": "synagogue", "name": "Юдейські релігійні споруди", "en": "Jewish religious buildings", "kind": "general", "also": ["Синагоги"]},
            ]},
            {"title": "Ісламські релігійні споруди", "icons": [
                {"slug": "mosque", "name": "Ісламські релігійні споруди", "en": "Islamic religious buildings", "kind": "general", "also": ["Мечеть"]},
            ]},
            {"title": "Промислові споруди", "icons": [
                {"slug": "factory", "name": "Промислові споруди", "en": "Industrial buildings", "kind": "general"},
                {"slug": "factory-windmill", "name": "Вітряки", "en": "Windmills", "kind": "specific"},
            ]},
            {"title": "Цивільні будівлі", "icons": [
                {"slug": "civil", "name": "Цивільні будівлі", "en": "Civil buildings", "kind": "general"},
                {"slug": "civil-palace", "name": "Палаци", "en": "Palaces", "kind": "specific"},
                {"slug": "civil-homestead", "name": "Садиби, окремі історичні будинки", "en": "Manors and historic houses", "kind": "specific"},
                {"slug": "civil-historical-city", "name": "Старе місто, історична забудова", "en": "Old town, historic quarter", "kind": "specific"},
            ]},
            {"title": "Військові будівлі", "icons": [
                {"slug": "military", "name": "Військові будівлі", "en": "Military buildings", "kind": "general"},
                {"slug": "military-castle", "name": "Замки та форти", "en": "Castles and forts", "kind": "specific"},
            ]},
            {"title": "Розваги", "icons": [
                {"slug": "entertainment", "name": "Розваги", "en": "Entertainment", "kind": "general"},
                {"slug": "entertainment-attractions", "name": "Парки атракціонів", "en": "Amusement parks", "kind": "specific"},
            ]},
            {"title": "Пам’ятки флори", "icons": [
                {"slug": "flora", "name": "Пам’ятки флори", "en": "Flora", "kind": "general"},
                {"slug": "flora-citypark", "name": "Міські парки та сади", "en": "City parks and gardens", "kind": "specific"},
                {"slug": "flora-denropark", "name": "Дендропарки", "en": "Arboretums", "kind": "specific"},
                {"slug": "flora-forest", "name": "Лісопарки", "en": "Forest parks", "kind": "specific"},
            ]},
            {"title": "Пам’ятки фауни", "icons": [
                {"slug": "fauna", "name": "Пам’ятки фауни", "en": "Fauna", "kind": "general"},
                {"slug": "fauna-zoo", "name": "Зоопарки та звіринці", "en": "Zoos", "kind": "specific"},
                {"slug": "fauna-animal-in-nature", "name": "Звірі в дикій природі", "en": "Wildlife", "kind": "specific"},
            ]},
            {"title": "Земельні пам’ятки", "icons": [
                {"slug": "land-object", "name": "Земельні пам’ятки", "en": "Landforms", "kind": "general", "also": ["Гори, вершини, пагорби"]},
            ]},
            {"title": "Водні пам’ятки", "icons": [
                {"slug": "water-object", "name": "Водні пам’ятки", "en": "Water features", "kind": "general"},
                {"slug": "water-object-lake", "name": "Озера, ставки та затоплені кар’єри", "en": "Lakes, ponds and flooded quarries", "kind": "specific"},
            ]},
            {"title": "Оглядова точка", "icons": [
                {"slug": "viewpoint", "name": "Оглядова точка", "en": "Viewpoint", "kind": "general"},
            ]},
            {"title": "Точка інтересу", "icons": [
                {"slug": "default", "name": "Точка інтересу", "en": "Point of interest", "kind": "general"},
            ]},
        ],
    },
    {
        "id": "additional",
        "title": "ІІ. Додаткові піктограми",
        "groups": [
            {"title": "Всесвітня спадщина ЮНЕСКО", "icons": [
                {"slug": "UNESCO", "name": "Всесвітня спадщина ЮНЕСКО", "en": "UNESCO World Heritage", "kind": "badge"},
            ]},
            {"title": "Рекомендації ДАРТ", "icons": [
                {"slug": "dart-recommend", "name": "ДАРТ рекомендує", "en": "Recommended by DART", "kind": "badge"},
                {"slug": "dart-top100", "name": "ДАРТ ТОП-100", "en": "DART Top 100", "kind": "badge"},
                {"slug": "dart-top30", "name": "ДАРТ ТОП-30", "en": "DART Top 30", "kind": "badge"},
                {"slug": "dart-top10", "name": "ДАРТ ТОП-10", "en": "DART Top 10", "kind": "badge"},
            ]},
        ],
    },
    {
        "id": "services",
        "title": "ІІІ. Піктограми сервісів",
        "groups": [
            {"title": "Основні сервіси", "icons": [
                {"slug": "service-fuel", "name": "Автозаправна станція", "en": "Fuel station", "kind": "service"},
                {"slug": "service-charger", "name": "Електрозарядна станція", "en": "EV charging station", "kind": "service"},
                {"slug": "service-gas", "name": "Автозаправна газова станція", "en": "LPG station", "kind": "service"},
                {"slug": "service-sto", "name": "Пункт технічного обслуговування автомобілів", "en": "Car service", "kind": "service"},
                {"slug": "service-cafe", "name": "Ресторан", "en": "Restaurant", "kind": "service"},
                {"slug": "service-hotel", "name": "Готель", "en": "Hotel", "kind": "service"},
                {"slug": "service-camping", "name": "Кемпінг", "en": "Camping", "kind": "service"},
                {"slug": "service-child-zone", "name": "Дитяча зона", "en": "Children’s area", "kind": "service"},
            ]},
        ],
    },
]

KIND_LABEL = {
    "general": "Загальна піктограма",
    "specific": "Піктограма окремої категорії",
    "badge": "Додаткова позначка",
    "service": "Сервіс",
}


def all_icons():
    for section in SECTIONS:
        for group in section["groups"]:
            for icon in group["icons"]:
                yield section, group, icon


# --------------------------------------------------------------------------- copy & derive
def copy_sources(src: Path) -> None:
    for fmt in FORMATS:
        (OUT / fmt).mkdir(parents=True, exist_ok=True)
    (OUT / "all").mkdir(parents=True, exist_ok=True)

    missing = []
    for _, _, icon in all_icons():
        for fmt in FORMATS:
            source = src / fmt.upper() / f"{SRC_PREFIX}{icon['slug']}.{fmt}"
            if not source.exists():
                missing.append(str(source))
                continue
            shutil.copy2(source, OUT / fmt / f"{icon['slug']}.{fmt}")
    full = {
        "dwg": src / "DWG" / "Tourist Road Signs - Icons.dwg",
        "ai": src / "Tourist Road Signs - Icons.ai",
        "pdf": src / "Tourist Road Signs - Icons.pdf",
    }
    for ext, source in full.items():
        if source.exists():
            shutil.copy2(source, OUT / "all" / f"{FULL_SET_NAME}.{ext}")
        else:
            missing.append(str(source))

    # Anything in the source that the catalogue does not know about.
    known = {icon["slug"] for _, _, icon in all_icons()}
    for f in (src / "SVG").glob(f"{SRC_PREFIX}*.svg"):
        slug = f.stem[len(SRC_PREFIX):]
        if slug not in known:
            print(f"WARNING: not in catalogue: {slug}", file=sys.stderr)
    if missing:
        print("WARNING: missing source files:\n  " + "\n  ".join(missing), file=sys.stderr)


_STYLE_RE = re.compile(r"\.(cls-\d+)\{([^}]*)\}")
_RECT_RE = re.compile(r"<rect\b[^>]*/>|<rect\b[^>]*></rect>")


def transparent_svg(svg: str) -> str:
    """Remove the brown background rectangle (the bleed rect drawn behind every icon)."""
    brown_classes = {m.group(1) for m in _STYLE_RE.finditer(svg) if BROWN in m.group(2).lower()}

    def is_bg(rect: str) -> bool:
        cls = re.search(r'class="([^"]+)"', rect)
        if cls and cls.group(1) in brown_classes:
            return True
        return BROWN in rect.lower()

    out = _RECT_RE.sub(lambda m: "" if is_bg(m.group(0)) else m.group(0), svg)
    out = re.sub(r'<g id="bg">\s*</g>', "", out)
    return out


def derive_transparent() -> None:
    dst = OUT / "svg-transparent"
    dst.mkdir(parents=True, exist_ok=True)
    for _, _, icon in all_icons():
        path = OUT / "svg" / f"{icon['slug']}.svg"
        if not path.exists():
            continue
        svg = path.read_text(encoding="utf-8")
        out = transparent_svg(svg)
        if out == svg:
            print(f"WARNING: no background removed in {path.name}", file=sys.stderr)
        (dst / path.name).write_text(out, encoding="utf-8")


# --------------------------------------------------------------------------- zips
def build_zips() -> dict[str, str]:
    zdir = OUT / "zip"
    zdir.mkdir(parents=True, exist_ok=True)
    result = {}
    per_format = FORMATS + ["svg-transparent"]
    for fmt in per_format:
        name = f"{FULL_SET_NAME}-{fmt}.zip"
        with zipfile.ZipFile(zdir / name, "w", zipfile.ZIP_DEFLATED) as z:
            for f in sorted((OUT / fmt).iterdir()):
                z.write(f, f"{FULL_SET_NAME}/{fmt}/{f.name}")
        result[fmt] = f"icons/zip/{name}"
    name = f"{FULL_SET_NAME}-all.zip"
    with zipfile.ZipFile(zdir / name, "w", zipfile.ZIP_DEFLATED) as z:
        for fmt in per_format + ["all"]:
            for f in sorted((OUT / fmt).iterdir()):
                z.write(f, f"{FULL_SET_NAME}/{fmt}/{f.name}")
    result["all"] = f"icons/zip/{name}"
    return result


# --------------------------------------------------------------------------- json
def human_size(n: int) -> str:
    for unit in ("Б", "КБ", "МБ"):
        if n < 1024:
            return f"{n:.0f} {unit}"
        n /= 1024
    return f"{n:.1f} ГБ"


def write_json(zips: dict[str, str]) -> dict:
    data = {
        "version": "1.0",
        "formats": FORMATS + ["svg-transparent"],
        "zips": zips,
        "fullSet": {
            ext: f"icons/all/{FULL_SET_NAME}.{ext}"
            for ext in ("dwg", "ai", "pdf")
            if (OUT / "all" / f"{FULL_SET_NAME}.{ext}").exists()
        },
        "sections": [],
    }
    for section in SECTIONS:
        s = {"id": section["id"], "title": section["title"], "groups": []}
        for group in section["groups"]:
            g = {"title": group["title"], "icons": []}
            for icon in group["icons"]:
                files = {}
                for fmt in FORMATS + ["svg-transparent"]:
                    ext = "svg" if fmt == "svg-transparent" else fmt
                    p = OUT / fmt / f"{icon['slug']}.{ext}"
                    if p.exists():
                        files[fmt] = {"path": f"icons/{fmt}/{p.name}", "size": p.stat().st_size}
                g["icons"].append({**icon, "files": files})
            s["groups"].append(g)
        data["sections"].append(s)
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    return data


# --------------------------------------------------------------------------- markdown
def slugify_group(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower().translate(str.maketrans({
        "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e", "є": "ie", "ж": "zh", "з": "z",
        "и": "y", "і": "i", "ї": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p",
        "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
        "ь": "", "ю": "iu", "я": "ia", "’": "", "'": "",
    }))).strip("-")


def card_html(icon: dict) -> str:
    slug = icon["slug"]
    files = icon["files"]
    name = icon["name"]
    also = f'<p class="icon-card__also">{", ".join(icon["also"])}</p>' if icon.get("also") else ""
    links = "".join(
        f'<a class="icon-dl" href="{files[fmt]["path"]}" download="{slug}.{"svg" if fmt == "svg-transparent" else fmt}" '
        f'title="{human_size(files[fmt]["size"])}">{"SVG без тла" if fmt == "svg-transparent" else fmt.upper()}</a>'
        for fmt in FORMATS + ["svg-transparent"] if fmt in files
    )
    search = " ".join([name, icon.get("en", ""), slug] + icon.get("also", [])).lower()
    return (
        f'<div class="icon-card icon-card--{icon["kind"]}" data-slug="{slug}" data-search="{search}">\n'
        f'  <div class="icon-card__preview"><img src="{files["svg"]["path"]}" alt="{name}" loading="lazy"></div>\n'
        f'  <div class="icon-card__body">\n'
        f'    <p class="icon-card__kind">{KIND_LABEL[icon["kind"]]}</p>\n'
        f'    <h4 class="icon-card__name">{name}</h4>\n'
        f'    <p class="icon-card__en">{icon.get("en", "")}</p>\n'
        f'    {also}\n'
        f'    <div class="icon-card__actions">{links}<button type="button" class="icon-copy" data-src="{files["svg"]["path"]}">Копіювати SVG</button></div>\n'
        f'  </div>\n'
        f'</div>'
    )


def markdown_block(data: dict) -> str:
    parts = []
    zips = data["zips"]
    full = data["fullSet"]
    parts.append('<div class="icon-toolbar">')
    parts.append('  <input type="search" id="icon-search" class="icon-search" placeholder="Знайти піктограму…" aria-label="Пошук піктограми">')
    parts.append('  <div class="icon-toolbar__downloads">')
    parts.append(f'    <a class="button" href="{zips["all"]}" download>Завантажити все (ZIP)</a>')
    for fmt in FORMATS + ["svg-transparent"]:
        label = "SVG без тла" if fmt == "svg-transparent" else fmt.upper()
        parts.append(f'    <a class="button button-secondary" href="{zips[fmt]}" download>{label}</a>')
    for ext, path in full.items():
        parts.append(f'    <a class="button button-secondary" href="{path}" download>Весь набір {ext.upper()}</a>')
    parts.append('  </div>')
    parts.append('</div>')
    parts.append('<p class="icon-empty" hidden>Нічого не знайшли. Спробуйте іншу назву або англійський відповідник.</p>')
    parts.append("")
    for section in data["sections"]:
        parts.append(f'## {section["title"]} :id={section["id"]}')
        parts.append("")
        for group in section["groups"]:
            gid = slugify_group(group["title"])
            parts.append(f'<div class="icon-group" data-group="{gid}">')
            parts.append(f'<h3 class="icon-group__title" id="g-{gid}">{group["title"]}</h3>')
            parts.append('<div class="icon-grid">')
            for icon in group["icons"]:
                parts.append(card_html(icon))
            parts.append('</div>')
            parts.append('</div>')
            parts.append("")
    return "\n".join(parts)


def write_markdown(data: dict) -> None:
    start, end = "<!-- icons:start -->", "<!-- icons:end -->"
    text = APPENDIX.read_text(encoding="utf-8") if APPENDIX.exists() else ""
    block = f"{start}\n{markdown_block(data)}\n{end}"
    if start in text and end in text:
        text = text[: text.index(start)] + block + text[text.index(end) + len(end):]
    else:
        text = text.rstrip() + "\n\n" + block + "\n"
    APPENDIX.write_text(text, encoding="utf-8")


# --------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--no-copy", action="store_true")
    args = ap.parse_args()

    if not args.no_copy:
        src = Path(args.src)
        if not src.exists():
            sys.exit(f"source folder not found: {src}")
        copy_sources(src)
    derive_transparent()
    zips = build_zips()
    data = write_json(zips)
    write_markdown(data)
    n = sum(len(g["icons"]) for s in data["sections"] for g in s["groups"])
    print(f"ok: {n} icons, json → {DATA.relative_to(ROOT)}, markdown → {APPENDIX.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
