"""Import the supplied OSF pictures and read-only pull norms; preserve legacy IDs.

Run with Python containing Pillow and openpyxl. Does not alter the source archive.
"""
import json
import re
from pathlib import Path

import openpyxl
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "assets/pqckn-osfstorage-archive"
CATALOG = ROOT / "web/stimuli.json"
CLASSIC_IDS = {name: f"c{i:02}" for i, name in enumerate((
    "applause", "architect at desk", "beachcombers", "bicycle race", "boxer",
    "burglars", "couple by river", "couple sitting opposite a woman",
    "girfriends in cafe with male approaching", "kennedy nixon", "lacrosse duel",
    "men on ship", "neymar & marcelo", "nightclub scene", "ship captain",
    "sorrow", "trapeze artists", "women in laboratory",
), 1)}  # Permanent identities: adding a file must never renumber saved drafts.
TITLE_ZH = {  # Chinese display titles for the credits, translated from the database names.
    "applause": "鼓掌",
    "architect at desk": "伏案建築師",
    "beachcombers": "海灘拾荒者",
    "bicycle race": "單車比賽",
    "boxer": "拳手",
    "burglars": "竊賊",
    "couple by river": "河畔情侶",
    "couple sitting opposite a woman": "情侶與對座女子",
    "girfriends in cafe with male approaching": "咖啡店女伴，男子走近",
    "kennedy nixon": "甘迺迪與尼克遜",
    "lacrosse duel": "長曲棍球對決",
    "men on ship": "船上男子",
    "neymar & marcelo": "尼馬與馬些路",
    "nightclub scene": "夜店一幕",
    "ship captain": "船長",
    "sorrow": "哀傷",
    "trapeze artists": "空中飛人",
    "women in laboratory": "實驗室女士",
}


def main():
    workbook = openpyxl.load_workbook(
        ARCHIVE / "picture_pull_norm_table.xlsx", read_only=True, data_only=True)
    sheet = workbook.active
    # The supplied file declares A1 only and references a missing drawing. Read
    # streaming cell data with dimensions reset, leaving the original untouched.
    sheet.reset_dimensions()
    rows = list(sheet.values)
    norms = {row[0]: (i, dict(zip(rows[0], row))) for i, row in enumerate(rows[1:], 2)}
    workbook.close()
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    legacy = {p["pse_id"]: p for p in catalog["pictures"] if p["id"].startswith("p")}
    pictures = []
    for folder, prefix in [("classic images", "c"), ("new images", "n")]:
        for source in sorted((ARCHIVE / folder).iterdir()):
            name = source.stem
            pid = CLASSIC_IDS[name] if prefix == "c" else f"n{int(name[6:]):02}"
            old = legacy.get(name)
            picture = dict(old) if old else {
                "id": pid, "pse_id": name, "file": f"stimuli/{pid}.jpg",
                "title": name, "author": "See OSF source collection",
                "source_url": "https://osf.io/pqckn/",
                "license": "Not individually verified; supplied for this private internal exercise",
                "license_url": None, "modified": True,
            }
            if not old:
                with Image.open(source) as raw:
                    image = ImageOps.exif_transpose(raw).convert("RGB")
                    image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
                    image.save(ROOT / "web" / picture["file"], quality=88, optimize=True)
                    picture["width"], picture["height"] = image.size
            if name in TITLE_ZH:
                picture["title_zh"] = TITLE_ZH[name]
            picture["archive_file"] = source.relative_to(ARCHIVE).as_posix()
            norm_id = re.sub(r"newpic0+(\d+)", r"newpic\1", name)
            if name == "burglars":
                norm_id = "burglar"  # singular label in the supplied workbook
            if norm_id in norms:
                row, values = norms[norm_id]
                picture["pull"] = {
                    "aff": values["aff.mean"], "ach": values["ach.mean"],
                    "pow": values["pow.mean"],
                    "words": values["wc.mean"], "sentences": values["sc.mean"],
                    "n_stories": values["n.stories"],
                    "norm_id": norm_id, "source_range": f"'Sheet 1'!A{row}:P{row}",
                }
            else:
                picture["pull"] = None  # do not guess a TAT identity from its title
            pictures.append(picture)
    catalog.update({
        "note": "Private internal exercise. Bookclub uses four fixed classical pictures; random mode uses all 48 archive pictures. Legacy p1-p9 images and IDs preserved for draft compatibility. New imports resized without cropping to at most 1200px and recompressed.",
        "collection": "PSE picture database, Schönbrodt et al. (2020/2021), https://osf.io/pqckn/",
        "pull_source": "picture_pull_norm_table.xlsx, Sheet 1, supplied OSF archive",
        "pull_note": "German expert-coded (Winter 1994, sentence level) mean motive imagery per story, with mean words and sentences per story, from picture_pull_norm_table.xlsx. Used as a rough, length-adjusted reference (images per 1,000 words), never as participant norms. Sample sizes differ. Null means no verified row match.",
        "pictures": sorted(pictures, key=lambda p: (0 if p["id"].startswith("p") else 1, p["id"])),
    })
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(pictures)} pictures; {sum(p['pull'] is not None for p in pictures)} norm matches.")


if __name__ == "__main__":
    main()
