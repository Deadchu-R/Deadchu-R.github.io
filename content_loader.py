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


def _poster(video, out, at, scale="scale=960:-2"):
    """First frame worth showing; short clips and GIFs fall back to the very first frame."""
    for t in (at, 0):
        _ffmpeg("-ss", str(t), "-i", video, "-frames:v", "1", "-vf", scale, "-q:v", "4", out)
        if out.exists():
            return


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


def icon_file(path):
    """Uploaded icon (image or GIF) -> web path of a small square-fit copy in assets/icons (GIFs stay animated)."""
    path = str(path or "")
    src = _src(path)
    if src.parent == ROOT / "assets/icons":
        return "/" + str(src.relative_to(ROOT))
    if not src.exists():
        return ""
    from PIL import Image, ImageSequence
    out_dir = ROOT / "assets/icons"; out_dir.mkdir(exist_ok=True)
    im = Image.open(src)
    if getattr(im, "is_animated", False):
        out = out_dir / (_slug(path) + ".gif")
        if not out.exists():
            frames = []
            for fr in ImageSequence.Iterator(im):
                f = fr.convert("RGBA"); f.thumbnail((128, 128)); frames.append(f)
            frames[0].save(out, save_all=True, append_images=frames[1:], loop=0, disposal=2,
                           duration=im.info.get("duration", 100))
            print("  + icon", out.name)
    else:
        out = out_dir / (_slug(path) + ".png")
        if not out.exists():
            f = im.convert("RGBA"); f.thumbnail((128, 128)); f.save(out, optimize=True)
            print("  + icon", out.name)
    return "/" + str(out.relative_to(ROOT))


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
        _poster(clip, poster, 1)
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
        _poster(vid, poster, 3)
    return name


POSTERS = {}  # clip file -> image key of a thumbnail the owner picked


def _clip_tuple(c):
    f = clip_file(c.get("video"))
    if c.get("poster") and f:
        POSTERS[f] = image_key(c["poster"])
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
# fields added for the visual editor; old content versions without them still build the same page
SITE_DEFAULTS = {
    "showreel_label": "▶ Watch showreel",
    "hero_buttons": [
        {"label": "Experience", "link": "#now", "icon": "brief", "color": "#38b6ff"},
        {"label": "Projects", "link": "#projects", "icon": "pad", "color": "#ffd23f"},
        {"label": "More code", "link": "#more-code", "icon": "code", "color": "#9be15d"},
    ],
    "headings": {
        "experience": {"title": "Experience", "icon": "brief", "color": "#38b6ff"},
        "projects": {"title": "Projects", "icon": "pad", "color": "#ffd23f"},
        "more_code": {"title": "More code", "icon": "code", "color": "#9be15d"},
        "about": {"title": "Get to know me", "icon": "user", "color": "#ff9f5a"},
        "gallery_lab": {"title": "Gallery & lab", "icon": "", "color": "#ff8fc0"},
    },
    "gallery_lab_text": "Every clip, screenshot and character in one place, plus shaders, mini-games and other things I built to learn how they work.",
    "gallery_lab_buttons": [
        {"label": "Open the gallery →", "link": "gallery.html", "style": "solid"},
        {"label": "The lab", "link": "lab.html", "style": "ghost"},
    ],
    "footer_title": "Let's make games together",
    "footer_text": "Open to Unity and Unreal developer roles in Israel.",
    "footer_buttons": [
        {"label": "Email me", "link": "mailto:" + _site["email"], "style": "solid"},
        {"label": "LinkedIn", "link": _site["linkedin"], "style": "ghost"},
        {"label": "CV", "link": "cv.html", "style": "ghost"},
    ],
    "footer_peek": "/assets/art/musical-cat.webp",
    "hero_title": _site.get("name", "Roee Tal"),
    "sound": {"enabled": False, "start": False, "music": "", "mv": 40, "click": "soft", "cv": 50},
    "nav": [
        {"label": "Projects", "link": "index.html#projects", "icon": ""},
        {"label": "Gallery", "link": "gallery.html", "icon": ""},
        {"label": "Lab", "link": "lab.html", "icon": ""},
        {"label": "CV", "link": "cv.html", "icon": ""},
        {"label": "Contact", "link": "index.html#contact", "icon": ""},
    ],
    "job_tools": [
        {"label": "Unreal Engine 5", "icon": "unreal"},
        {"label": "Blueprints", "icon": "blueprints"},
        {"label": "Cesium for Unreal", "icon": "cesium"},
    ],
    "ui": {},
    "section_buttons": {k: {"position": "bottom", "align": "left", "items": []} for k in ("experience", "projects", "more_code", "about")},
    "hero_video": "/assets/hero.mp4",
    "hero_video_mobile": "/assets/hero-m.mp4",
}
for _k, _v in SITE_DEFAULTS.items():
    if _k not in _site:
        _site[_k] = _v
    elif isinstance(_v, dict):
        for _kk, _vv in _v.items():
            _site[_k].setdefault(_kk, _vv)
            if isinstance(_vv, dict):
                for _a, _b in _vv.items():
                    _site[_k][_kk].setdefault(_a, _b)


