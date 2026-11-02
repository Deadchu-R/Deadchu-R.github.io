"""Loads the site's content from content/*.json (edited in Pages CMS) and prepares any newly
uploaded media, then exposes the same data structures build.py has always used.

Uploads land in assets/uploads/. On build they are converted into the folders the site uses:
  screenshots / covers -> assets/img/<name>.jpg (+ -s.jpg small copy)
  characters / cards   -> assets/art/<name>.webp
  clips                -> assets/clips/<name>.mp4 (+ poster in assets/posters/)
  full videos          -> assets/full/<name>.mp4 (+ poster)
"""
import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
C = ROOT / "content"


def _load(name):
    return json.loads((C / name).read_text())


def _slug(s):
    return re.sub(r"[^a-z0-9]+", "-", Path(s).stem.lower()).strip("-") or "file"


def _src(path):
    return ROOT / str(path).lstrip("/")


def _ffmpeg(*args):
    if shutil.which("ffmpeg") is None:
        print("  ! ffmpeg not found, skipping", args[-1])
        return False
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", *map(str, args)], check=True)
    return True


def image_key(path):
    """Cover or screenshot -> key used by thumb(): assets/img/<key>.jpg and <key>-s.jpg."""
    path = str(path or "")
    if path.startswith("drive:"):
        return path[6:]
    if not path:
        return ""
    src = _src(path)
    if src.parent == ROOT / "assets/img" and src.suffix == ".jpg":
        key = src.stem
    else:
        key = _slug(path)
    big, small = ROOT / f"assets/img/{key}.jpg", ROOT / f"assets/img/{key}-s.jpg"
    if (not big.exists() or not small.exists()) and src.exists():
        from PIL import Image
        im = Image.open(src).convert("RGB")
        if not big.exists():
            b = im.copy(); b.thumbnail((1600, 1600)); b.save(big, quality=84, optimize=True)
        s = im.copy(); s.thumbnail((900, 900)); s.save(small, quality=80, optimize=True)
        print("  + image", key)
    return key


def art_key(path):
    """Character / card art -> assets/art/<key>.webp."""
    path = str(path or "")
    if not path:
        return ""
    src = _src(path)
    if src.parent == ROOT / "assets/art" and src.suffix == ".webp":
        return src.stem
    key = _slug(path)
    out = ROOT / f"assets/art/{key}.webp"
    if not out.exists() and src.exists():
        from PIL import Image
        im = Image.open(src)
        im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
        im.thumbnail((900, 900)); im.save(out, quality=86)
        print("  + art", key)
    return key