def bg_video(path, tall=False):
    """Background loop (no sound) -> web path of an mp4 with a .jpg poster beside it, or ''."""
    path = str(path or "")
    if not path:
        return ""
    src = _src(path)
    if src.parent == ROOT / "assets" and src.suffix == ".mp4":
        out = src
    else:
        out = ROOT / "assets/bg" / (_slug(path) + ".mp4")
        out.parent.mkdir(exist_ok=True)
        if not out.exists() and src.exists():
            scale = "scale=-2:'min(1280,ih)'" if tall else "scale='min(1600,iw)':-2"
            _ffmpeg("-i", src, "-an", "-t", "40", "-vf", scale, "-c:v", "libx264", "-crf", "28", "-preset", "veryfast",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out)
            print("  + background video", out.name)
    poster = out.with_suffix(".jpg")
    if out.exists() and not poster.exists():
        _poster(out, poster, 1, "scale='min(1280,iw)':-2")
    return str(out.relative_to(ROOT)) if out.exists() else ""


SITE_TEXT = _site
SITE_TEXT["_hero_wide"] = bg_video(_site.get("hero_video"))
SITE_TEXT["_hero_tall"] = bg_video(_site.get("hero_video_mobile"), tall=True) or SITE_TEXT["_hero_wide"]
SITE_TEXT["_peek"] = art_key(_site.get("footer_peek"))


def audio_file(path):
    """Uploaded sound -> /assets/audio/<name>.mp3 (compressed), or '' if missing."""
    path = str(path or "")
    if not path.startswith("/"):
        return ""
    src = _src(path)
    if src.parent == ROOT / "assets/audio":
        return "/" + str(src.relative_to(ROOT))
    out = ROOT / "assets/audio" / (_slug(path) + ".mp3")
    out.parent.mkdir(exist_ok=True)
    if not out.exists() and src.exists():
        _ffmpeg("-i", src, "-vn", "-c:a", "libmp3lame", "-b:a", "128k", out)
        print("  + sound", out.name)
    return "/" + str(out.relative_to(ROOT)) if out.exists() else ""


_snd = _site.get("sound") or {}
SITE_TEXT["_sound"] = None
if _snd.get("enabled"):
    _click = _snd.get("click") or "none"
    SITE_TEXT["_sound"] = {
        "music": audio_file(_snd.get("music")), "mv": round(float(_snd.get("mv", 40) or 0) / 100, 2),
        "click": audio_file(_click) if str(_click).startswith("/") else _click, "cv": round(float(_snd.get("cv", 50) or 0) / 100, 2),
        "start": bool(_snd.get("start")),
    }
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
        sec_icons=[sec.get("icon", "") for sec in p.get("sections", [])],
        buttons=p.get("buttons") or {},
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
        code=codes, code_idx=[i for i, _ in _cs], cover=image_key(cp.get("cover")) if cp.get("cover") else "", page_order=cp.get("page_order", []), buttons=cp.get("buttons") or {},
    ))

# ---------------------------------------------------------------- lab + early work
def _lab(c):
    lbl, cap, f, d = _clip_tuple(c)
    return (lbl, f, d, cap)
LAB = [_lab(c) for c in _load("lab.json")]
EARLY = [_lab(c) for c in _load("early-work.json")]

# media the owner can swap: the Blueprint illustration, the lab header
def _media(path):
    """Image -> ('img', key); video or GIF -> ('video', web path); nothing -> ('', '')."""
    path = str(path or "")
    if not path:
        return ("", "")
    if path.lower().rsplit(".", 1)[-1] in ("mp4", "mov", "webm", "m4v", "gif"):
        v = bg_video(path)
        return ("video", v) if v else ("", "")
    return ("img", image_key(path))
SITE_TEXT["_bp"] = _media(_site.get("bp_media"))
SITE_TEXT["_lab_cover"] = image_key(_site.get("lab_cover")) if _site.get("lab_cover") else ""
# sections the owner adds himself (keyed by id so deleting one never shifts the others)
SITE_TEXT["_custom"] = {cid: dict(c, _media=_media(c.get("media"))) for cid, c in (_site.get("custom_sections") or {}).items() if isinstance(c, dict)}