def clip_file(path):
    """Short clip -> file name in assets/clips (compressed, muted) with a poster."""
    path = str(path or "")
    if not path:
        return ""
    src = _src(path)
    if src.parent == ROOT / "assets/clips":
        name = src.name
    else:
        name = _slug(path) + ".mp4"
        out = ROOT / "assets/clips" / name
        if not out.exists() and src.exists():
            _ffmpeg("-i", src, "-an", "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-crf", "27",
                    "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out)
            print("  + clip", name)
    poster = ROOT / "assets/posters" / name.replace(".mp4", ".jpg")
    clip = ROOT / "assets/clips" / name
    if not poster.exists() and clip.exists():
        _ffmpeg("-ss", "1", "-i", clip, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "4", poster)
    return name


def full_video(path):
    """Full gameplay video -> name in assets/full (compressed, with sound) with a poster."""
    path = str(path or "")
    if not path:
        return ""
    src = _src(path)
    if src.parent == ROOT / "assets/full":
        name = src.stem
    else:
        name = _slug(path)
        out = ROOT / f"assets/full/{name}.mp4"
        if not out.exists() and src.exists():
            _ffmpeg("-i", src, "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-crf", "28", "-preset", "veryfast",
                    "-c:a", "aac", "-b:a", "96k", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out)
            print("  + full video", name)
    poster = ROOT / f"assets/posters/full-{name}.jpg"
    vid = ROOT / f"assets/full/{name}.mp4"
    if not poster.exists() and vid.exists():
        _ffmpeg("-ss", "3", "-i", vid, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "4", poster)
    return name


def _clip_tuple(c):
    f = clip_file(c.get("video"))
    return (c.get("label", ""), c.get("caption", ""), f, c.get("drive_id", "") or "")


def _write_snippet(name, code):
    (ROOT / "snippets").mkdir(exist_ok=True)
    p = ROOT / "snippets" / name
    if not p.exists() or p.read_text() != code:
        p.write_text(code)
    return f"snippets/{name}"


# ---------------------------------------------------------------- site
_site = _load("site.json")
SITE = {
    "name": _site["name"], "email": _site["email"], "phone": _site["phone"], "linkedin": _site["linkedin"],
    "github": "",
}
FULL = {}  # key passed to play_attrs -> file name in assets/full
_sr = full_video(_site.get("showreel_video"))
SITE["showreel"] = _site.get("showreel_drive_id") or _site.get("showreel_video")
if _sr:
    FULL[SITE["showreel"]] = _sr
SITE_TEXT = _site
ABOUT = _load("about.json")

# ---------------------------------------------------------------- projects (list order = site order)
PROJECTS, TECH, CARD_TECH, CARD_ROLE = [], {}, {}, {}
SHOT_CAPS, CAST_CAPS, ART_NOTES, NEXT_CARD, SNIPPETS = {}, {}, {}, {}, {}
ART_CREDIT_SLUGS, TEAM_BUILT = set(), set()
for p in _load("projects.json"):
    s = p["slug"]
    shots, shot_idx = [], []
    for j, sh in enumerate(p.get("screenshots", [])):
        k = image_key(sh.get("image"))
        if k:
            shots.append(k); shot_idx.append(j)
            SHOT_CAPS[k] = sh.get("caption", "")
    cast, cast_idx = [], []
    for j, ch in enumerate(p.get("characters", [])):
        k = art_key(ch.get("image"))
        if k:
            cast.append((k, ch.get("name", ""))); cast_idx.append(j)
            CAST_CAPS[k] = ch.get("caption", "")
    full_key = ""
    fv = full_video(p.get("full_video"))
    if fv or p.get("full_video_drive_id"):
        full_key = p.get("full_video_drive_id") or p.get("full_video")
        if fv:
            FULL[full_key] = fv
    PROJECTS.append(dict(
        slug=s, title=p["title"], sub=p.get("subtitle", ""), engine=p.get("engine", ""), role=p.get("role", ""),
        when=p.get("when", ""), context=p.get("context", ""),
        theme=(p.get("color_deep", "#0c2f6e"), p.get("color_main", "#1758b0"), p.get("color_accent", "#ffd23f")),
        cover=image_key(p.get("cover")), mascot=art_key(p.get("mascot")) or None,
        hook=p.get("hook", ""), about=p.get("about", []), did=p.get("what_i_built", []), did_team=p.get("teammates_built", []),
        sections=[(sec.get("title", ""), sec.get("intro", ""), [_clip_tuple(c) for c in sec.get("clips", [])])
                  for sec in p.get("sections", [])],
        full=full_key or None, shots=shots, cast=cast, shot_idx=shot_idx, cast_idx=cast_idx,
        layouts=[sec.get("layout", "auto") for sec in p.get("sections", [])], page_order=p.get("page_order", []),
    ))
    TECH[s] = p.get("tech", [])
    CARD_TECH[s] = p.get("card_tech", "")
    CARD_ROLE[s] = p.get("card_role", "")
    if p.get("teammates_built"):
        TEAM_BUILT.add(s)
    if p.get("team_art"):
        ART_CREDIT_SLUGS.add(s)
    if p.get("credits"):
        ART_NOTES[s] = p["credits"]
    nk = art_key(p.get("next_card_image"))
    if nk:
        NEXT_CARD[s] = nk
    cs = p.get("code_sample") or {}
    if (cs.get("code") or "").strip():
        SNIPPETS[s] = (cs.get("file_label", ""), "", _write_snippet(f"{s}.cs", cs["code"]))

# ---------------------------------------------------------------- code pages
CODE_PAGES = []
for cp in _load("code-pages.json"):
    _cs = [(i, c) for i, c in enumerate(cp.get("code", [])) if (c.get("code") or "").strip()]
    codes = [(c.get("file_label", ""), _write_snippet(f"{cp['slug']}-{i + 1}.txt", c.get("code", ""))) for i, c in _cs]
    CODE_PAGES.append(dict(
        slug=cp["slug"], title=cp["title"], sub=cp.get("subtitle", ""), lang=cp.get("language", ""), role=cp.get("role", ""),
        when=cp.get("when", ""), context=cp.get("context", ""),
        theme=(cp.get("color_deep", "#0f1f2e"), cp.get("color_main", "#1f4f6e"), cp.get("color_accent", "#7fd1ff")),
        hook=cp.get("hook", ""), did=cp.get("what_i_built", []), tech=cp.get("tech", []),
        flow=[(f.get("name", ""), f.get("note", "")) for f in cp.get("flow", [])],
        clip=_clip_tuple(cp["clip"]) if cp.get("clip") and cp["clip"].get("video") else None,
        code=codes, code_idx=[i for i, _ in _cs], page_order=cp.get("page_order", []),
    ))

# ---------------------------------------------------------------- lab + early work
LAB = [(c.get("label", ""), clip_file(c.get("video")), c.get("drive_id", "") or "", c.get("caption", "")) for c in _load("lab.json")]
EARLY = [(c.get("label", ""), clip_file(c.get("video")), c.get("drive_id", "") or "", c.get("caption", "")) for c in _load("early-work.json")]
