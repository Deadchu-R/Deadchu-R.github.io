#!/usr/bin/env python3
"""Builds the static site from content/*.json (edited in Pages CMS, see .pages.yml).

Run:  python3 build.py   (the GitHub Action runs it on every push)
New uploads in assets/uploads are converted by content_loader.py.
"""
from html import escape as e
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).parent

from content_loader import (SITE, SITE_TEXT, ABOUT, FULL, PROJECTS, TECH, CARD_TECH, CARD_ROLE, TEAM_BUILT,
    SHOT_CAPS, CAST_CAPS, ART_CREDIT_SLUGS, ART_NOTES, NEXT_CARD, SNIPPETS, CODE_PAGES, LAB, EARLY, POSTERS)

DEPTH = 0  # set per page so local asset paths resolve

# ---- visual-editor markers (assets/edit.js reads these; visitors never load the editor)
import json as _json
def E(path, ph=""):
    """Editable text bound to a content field, e.g. E('site:hero_lead')."""
    return f' data-e="{path}"' + (f' data-ph="{e(ph)}"' if ph else "")
def L(path):
    """Container of a reorderable list (items carry data-i)."""
    return f' data-l="{path}"'
def I(i):
    """Marker: the item's index inside its list (the editor renumbers these when items move)."""
    return f' data-i="{i}"'
def M(path, kind="image"):
    """Replaceable media: kind image | art | video."""
    return f' data-m="{path}" data-mk="{kind}"'
def X(*fields):
    """Extra settings shown in edit mode: (label, path, type[, options])."""
    return f' data-x="{e(_json.dumps([list(f) for f in fields]))}"'
def K(key, order_path):
    """A block whose position is stored in a page-order list."""
    return f' data-k="{key}" data-ok="{order_path}"'
def ICO(path):
    """Icon container that the editor can swap live."""
    return f' data-ico="{path}"'
def BG(*paths):
    """Background media the editor previews when replaced."""
    return f' data-bg="{" ".join(paths)}"'
def href(link, depth):
    """Turn a link from the content into a page-relative href. Absolute URLs, mailto:, tel: and #anchors pass through; site paths get '../' * depth."""
    link = link or ""
    if re.match(r"^(https?:|mailto:|tel:|#)", link):
        return link
    return "../" * depth + link.lstrip("/")
def ext(link):
    """Attributes that open external links and PDFs in a new tab."""
    return ' target="_blank" rel="noopener"' if re.match(r"^https?:", link or "") or (link or "").endswith(".pdf") else ""
def ADD(path, tpl="btn"):
    """Lets the editor's + add a new item to this list."""
    return f' data-add="{path}" data-tpl="{tpl}"'
def xrow(base, cfg, depth, extra_cls=""):
    """A row of small buttons the owner can add anywhere with + in the editor."""
    items = cfg.get("items") or []
    align = cfg.get("align") or "left"
    x = X(("Where", base + ".position", "select", ["top", "bottom"]), ("Align", base + ".align", "select", ["left", "center", "right"])) if extra_cls != "blk" else X(("Align", base + ".align", "select", ["left", "center", "right"]))
    return (f'<div class="xrow al-{align}{" " + extra_cls if extra_cls else ""}"{L(base + ".items")}{x}>'
            + btn_list(base + ".items", items, depth, lambda b: "btn small" + (" ghost" if b.get("style", "ghost") == "ghost" else "")) + '</div>')
def colors(base):
    """Settings fields (for X()) for a project's three theme colors: main, dark and accent."""
    return (("Main color", f"{base}.color_main", "color"), ("Dark color", f"{base}.color_deep", "color"), ("Accent color", f"{base}.color_accent", "color"))


def thumb(i, w=1280):
    """URL of a screenshot by its image key: the local copy in assets/img (small '-s' version when w <= 900), else a Google Drive thumbnail."""
    small = w <= 900
    name = f"{i}-s.jpg" if small else f"{i}.jpg"
    if (ROOT / "assets/img" / name).exists():
        return "../" * DEPTH + "assets/img/" + name
    return f"https://drive.google.com/thumbnail?id={i}&sz=w{w}"


ART_CREDIT = "Art and animation by the team's artists. I'm not an artist: my part was the code and game design."
ART_CREDIT_SHORT = "Art by the team's artists, not by me."
def credit_attr(slug):
    """data-credit attribute for clips whose art was made by teammates (shown in the video viewer)."""
    return f' data-credit="{e(ART_CREDIT_SHORT)}"' if slug in ART_CREDIT_SLUGS else ""

def play_attrs(drive_id, title, cap="The full gameplay video."):
    """Attributes for a button that opens a full video: local file if present, Drive otherwise."""
    name = FULL.get(drive_id)
    src = ""
    if name and (ROOT / "assets/full" / f"{name}.mp4").exists():
        src = "../" * DEPTH + f"assets/full/{name}.mp4"
    return f'data-play-drive="{drive_id}" data-src="{src}" data-title="{e(title)}" data-cap="{e(cap)}"'



def has_clip(f):
    """True when the self-hosted clip file exists in assets/clips."""
    return (ROOT / "assets/clips" / f).exists()


WAVE = '<svg class="wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40 C 240 90 480 0 720 34 S 1200 80 1440 30 V80 H0Z"/></svg>'


def ver(path):
    """Short content hash so browsers fetch new CSS/JS right after an update."""
    return hashlib.md5((ROOT / path).read_bytes()).hexdigest()[:8]


SKINS = ["classic", "arcade", "sketchbook", "hobbies", "plain", "apple", "valley"]   # site styles, picked in the editor (⋯ › Site style)
SKIN = SITE_TEXT.get("skin") if SITE_TEXT.get("skin") in SKINS else "classic"
def skin_css(p):
    """<link> for the active site style's stylesheet (assets/skins/<SKIN>.css); nothing for the Classic style."""
    return f'\n<link rel="stylesheet" href="{p}assets/skins/{SKIN}.css?v={ver("assets/skins/" + SKIN + ".css")}" id="skin-css">' if SKIN != "classic" else ""
def skin_js(p):
    """<script> tags for the active site style: the readability guard (guard.js) plus the style's own script if it has one."""
    f = ROOT / "assets/skins" / (SKIN + ".js")
    if SKIN == "classic":
        return ""
    g = f'<script src="{p}assets/skins/guard.js?v={ver("assets/skins/guard.js")}" defer></script>\n'
    return g + (f'<script src="{p}assets/skins/{SKIN}.js?v={ver("assets/skins/" + SKIN + ".js")}" defer></script>\n' if f.exists() else "")

def head(title, desc, depth, theme=None):
    """Start of every page: <head> with title, description, fonts, site.css (+ style css, + owner's custom CSS) and optional theme colors."""
    p = "../" * depth
    style = ""
    if theme:
        style = f'<style>:root{{--deep:{theme[0]};--mid:{theme[1]};--accent:{theme[2]}}}</style>'
    return f"""<!doctype html>
<html lang="en" data-skin="{SKIN}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="{theme[0] if theme else '#0c2f6e'}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600;800;900&family=Roboto:ital,wght@0,400;0,700;1,400&display=swap">
<link rel="stylesheet" href="{p}assets/site.css?v={ver('assets/site.css')}">{skin_css(p)}{('<style id="custom-css">' + SITE_TEXT["custom_css"].replace("</", "<\\/") + '</style>') if SITE_TEXT.get("custom_css") else ""}
{style}
</head>
<body>
"""


def brand_photo(p):
    """Optional small round photo before the name in the top bar (chosen in the editor)."""
    ph = SITE_TEXT.get("brand_photo") or ""
    if ph:
        return f'<img class="mark-ava" src="{p}{e(ph.lstrip("/"))}" alt="" width="30" height="30" data-m="site:brand_photo" data-mk="image">'
    return '<span role="button" class="mark-ava rt-pick add" data-m="site:brand_photo" data-mk="image" data-cls="mark-ava" hidden data-edit-show title="Add your photo">＋</span>'

def topbar(depth, current=""):
    """The top bar on every page: name (home link, optional small photo), the edit pencil, and the menu links from site:nav."""
    p = "../" * depth
    cur_map = {"projects": "#projects", "gallery": "gallery.html", "lab": "lab.html"}
    links = []
    for i, n in enumerate(SITE_TEXT["nav"]):
        np_ = f"site:nav.{i}"
        cur = ' aria-current="page"' if current and cur_map.get(current, "@@") in n["link"] else ""
        links.append(f'<a href="{href(n["link"], depth)}"{cur}{ext(n["link"])}{I(i)}{X(("Link", np_ + ".link", "link"), ("Icon", np_ + ".icon", "select", icon_choices()))}>'
                     f'<span class="ic"{ICO(np_ + ".icon")}>{_icon(n["icon"], 16) if n.get("icon") else ""}</span><span{E(np_ + ".label")}>{e(n["label"])}</span></a>')
    return f"""<header class="topbar"><div class="wrap">
<a class="mark" href="{p}index.html"{X(("Your photo next to your name (small)", "site:brand_photo", "image"))}>{brand_photo(p)}<span{E("site:ui.brand.text")}>{e((UI.get("brand") or {}).get("text", "Roee Tal"))}</span></a><button class="edit-in top" type="button" aria-label="Edit the site" title="Edit the site"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/></svg></button>
<nav{L("site:nav")}>{"".join(links)}</nav>
</div></header>
"""


def footer(depth, peek=True):
    """The footer on every page: contact text, email/phone, buttons, the peeking character, the video viewer markup and the scripts."""
    p = "../" * depth
    return f"""<footer class="foot" id="contact"{ADD("site:footer_buttons")}{X(("Peeking character (transparent PNG)", "site:footer_peek", "art")) if peek else ""}>
<svg class="foot-wave" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C 260 80 520 0 760 30 S 1220 70 1440 22 V70 H0Z"/></svg>
{f'<div class="peekcat" aria-hidden="true"><img src="{p}assets/art/{SITE_TEXT["_peek"]}.webp"{BG("site:footer_peek")}{M("site:footer_peek", "art")} alt="" loading="lazy"></div>' if peek and SITE_TEXT["_peek"] else ''}
<div class="wrap foot-grid">
  <div>
    <h2{E("site:footer_title")}>{e(SITE_TEXT["footer_title"])}</h2>
    <p class="muted"{E("site:footer_text")}>{e(SITE_TEXT["footer_text"])}</p>
  </div>
  <div class="contact-lines">
    <div class="copyrow"><span class="email" id="email"{E("site:email")}>{SITE['email']}</span><button class="btn ghost{bcls("copy")}" type="button" data-copy="#email"{bs_attr("copy")}>{ui("copy", "Copy", btn="button")}</button></div>
    <span class="muted"{E("site:phone")}>{e(SITE['phone'])}</span>
    <div class="btns"{L("site:footer_buttons")}>{btn_list("site:footer_buttons", SITE_TEXT["footer_buttons"], depth, lambda b: "btn" + (" ghost" if b.get("style") == "ghost" else ""))}</div>
  </div>
</div>
<div class="wrap small muted foot-meta">© {SITE['name']}<button class="edit-in" type="button" aria-label="Edit the site" title="Edit the site"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/></svg></button></div>
</footer>
<div class="viewer" id="viewer" hidden role="dialog" aria-modal="true" aria-label="Video player">
  <div class="viewer-top"><div class="viewer-text"><span id="viewerTitle"></span><div class="cap-row"><p id="viewerCap"></p><button class="info" type="button" id="viewerInfo" aria-label="Show full description" aria-expanded="false" hidden><span class="i-ic">i</span><span class="i-tx">Read more</span></button></div><p class="viewer-credit" id="viewerCredit" hidden></p><div class="viewer-more" id="viewerMore"><p id="viewerMoreText"></p><a id="viewerLink" href="#">Open the project page →</a></div></div><div class="viewer-btns"><button class="btn ghost vmax" type="button" id="viewerMax" aria-label="Full screen" hidden><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path class="i-max" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path class="i-min" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button><button class="btn ghost" type="button" id="viewerClose">Close ✕</button></div></div>
  <div class="viewer-stage" id="viewerStage"></div>
  <button class="nav nav-prev" type="button" id="viewerPrev" aria-label="Previous image"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z" fill="currentColor"/></svg></button>
  <button class="nav nav-next" type="button" id="viewerNext" aria-label="Next image"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M8.6 18.6 10 20l8-8-8-8-1.4 1.4 6.6 6.6z" fill="currentColor"/></svg></button>
</div>
{f'<script id="site-sound" type="application/json">{_json.dumps(SITE_TEXT["_sound"])}</script>' if SITE_TEXT.get("_sound") else ""}
{skin_js(p)}<script src="{p}assets/site.js?v={ver('assets/site.js')}" data-edit="{p}assets/edit.js?v={ver('assets/edit.js')}" defer></script>
</body>
</html>
"""


def more_text(pj, section=None):
    """The longer description behind the (i) button: what this project is, and the section the clip belongs to."""
    parts = [pj["hook"]]
    if section and section[1]:
        parts.append(f"{section[0]}: {section[1]}")
    parts.append(pj["about"][0])
    return " ".join(parts)


def more_attrs(text, href=""):
    """data-more / data-href attributes: the longer project description and its page, shown by the (i) button in the viewer."""
    return f' data-more="{e(text)}"' + (f' data-href="{href}"' if href else "")


FS_ICON = '<span class="fs" title="Full screen"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM6 15v3h3v2H4v-5h2zm12 0h2v5h-5v-2h3v-3z" fill="currentColor"/></svg></span>'


def clip_tile(label, file, did, depth, big=False, cap="", group="", still=False, more="", credit="", mpath=""):
    """One playable clip tile (button with a poster/video) used on project pages, the lab and the gallery."""
    p = "../" * depth
    poster = f"{p}assets/posters/{file.replace('.mp4', '.jpg')}"
    if not (ROOT / "assets/posters" / file.replace(".mp4", ".jpg")).exists():
        poster = thumb(did, 960)
    if POSTERS.get(file):
        poster = thumb(POSTERS[file], 960)
    src = f"{p}assets/clips/{file}" if has_clip(file) else ""
    return (f'<button class="clip{" big" if big else ""}" type="button"{f' data-group="{group}"' if group else ""}{" data-still" if still else ""}{M(mpath, "video") if mpath else ""} data-src="{src}" data-drive="{did}" data-title="{e(label)}" data-cap="{e(cap)}"{more}{credit} aria-label="Play video: {e(label)}">'
            f'<video muted loop playsinline preload="none" poster="{poster}"></video>'
            f'{FS_ICON}</button>')



def bp_svg():
    """A UE5-style Blueprint mock-up drawn in SVG (illustration only)."""
    T={"exec":"#ffffff","obj":"#00a8f4","vec":"#fdc828","rot":"#a0b4ff","xf":"#ff7300","cls":"#8c3cf0","bool":"#c41a1a"}
    out=[];pins={}
    def wire(a,b):
        (x1,y1,c),(x2,y2,_)=pins[a],pins[b]
        d=max(36,abs(x2-x1)*.5)
        path=f"M{x1} {y1} C{x1+d} {y1},{x2-d} {y2},{x2} {y2}"
        ex=c=="#ffffff"
        out.insert(0,f'<path d="{path}" stroke="{c}" stroke-width="{2.4 if ex else 2}" fill="none"/>'+(f'<path class="flow" d="{path}" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' if ex else ""))
    def pin(x,y,t,side,connected=True):
        c=T[t]
        if t=="exec":
            return f'<path d="M{x-5} {y-6}h5l5 6-5 6h-5z" fill="{"#fff" if connected else "none"}" stroke="#fff" stroke-width="1.3"/>'
        return f'<circle cx="{x}" cy="{y}" r="4.3" fill="{c if connected else "none"}" stroke="{c}" stroke-width="1.6"/>'
    def node(key,x,y,w,title,head,ins=(),outs=(),icon="f",sub=""):
        rows=max(len(ins),len(outs));hh=26 if not sub else 38;h=hh+rows*21+8
        gid="g"+key
        o=f'<defs><linearGradient id="{gid}" x1="0" x2="1"><stop offset="0" stop-color="{head}"/><stop offset=".6" stop-color="{head}" stop-opacity=".45"/><stop offset="1" stop-color="{head}" stop-opacity=".1"/></linearGradient></defs>'
        o+=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="#0c0c0c" fill-opacity=".9" stroke="#000" stroke-width="1.4"/>'
        o+=f'<path d="M{x+7} {y}H{x+w-7}a7 7 0 0 1 7 7V{y+hh}H{x}V{y+7}a7 7 0 0 1 7-7z" fill="url(#{gid})"/>'
        o+=f'<rect x="{x+.8}" y="{y+.8}" width="{w-1.6}" height="{h-1.6}" rx="6.3" fill="none" stroke="#ffffff" stroke-opacity=".07"/>'
        if icon=="e": o+=f'<path d="M{x+9} {y+13}l5.5-5.5 5.5 5.5-5.5 5.5z" fill="none" stroke="#fff" stroke-width="1.5"/>'
        elif icon=="b": o+=f'<path d="M{x+10} {y+19}v-6l4-4m-4 4 4 4" fill="none" stroke="#fff" stroke-width="1.5"/>'
        else: o+=f'<text x="{x+10}" y="{y+18}" class="ni">f</text>'
        o+=f'<text x="{x+26}" y="{y+17.5}" class="nt">{title}</text>'
        if sub:o+=f'<text x="{x+26}" y="{y+31}" class="ns">{sub}</text>'
        for i,(lab,t,*rest) in enumerate(ins):
            py=y+hh+12+i*21;pins[f"{key}.i.{lab or 'x'}"]=(x+10,py,T[t])
            o+=pin(x+12,py,t,"in",not rest)
            if lab:o+=f'<text x="{x+24}" y="{py+4}" class="pl">{lab}</text>'
            if rest and rest[0]:o+=f'<rect x="{x+24+len(lab)*6.2+6}" y="{py-8}" width="{len(rest[0])*6.4+12}" height="16" rx="3" fill="#1a1a1a" stroke="#3a3a3a"/><text x="{x+24+len(lab)*6.2+12}" y="{py+4}" class="pv">{rest[0]}</text>'
        for i,(lab,t) in enumerate(outs):
            py=y+hh+12+i*21;pins[f"{key}.o.{lab or 'x'}"]=(x+w-10,py,T[t])
            o+=pin(x+w-12,py,t,"out")
            if lab:o+=f'<text x="{x+w-24}" y="{py+4}" class="pl" text-anchor="end">{lab}</text>'
        out.append(o)
    def getter(key,x,y,name,t):
        w=len(name)*6.6+40
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="24" rx="12" fill="#151515" stroke="#000" stroke-width="1.4"/><rect x="{x+1}" y="{y+1}" width="{w-2}" height="22" rx="11" fill="none" stroke="{T[t]}" stroke-opacity=".35"/><text x="{x+12}" y="{y+16}" class="pl">{name}</text>'+pin(x+w-12,y+12,t,"out"))
        pins[f"{key}.o"]=(x+w-10,y+12,T[t])
    def comment(x,y,w,h,label,col):
        out.insert(0,f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{col}" fill-opacity=".09" stroke="{col}" stroke-opacity=".35"/><rect x="{x}" y="{y}" width="{w}" height="26" rx="3" fill="{col}" fill-opacity=".35"/><text x="{x+10}" y="{y+18}" class="ct">{label}</text>')
    RED,BLUE,GREEN,GREY="#b01515","#1f63b8","#3d8f2e","#6b6b6b"
    # --- setup row
    node("bp",28,66,150,"Event BeginPlay",RED,outs=[("","exec")],icon="e")
    getter("st",36,140,"Site Tileset","obj")
    node("ld",212,66,180,"Load Site Tileset",BLUE,ins=[("","exec"),("Tileset","obj")],outs=[("On Loaded","exec")],sub="Target is BP Site Manager")
    getter("sp",36,196,"Spawn Point","vec")
    node("mt",212,164,200,"Make Transform",GREEN,ins=[("Location","vec"),("Rotation","rot",""),],outs=[("Return Value","xf")])
    node("sa",450,66,290,"SpawnActor BP Apartment",BLUE,ins=[("","exec"),("Class","cls","BP_Apartment"),("Spawn Transform","xf")],outs=[("","exec"),("Return Value","obj")])
    wire("bp.o.x","ld.i.x");wire("st.o","ld.i.Tileset");wire("ld.o.On Loaded","sa.i.x");wire("sp.o","mt.i.Location");wire("mt.o.Return Value","sa.i.Spawn Transform")
    comment(14,30,740,232,"Load the site and spawn the apartment","#4a8fe0")
    # --- picker row
    node("oc",28,318,180,"On Clicked (Floor)",RED,outs=[("","exec"),("Touched Component","obj")],icon="e")
    getter("po",40,404,"Picker Open?","bool")
    node("br",240,318,150,"Branch",GREY,ins=[("","exec"),("Condition","bool")],outs=[("True","exec"),("False","exec")],icon="b")
    getter("sf",246,412,"Selected Finish","obj")
    node("sm",420,318,165,"Set Material",BLUE,ins=[("","exec"),("Target","obj"),("Material","obj")],outs=[("","exec")],sub="Target is Primitive Component")
    node("mc",608,318,140,"Move Camera To",BLUE,ins=[("","exec"),("View","vec","Room")],outs=[("","exec")])
    wire("oc.o.x","br.i.x");wire("po.o","br.i.Condition");wire("br.o.True","sm.i.x");wire("oc.o.Touched Component","sm.i.Target");wire("sf.o","sm.i.Material");wire("sm.o.x","mc.i.x")
    comment(14,282,740,170,"Material picker: swap the floor finish the user clicked","#c48a2e")
    body="".join(out)
    return f'<svg viewBox="0 0 768 470" role="img" aria-label="Illustration of an Unreal Engine 5 Blueprint graph (mock-up, not real project code)">{body}<text x="752" y="462" text-anchor="end" class="wm">BLUEPRINT</text></svg>'


def mosaic_html(pool):
    """The moving wall of screenshots behind the 'Gallery & lab' band (4 rows of 8 images)."""
    rows = []
    for r in range(4):
        imgs = "".join(f'<img src="{pool[(r * 8 + k) % len(pool)]}" loading="lazy" alt="">' for k in range(8))
        rows.append(f'<div class="mrow"><div class="mtrack">{imgs}{imgs}</div></div>')
    return f'<div class="mosaic" aria-hidden="true" data-pool="{" ".join(pool)}">' + "".join(rows) + '</div><div class="mosaic-wash" aria-hidden="true"></div>'

def mosaic_pool(g=None):
    """Small 320x180 thumbs of every gallery screenshot and poster (cached by source name)."""
    import re, hashlib
    from PIL import Image
    g = g if g is not None else (ROOT / "gallery.html").read_text()
    srcs = re.findall(r'<img loading="lazy" src="(assets/(?:img|posters)/[^"]+)"', g) + re.findall(r'poster="(assets/(?:img|posters)/[^"]+)"', g)
    out, seen = [], set()
    tdir = ROOT / "assets/thumbs"; tdir.mkdir(exist_ok=True)
    for src in srcs:
        if src in seen or not (ROOT / src).exists():
            continue
        seen.add(src)
        name = "m-" + hashlib.md5(src.encode()).hexdigest()[:10] + ".jpg"
        dst = tdir / name
        if not dst.exists():
            im = Image.open(ROOT / src).convert("RGB")
            w, h = im.size; tw, th = 320, 180
            sc = max(tw / w, th / h); im = im.resize((round(w * sc), round(h * sc)), Image.LANCZOS)
            l, t = (im.width - tw) // 2, (im.height - th) // 2
            im.crop((l, t, l + tw, t + th)).save(dst, quality=62, optimize=True, progressive=True)
        out.append(f"assets/thumbs/{name}")
    return out

def peek(path, n=9):
    """First lines of real code from a snippet (skip the leading comment block)."""
    lines = (ROOT / path).read_text().rstrip().split("\n")
    i = 0
    while i < len(lines) and lines[i].lstrip().startswith("//"):
        i += 1
    return highlight_cs("\n".join(lines[i:i + n]))

def more_code_html():
    """The 'More code' band on the home page: one card per code page (file bar, title, tech chips, description, code peek)."""
    cards = "".join(
        f'<a class="repo"{I(ci)} id="c-{cp["slug"]}" href="code/{cp["slug"]}.html" style="--deep:{cp["theme"][0]};--mid:{cp["theme"][1]};--accent:{cp["theme"][2]}"{X(("Cover image (optional)", f"code-pages:{ci}.cover", "image"))}><img class="repo-bg" src="{thumb(cp["cover"], 900) if cp["cover"] else ""}" alt=""{BG(f"code-pages:{ci}.cover")}{"" if cp["cover"] else " hidden"}><span class="repo-bar"><span class="dots"><i></i><i></i><i></i></span><span{E(f"code-pages:{ci}.code.{cp['code_idx'][0]}.file_label")}>{e(cp["code"][0][0])}</span></span>'
        f'<span class="repo-mcover"{"" if cp["cover"] else " hidden"}><img src="{thumb(cp["cover"], 900) if cp["cover"] else ""}" alt=""{BG(f"code-pages:{ci}.cover")}></span>'
        f'<span class="repo-body"><span class="repo-title"{E(f"code-pages:{ci}.title")}>{e(cp["title"])}</span><span class="repo-tech"{L(f"code-pages:{ci}.tech")}>{"".join(f'<span{I(ti)}{E(f"code-pages:{ci}.tech.{ti}")}>{e(x)}</span>' for ti, x in enumerate(cp["tech"][:4]))}</span>'
        f'<span class="repo-desc"{E(f"code-pages:{ci}.hook")}>{e(cp["hook"])}</span>{ui("see_code", "See the code →", cls="more")}</span>'
        f'<span class="repo-peek" aria-hidden="true"><span class="peek-cover"{"" if cp["cover"] else " hidden"}><img src="{thumb(cp["cover"], 900) if cp["cover"] else ""}" alt=""{BG(f"code-pages:{ci}.cover")}></span><pre><code>{peek(cp["code"][0][1])}</code></pre></span></a>'
        for ci, cp in enumerate(CODE_PAGES))
    return f"""<section class="band more-code" id="more-code"{K("more_code", "site:section_order")}>
  <div class="wrap">
    <div class="sec-head">{heading("more_code")}<p class="muted"{E("site:more_code_intro")}>{e(SITE_TEXT["more_code_intro"])}</p></div>
    <div class="repos"{L("code-pages")}>{cards}</div>
  </div>
</section>
"""

ICON_BRIEF = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>'
ICON_PAD = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8h10a5 5 0 0 1 4.8 6.4l-.9 3a2.5 2.5 0 0 1-4.3.8L15 16H9l-1.6 2.2a2.5 2.5 0 0 1-4.3-.8l-.9-3A5 5 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".6" fill="currentColor"/><circle cx="17.5" cy="13.5" r=".6" fill="currentColor"/></svg>'
ICON_CODE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/></svg>'

def _ym(v):
    """'2025-02' → '02/2025'."""
    y, m = v.split("-")[:2]
    return f"{m}/{y}"

def job_dates():
    """The current job's date range text, e.g. '02/2025 – Present'."""
    end = SITE_TEXT.get("job_end") or ""
    return f"{_ym(SITE_TEXT['job_start'])} – {_ym(end) if end else 'Present'}"

def job_live():
    """The green 'Ongoing · 1 yr 9 mos' badge while the job has no end date (site.js keeps the duration current)."""
    if SITE_TEXT.get("job_end"):
        return ""
    return f'<span class="live" title="Ongoing"><i></i>Ongoing · <span data-since="{SITE_TEXT["job_start"][:7]}">since {_ym(SITE_TEXT["job_start"])}</span></span>'

def timeline_html():
    """The 3-step timeline under the experience band (school → job → next)."""
    items = SITE_TEXT.get("timeline", [])
    out = []
    for i, t in enumerate(items):
        now = i == len(items) - 1 and not SITE_TEXT.get("job_end")
        tp = f"site:timeline.{i}"
        x = X(("Dot icon", tp + ".icon", "select", icon_choices()), ("Dot color", tp + ".color", "color", ["", "--dot"]))
        dot = f'<span class="ui-ic tl-ic"{ICO(tp + ".icon")}{"" if t.get("icon") else " hidden"}>{_icon(t["icon"], 13) if t.get("icon") else ""}</span>'
        out.append(f'<li{" class=\"tl-now\"" if now else ""}{I(i)}{x}{f" style=\"--dot:{t["color"]}\"" if t.get("color") else ""}>{dot}<span class="when"{E(f"site:timeline.{i}.when")}>{e(t["when"])}</span><b{E(f"site:timeline.{i}.title")}>{e(t["title"])}</b><span class="muted"{E(f"site:timeline.{i}.text")}>{e(t["text"])}</span></li>')
    return "".join(out)

ICONS_22 = {  # icon choices for hobbies and games in the editor
    "school": '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
    "trophy": '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4"/>',
    "tools": '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    "climbing": '<path d="M5 20 9 9l4 5 3-7 3 13z"/><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="4.5" r="1.2"/>',
    "book": '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
    "speech": '<path d="M4 5h16v10H10l-4 4v-4H4z"/><path d="M8 9h8M8 12h5"/>',
    "language": '<path d="M4 6h9M8.5 4v2M6 6c.5 4 3.5 7 7 8M11 6c-.8 4-3.5 7-7 9"/><path d="m13 20 4-9 4 9M14.5 17h5"/>',
    "puzzle": '<path d="M5 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H5v-4a2 2 0 1 0 0-4z"/>',
    "cube": '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    "bolt": '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    "cards": '<rect x="3" y="6" width="11" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
    "vortex": '<path d="M14.4 12.0 L14.7 12.4 L14.9 12.8 L15.0 13.3 L15.1 13.9 L15.0 14.5 L14.9 15.1 L14.6 15.7 L14.2 16.3 L13.7 16.8 L13.1 17.3 L12.4 17.7 L11.6 18.0 L10.8 18.2 L9.8 18.3 L8.9 18.2 L7.9 18.0 L6.9 17.6 L5.9 17.0 L5.1 16.3 L4.3 15.5 L3.6 14.5 L3.0 13.4 L2.6 12.1 L2.4 10.8 L2.3 9.4 M10.8 14.1 L10.3 14.1 L9.9 14.1 L9.3 14.0 L8.8 13.7 L8.3 13.4 L7.9 13.0 L7.5 12.4 L7.2 11.8 L6.9 11.1 L6.8 10.3 L6.8 9.5 L7.0 8.7 L7.2 7.8 L7.6 7.0 L8.2 6.2 L8.9 5.4 L9.7 4.8 L10.7 4.2 L11.7 3.8 L12.9 3.6 L14.1 3.5 L15.3 3.5 L16.6 3.8 L17.8 4.3 L19.0 4.9 M10.8 9.9 L11.0 9.5 L11.3 9.1 L11.6 8.7 L12.1 8.4 L12.6 8.1 L13.2 8.0 L13.9 7.9 L14.6 7.9 L15.3 8.1 L16.0 8.4 L16.7 8.8 L17.4 9.3 L18.0 10.0 L18.5 10.7 L18.9 11.6 L19.2 12.6 L19.4 13.6 L19.4 14.7 L19.2 15.8 L18.9 17.0 L18.4 18.1 L17.7 19.1 L16.8 20.1 L15.8 20.9 L14.6 21.7"/><circle cx="12" cy="12" r="2.6" fill="#0b0618" stroke="currentColor"/>',
    "gamepad": '<path d="M7 8h10a5 5 0 0 1 4.8 6.4l-.9 3a2.5 2.5 0 0 1-4.3.8L15 16H9l-1.6 2.2a2.5 2.5 0 0 1-4.3-.8l-.9-3A5 5 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3"/>',
    "sword": '<path d="M19 3 9.5 12.5M19 3h2v2l-9.5 9.5"/><path d="m6 12 6 6M8.5 15.5 4 20M4 18l2 2"/>',
    "music": '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    "camera": '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    "star": '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
    "heart": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    "brief": '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    "pad": '<path d="M7 8h10a5 5 0 0 1 4.8 6.4l-.9 3a2.5 2.5 0 0 1-4.3.8L15 16H9l-1.6 2.2a2.5 2.5 0 0 1-4.3-.8l-.9-3A5 5 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".6" fill="currentColor"/><circle cx="17.5" cy="13.5" r=".6" fill="currentColor"/>',
    "code": '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
    "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    "image": '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    "home": '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    "flask": '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>',
    "play": '<path d="M7 5v14l11-7z"/>',
    "download": '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    "link": '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    "chip": '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
}

def ticks(items, list_path, key, team=False):
    """Bullet list; its dots can become an icon and change color (shared by every list of this kind)."""
    d = UI.get(key) or {}
    ic, col = d.get("icon", ""), d.get("color", "")
    style = f' style="--tick:{col}"' if col else ""
    x = X(("Bullet icon · every bullet in this kind of list", f"site:ui.{key}.icon", "select", icon_choices()),
          ("Bullet color", f"site:ui.{key}.color", "color", ["^ul", "--tick"]))
    lis = "".join(f'<li{I(j)}{x}><span class="ui-ic tick-ic"{ICO(f"site:ui.{key}.icon")}{"" if ic else " hidden"}>{_icon(ic, 16) if ic else ""}</span>'
                  f'<span{E(f"{list_path}.{j}")}>{e(v)}</span></li>' for j, v in enumerate(items))
    return f'<ul class="ticks{" team" if team else ""}"{L(list_path)}{style}>{lis}</ul>'

def heading(key, tag="h2"):
    """Section heading with its icon and color, all editable."""
    hd = SITE_TEXT["headings"][key]; hp = f"site:headings.{key}"
    ico = (f'<span class="h-ico" style="--c:{hd["color"]}"{ICO(hp + ".icon")}{"" if hd["icon"] else " hidden"}>'
           f'{_icon(hd["icon"], 18) if hd["icon"] else ""}</span>')
    x = X(("Icon", hp + ".icon", "select", icon_choices()), ("Color", hp + ".color", "color", [".h-ico", "--c"]))
    return f'<{tag}{x}>{ico}<span{E(hp + ".title")}>{e(hd["title"])}</span></{tag}>'

def btn_fields(base, sel=""):
    """Look of a button: fill, text, outline color + width, glow. sel '^button' targets the button around a label."""
    return (("Button color", base + ".fill", "color", [sel, "--bf"]), ("Text color", base + ".text_color", "color", [sel, "--bt"]),
            ("Outline color", base + ".border", "color", [sel, "--bb"]), ("Outline width", base + ".bw", "range", [0, 8, 0.5, "px", "--bw", sel]),
            ("Glow", base + ".glow", "toggle", ["glow", sel]))

def bstyle(d):
    """(css vars, extra class) for a button's saved look."""
    d = d or {}
    v = "".join(f"{var}:{d[k]};" for k, var in (("fill", "--bf"), ("text_color", "--bt"), ("border", "--bb")) if d.get(k))
    if d.get("bw") not in (None, ""):
        v += f"--bw:{d['bw']}px;"
    return v, (" glow" if d.get("glow") else "")

def btn_list(path, items, depth, cls_fn):
    """Render a list of editable buttons (label, icon, link, style, look) at the given content path."""
    out = []
    for i, b in enumerate(items):
        bp = f"{path}.{i}"
        sv, gc = bstyle(b)
        out.append(f'<a class="{cls_fn(b)}{gc}" href="{href(b["link"], depth)}"{ext(b["link"])}{I(i)}{f" style=\"{sv}\"" if sv else ""}'
                   f'{X(("Link", bp + ".link", "link"), ("Style", bp + ".style", "select", ["solid", "ghost"]), ("Icon", bp + ".icon", "select", icon_choices()), *btn_fields(bp))}>'
                   f'<span class="ic"{ICO(bp + ".icon")}>{_icon(b["icon"], 18) if b.get("icon") else ""}</span><span{E(bp + ".label")}>{e(b["label"])}</span></a>')
    return "".join(out)

ICON_RAW = {  # brand marks and solid shapes, drawn filled
    "play-solid": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15l12.5-7.5z"/></svg>',
    "dot": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>',
    "unreal": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0a12 12 0 1012 12A12 12 0 0012 0zm0 23.52A11.52 11.52 0 1123.52 12 11.52 11.52 0 0112 23.52zm7.13-9.791c-.206.997-1.126 3.557-4.06 4.942l-1.179-1.325-1.988 2a7.338 7.338 0 01-5.804-2.978 2.859 2.859 0 00.65.123c.326.006.678-.114.678-.66v-5.394a.89.89 0 00-1.116-.89c-.92.212-1.656 2.509-1.656 2.509a7.304 7.304 0 012.528-5.597 7.408 7.408 0 013.73-1.721c-1.006.573-1.57 1.507-1.57 2.29 0 1.262.76 1.109.984.923v7.28a1.157 1.157 0 00.148.256 1.075 1.075 0 00.88.445c.76 0 1.747-.868 1.747-.868V9.172c0-.6-.452-1.324-.905-1.572 0 0 .838-.149 1.484.346a5.537 5.537 0 01.387-.425c1.508-1.48 2.929-1.902 4.112-2.112 0 0-2.151 1.69-2.151 3.96 0 1.687.043 5.801.043 5.801.799.771 1.986-.342 3.059-1.441Z"/></svg>',
    "blueprints": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="3" width="8" height="6" rx="1.6" fill="currentColor"/><rect x="14.5" y="8.5" width="8" height="6" rx="1.6" fill="currentColor"/><rect x="1.5" y="15" width="8" height="6" rx="1.6" fill="currentColor" opacity=".75"/><path d="M9.5 6c3 0 2 5.5 5 5.5M9.5 18c3 0 2-6.5 5-6.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    "cesium": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.0283 10.216c-.3959 0-.7785.22-1.0792.6168l-3.7755 4.994c-.625.8275-1.5128 1.3012-2.4355 1.3012h-.0143c-.9236 0-1.8115-.4737-2.4355-1.3012l-3.7754-4.994c-.2998-.3969-.6823-.6168-1.0802-.6168-.3949 0-.7795.22-1.0781.6168l-3.7765 4.994c-.621.8204-1.4996 1.294-2.414 1.3012C3.088 21.186 7.2113 24 12.0004 24 18.6268 24 24 18.6276 24 12.001c0-.4705-.0338-.9308-.086-1.382-.2638-.2598-.5697-.403-.8857-.403m-7.019-2.5972c-.6936 0-1.2542-.5616-1.2542-1.2541s.5606-1.2541 1.2541-1.2541c.6925 0 1.254.5616 1.254 1.254s-.5615 1.2542-1.254 1.2542M12.0005 0C5.3732 0 0 5.3714 0 12.001c0 1.0536.1504 2.0704.406 3.0463.2272.175.4788.2762.7366.2762.3979 0 .7804-.2189 1.0812-.6138l3.7754-4.996c.623-.8285 1.5129-1.3021 2.4335-1.3021.9226 0 1.8095.4736 2.4355 1.3021l3.6323 4.8037.1565.1923c.2997.3939.6812.6107 1.074.6138.3918-.003.7743-.22 1.072-.6138l.1595-.1923 3.6323-4.8037c.624-.8285 1.5118-1.3021 2.4335-1.3021.1462 0 .2935.0163.4367.0388C21.9522 3.5557 17.3922 0 12.0005 0"/></svg>',
}
TOOL_CLS = {"unreal": "ue", "blueprints": "bpi", "cesium": "cs"}
ICON_CHOICES = None
def icon_choices():
    """All icon names the editor offers in icon pickers ('' = no icon)."""
    return [""] + list(ICONS_22) + list(ICON_RAW)

UI = SITE_TEXT.get("ui") or {}
def ui_icon(key, size=18):
    """Just the icon part of a fixed label from site:ui.<key> (icon + color), hidden when empty."""
    d = UI.get(key) or {}
    ic, col = d.get("icon", ""), d.get("color", "")
    return (f'<span class="ui-ic"{f" style=\"--c:{col}\"" if col else ""}{ICO(f"site:ui.{key}.icon")}{"" if ic else " hidden"}>'
            f'{_icon(ic, size) if ic else ""}</span>')

def bs_attr(key):
    """style='…' attribute with a fixed button's saved look (fill, text, outline) from site:ui.<key>."""
    sv = bstyle(UI.get(key))[0]
    return f' style="{sv}"' if sv else ""
def bcls(key):
    """Extra class (' glow') for a fixed button whose saved look has glow on."""
    return bstyle(UI.get(key))[1]

def ui(key, default, tag="span", cls="", attrs="", icon="", big=False, size=18, btn=""):
    """Fixed wording made editable: text, an optional icon (built-in or uploaded) and its color."""
    d = UI.get(key) or {}
    text, ic, col = d.get("text", default), d.get("icon", icon), d.get("color", "")
    p = f"site:ui.{key}"
    icls = "h-ico" if big else "ui-ic"
    style = f' style="--c:{col or "var(--accent)"}"' if (col or big) else ""
    ico = f'<span class="{icls}"{style}{ICO(p + ".icon")}{"" if ic else " hidden"}>{_icon(ic, size) if ic else ""}</span>'
    x = X(("Icon", p + ".icon", "select", icon_choices()), ("Icon color", p + ".color", "color", ["." + icls, "--c"]), *(btn_fields(p, "^" + btn) if btn else ()))
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c}{attrs}{x}>{ico}<span{E(p + ".text")}>{e(text)}</span></{tag}>'

def _icon(name, size):
    """SVG (or <img> for an uploaded icon) for an icon name at a size in px."""
    if name and str(name).startswith("/"):            # an icon the owner uploaded (image or GIF)
        from content_loader import icon_file
        src = icon_file(name)
        if src:
            return f'<img class="ico-img" src="{src}" width="{size}" height="{size}" alt="" loading="lazy">'
    if name in ICON_RAW:
        return ICON_RAW[name].replace('<svg ', f'<svg width="{size}" height="{size}" ', 1)
    body = ICONS_22.get(name) or ICONS_22["star"]
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" aria-hidden="true" fill="none" stroke="currentColor" '
            f'stroke-width="{1.9 if size > 18 else 2}" stroke-linecap="round" stroke-linejoin="round">{body}</svg>')

def about_html():
    """The 'Get to know me' band: text, hobby cards, favorite games, the local-AI side-project card and the PC parts."""
    SV = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
    ICN = icon_choices()
    cards = "".join(f'<li style="--c:{h["color"]}"{I(i)}{X(("Icon", f"about:hobbies.{i}.icon", "select", ICN), ("Color", f"about:hobbies.{i}.color", "color"))}><span class="hb-ico"{ICO(f"about:hobbies.{i}.icon")}>{_icon(h["icon"], 22)}</span><span{E(f"about:hobbies.{i}.name")}>{e(h["name"])}</span></li>' for i, h in enumerate(ABOUT["hobbies"]))
    favs = "".join(f'<span style="--c:{g["color"]}"{I(i)}{X(("Icon", f"about:games.{i}.icon", "select", ICN), ("Color", f"about:games.{i}.color", "color"))}><i{ICO(f"about:games.{i}.icon")}>{_icon(g["icon"], 16)}</i><span{E(f"about:games.{i}.name")}>{e(g["name"])}</span></span>' for i, g in enumerate(ABOUT["games"]))
    def _tool(i, t):
        t = t if isinstance(t, dict) else {"label": t, "icon": ""}
        return (f'<span{I(i)}{X(("Icon", f"about:ai_tools.{i}.icon", "select", ICN))}><span class="ui-ic"{ICO(f"about:ai_tools.{i}.icon")}{"" if t.get("icon") else " hidden"}>{_icon(t["icon"], 16) if t.get("icon") else ""}</span>'
                f'<span{E(f"about:ai_tools.{i}.label")}>{e(t["label"])}</span></span>')
    chips = "".join(_tool(i, t) for i, t in enumerate(ABOUT["ai_tools"]))
    def _aico(path, ic, size=18):
        return f'<span class="ui-ic"{ICO(path)}{"" if ic else " hidden"}>{_icon(ic, size) if ic else ""}</span>'
    rig = "".join(f'<li{I(i)}{X(("Icon", f"about:rig.{i}.icon", "select", ICN))}><b>{_aico(f"about:rig.{i}.icon", r.get("icon", ""), 14)}<span{E(f"about:rig.{i}.part")}>{e(r["part"])}</span></b><span{E(f"about:rig.{i}.value")}>{e(r["value"])}</span></li>' for i, r in enumerate(ABOUT["rig"]))
    return f"""<section class="band about" id="about"{K("about", "site:section_order")}>
  <div class="wrap about-grid">
    <div>
      <div class="sec-head">{heading("about")}</div>
      <p class="muted"{E("about:intro")}>{e(ABOUT["intro"])}</p>
      <ul class="hobbies"{L("about:hobbies")}>{cards}</ul>
      {ui("fav_games", "Favorite games", tag="p", cls="fav-h")}
      <div class="favs"{L("about:games")}>{favs}</div>
    </div>
    <div class="ai-card">
      <p class="kicker"{E("about:ai_kicker")}>{e(ABOUT["ai_kicker"])}</p>
      <h3{X(("Icon", "about:ai_icon", "select", ICN), ("Icon color", "about:ai_icon_color", "color", [".ui-ic", "--c"]))}>{_aico("about:ai_icon", ABOUT.get("ai_icon", ""))}<span{E("about:ai_title")}>{e(ABOUT["ai_title"])}</span></h3>
      <p class="muted"{E("about:ai_text")}>{e(ABOUT["ai_text"])}</p>
      <div class="ai-tools"{L("about:ai_tools")}>{chips}</div>
      <details class="rig" data-open-wide><summary class="rig-h"{X(("Icon", "about:rig_icon", "select", ICN))}>{_aico("about:rig_icon", ABOUT.get("rig_icon", ""), 14)}<span{E("about:rig_title")}>{e(ABOUT["rig_title"])}</span></summary>
        <ul{L("about:rig")}>{rig}</ul><p class="rig-note"{E("about:rig_note")}>{e(ABOUT["rig_note"])}</p></details>
    </div>
  </div>
</section>
"""


J_I = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
J_HOME = J_I + '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>'
J_IMG = J_I + '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/></svg>'
J_MAIL = J_I + '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'
J_USER = J_I + '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
J_LIST = J_I + '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>'
J_FLASK = J_I + '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/></svg>'
J_NEXT = J_I + '<path d="M5 12h14M13 6l6 6-6 6"/></svg>'
J_PLAY = J_I + '<path d="M7 5v14l11-7z"/></svg>'

def INDEX_JUMP():
    """Entries of the floating 'jump to' menu on the home page, in the current section order (custom sections included)."""
    H = SITE_TEXT["headings"]
    def hj(k, default):
        return (e(H[k]["title"]), H[k]["color"], _icon(H[k]["icon"] or default, 16))
    parts = {
        "experience": [("#now", hj("experience", "brief")[0] + " · 3DVision", hj("experience", "brief")[1], "", hj("experience", "brief")[2])],
        "projects": [("#projects", *hj("projects", "pad")[:2], "", hj("projects", "pad")[2])]
                    + [(f"#p-{pj['slug']}", e(pj['title']), pj['theme'][2], "sub", "") for pj in PROJECTS],
        "more_code": [("#more-code", *hj("more_code", "code")[:2], "", hj("more_code", "code")[2])]
                     + [(f"#c-{cp['slug']}", e(cp['title']), cp['theme'][2], "sub", "") for cp in CODE_PAGES],
        "about": [("#about", *hj("about", "user")[:2], "", hj("about", "user")[2])],
        "gallery_lab": [("#gallery-lab", *hj("gallery_lab", "image")[:2], "", hj("gallery_lab", "image")[2])],
        **{"cs_" + cid: [(f"#cs-{cid}", e(c.get("title") or "Section"), c.get("accent") or "#ffd23f", "", _icon(c.get("icon") or "star", 16))]
           for cid, c in SITE_TEXT.get("_custom", {}).items()},
    }
    order = [k for k in SITE_TEXT.get("section_order", []) if k in parts]
    order += [k for k in parts if k not in order]
    return ([("#top", "Home", "#3d84e6", "", J_HOME)] + [it for k in order for it in parts[k]]
            + [("#contact", "Contact", "#6fd3c2", "", J_MAIL)])

def site_jump(depth):
    """The landing page's main sections, reached from any other page."""
    p = "../" * depth
    return [(f"{p}index.html#top", "Home", "#3d84e6", "", J_HOME), (f"{p}index.html#now", "Experience", "#38b6ff", "", ICON_BRIEF),
            (f"{p}index.html#projects", "Projects", "#ffd23f", "", ICON_PAD), (f"{p}index.html#more-code", "More code", "#9be15d", "", ICON_CODE)]

def jump_menu(items, depth, site=None):
    """Floating jump menu. items = (href, label, color, 'sub'|'' , icon svg or '')."""
    p = "../" * depth
    def link(h, t, col, c, ic):
        return f'<a class="{c}" href="{h}" style="--c:{col}">' + (f'<span class="j-ico">{ic}</span>' if ic else '<i></i>') + f'{t}</a>'
    body = '<p class="jump-h">Jump to</p>' + "".join(link(*it) for it in items)
    if site:
        body += '<p class="jump-h pages">Main page</p>' + "".join(link(*it) for it in site)
    body += (f'<p class="jump-h pages">Pages</p><div class="jump-pages"><a href="{p}gallery.html">Gallery</a><a href="{p}lab.html">Lab</a>'
             f'<a href="{p}cv.html">CV</a></div>')
    return f'''<div class="jump" id="jump">
  <nav class="jump-panel" id="jumpPanel" aria-label="Page sections" hidden>{body}</nav>
  <button class="jump-btn" type="button" aria-expanded="false" aria-controls="jumpPanel" aria-label="Jump to a section"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle class="d1" cx="5" cy="6" r="2"/><circle class="d2" cx="5" cy="12" r="2"/><circle class="d3" cx="5" cy="18" r="2"/><path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="x" d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
</div>
'''

def hero_buttons():
    """The colored quick-link pills under the hero (site:hero_buttons)."""
    out = []
    for i, b in enumerate(SITE_TEXT["hero_buttons"]):
        bp = f"site:hero_buttons.{i}"
        x = X(("Link", bp + ".link", "link"), ("Icon", bp + ".icon", "select", icon_choices()), ("Icon & accent color", bp + ".color", "color", ["", "--c"]), *btn_fields(bp))
        sv, gc = bstyle(b)
        out.append(f'<a href="{href(b["link"], 0)}"{ext(b["link"])}{I(i)}{x}{f" class=\"{gc.strip()}\"" if gc else ""} style="--c:{b["color"]};{sv}"><span class="ic"{ICO(bp + ".icon")}>{_icon(b["icon"], 18) if b.get("icon") else ""}</span>'
                   f'<span{E(bp + ".label")}>{e(b["label"])}</span></a>')
    return "".join(out)

def bp_media_html():
    """What fills the Blueprint window: an uploaded video/GIF, an uploaded picture, or the drawn Blueprint SVG."""
    kind, v = SITE_TEXT["_bp"]
    if kind == "video":
        return f'<video class="bp-media" src="{v}" autoplay muted loop playsinline preload="auto"{BG("site:bp_media")}></video>'
    if kind == "img":
        return f'<img class="bp-media" src="{thumb(v, 1600)}" alt=""{BG("site:bp_media")}>'
    return bp_svg()

def custom_sections_html():
    """Sections the owner (or the AI) added: drawn by assets/sections.js, the same code the editor runs live."""
    secs = SITE_TEXT.get("_custom") or {}
    if not secs:
        return {}
    from content_loader import _media, icon_file
    media, isrc = {}, {}
    def walk(path, v):
        if isinstance(v, dict):
            for k, x in v.items():
                walk(f"{path}.{k}", x)
        elif isinstance(v, list):
            for i, x in enumerate(v):
                walk(f"{path}.{i}", x)
        elif isinstance(v, str) and v:
            key = path.rsplit(".", 1)[-1]
            if key in ("media", "image"):
                kind, val = _media(v)
                if kind:
                    media[path] = {"kind": kind, "url": thumb(val, 1600) if kind == "img" else val}
            elif key == "icon" and v.startswith("/"):
                isrc[v] = icon_file(v) or ""
    for cid, c in secs.items():
        walk(f"site:custom_sections.{cid}", {k: x for k, x in c.items() if k != "_media"})
    data = {"sections": {cid: {k: x for k, x in c.items() if k != "_media"} for cid, c in secs.items()},
            "media": media, "iconSrc": isrc, "icons": {**ICONS_22, **ICON_RAW}}
    js = ("const S=require(process.argv[1]);let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);"
          "const env={icons:j.icons,media:(p)=>j.media[p]||null,iconSrc:n=>j.iconSrc[n]||''};const o={};"
          "for(const[id,c]of Object.entries(j.sections))o[id]=S.render(id,c,env);process.stdout.write(JSON.stringify(o))})")
    import subprocess
    r = subprocess.run(["node", "-e", js, str(ROOT / "assets/sections.js")], input=_json.dumps(data), capture_output=True, text=True, check=True)
    return _json.loads(r.stdout)

def build_index():
    """Write index.html: hero, then the main-page sections in site:section_order (experience, projects, more code, about, gallery & lab, custom sections), then the footer."""
    global DEPTH
    DEPTH = 0
    tiles = []
    for i, pj in enumerate(PROJECTS):
        tiles.append(f"""<a class="ptile"{I(i)}{X(("Page address (lowercase-with-dashes)", f"projects:{i}.slug", "text"), *colors(f"projects:{i}"))} id="p-{pj['slug']}" href="projects/{pj['slug']}.html" data-mid="{pj['theme'][1]}" data-deep="{pj['theme'][0]}" style="--deep:{pj['theme'][0]};--mid:{pj['theme'][1]};--accent:{pj['theme'][2]}">
  <span class="ptile-img"><img loading="lazy"{M(f"projects:{i}.cover")} onerror="this.style.visibility='hidden'" src="{thumb(pj['cover'], 900)}" alt="{e(pj['title'])} screenshot">{f'<img class="peek"{M(f"projects:{i}.mascot", "art")} loading="lazy" src="assets/art/{pj["mascot"]}.webp" alt="">' if pj.get("mascot") else ""}</span>
  <span class="ptile-body">
    <span class="kicker"{E(f"projects:{i}.engine")}>{e(pj['engine'])}</span>
    <span class="role-tag"{E(f"projects:{i}.card_role")}>{e(CARD_ROLE[pj['slug']])}</span>
    <span class="ptile-title"{E(f"projects:{i}.title")}>{e(pj['title'])}</span>
    <span class="ptile-hook tech"{E(f"projects:{i}.card_tech")}>{e(CARD_TECH[pj['slug']])}</span>
    {ui("view_project", "View project →", cls="more")}
  </span>
</a>""")
    slides = "".join(f'<img onerror="this.remove()" src="{thumb(pj["cover"], 1600)}" alt="" style="--i:{i}">' for i, pj in enumerate(PROJECTS))
    hero_video = ""
    if SITE_TEXT["_hero_wide"]:
        hero_video = f'<video class="hero-video" data-wide="{SITE_TEXT["_hero_wide"]}" data-tall="{SITE_TEXT["_hero_tall"]}"{BG("site:hero_video", "site:hero_video_mobile")} muted loop playsinline autoplay preload="auto" aria-hidden="true"></video>'
    html = head("Roee Tal — Game Developer", "Roee Tal, game developer. Gameplay systems in Unity and Unreal Engine.", 0)
    html += topbar(0)
    # decorative film-strip mosaic behind the Gallery & lab band: built from every
    # screenshot and video poster in the gallery; site.js reshuffles it on each visit
    mosaic = mosaic_html(mosaic_pool())
    PROJ_GRAD = "conic-gradient(" + ",".join(pj['theme'][1] for pj in PROJECTS) + "," + PROJECTS[0]['theme'][1] + ")"
    html += jump_menu(INDEX_JUMP(), 0)
    html += f"""<section class="hero" id="top"{ADD("site:hero_buttons", "hero")}{X(("Background video · plays behind your name", "site:hero_video", "video"), ("Phone-only background (optional)", "site:hero_video_mobile", "video"), ("Text panel darkness (0 = no panel)", "site:hero_panel", "range", [0, 90, 5, "%", "--hp", ""]))}{f' style="--hp:{SITE_TEXT.get("hero_panel")}%"' if SITE_TEXT.get("hero_panel") not in (None, "") else ""}>
  <div class="hero-media">{hero_video or f'<div class="slides" aria-hidden="true">{slides}</div>'}</div>
  <div class="wrap hero-copy"><div class="hero-panel">
    <p class="kicker"{E("site:hero_kicker")}>{e(SITE_TEXT["hero_kicker"])}</p>
    <h1{E("site:hero_title")}>{e(SITE_TEXT["hero_title"])}</h1>
    <p class="lead"{E("site:hero_lead")}>{e(SITE_TEXT["hero_lead"])}</p></div>
    <div class="btns">
      <button class="btn{bstyle(UI.get("showreel_btn"))[1]}" type="button"{M("site:showreel_video", "video")} {play_attrs(SITE['showreel'], 'Showreel', 'Projects from my three years of game development at Tiltan.')}{X(("Icon", "site:ui.showreel_btn.icon", "select", icon_choices()), ("Icon color", "site:ui.showreel_btn.color", "color", [".ui-ic", "--c"]), *btn_fields("site:ui.showreel_btn"))}{bs_attr("showreel_btn")}>{ui_icon("showreel_btn")}<span{E("site:showreel_label")}>{e(SITE_TEXT["showreel_label"])}</span></button>
    </div>
    <nav class="hero-links" aria-label="Jump to"{L("site:hero_buttons")}>{hero_buttons()}</nav>
  </div>
  {WAVE}
</section>
"""
    blocks = {}
    blocks["experience"] = f"""<section class="band now" id="now"{K("experience", "site:section_order")}>
  <div class="wrap now-grid">
    <div class="now-copy">
      {heading("experience", "p").replace("<p", '<p class="kicker exp-kicker"', 1).replace("</span></p>", "</span> · " + job_dates() + job_live() + "</p>")}
      <h2{E("site:job_title")}>{e(SITE_TEXT["job_title"])}</h2>
      <p class="muted"{E("site:job_subtitle")}>{e(SITE_TEXT["job_subtitle"])}</p>
      <div class="tools"{L("site:job_tools")}>{"".join(f'<span class="tool {TOOL_CLS.get(t.get("icon"), "")}"{I(i)}{X(("Icon", f"site:job_tools.{i}.icon", "select", icon_choices()))}><span class="ic"{ICO(f"site:job_tools.{i}.icon")}>{_icon(t["icon"], 18) if t.get("icon") else ""}</span><span{E(f"site:job_tools.{i}.label")}>{e(t["label"])}</span></span>' for i, t in enumerate(SITE_TEXT["job_tools"]))}</div>
      {ticks(SITE_TEXT["job_bullets"], "site:job_bullets", "bullet_job")}
    </div>
    <figure class="bp"{X(("Picture inside the window (image, GIF or video)", "site:bp_media", "media"))}>
      <div class="win-bar"><span class="win-ico" aria-hidden="true"></span>{ui("bp_title", "BP_ApartmentTour (illustration)", cls="win-title")}<span class="win-ctl" aria-hidden="true"><i>&#x2212;</i><i>&#x25A1;</i><i class="x">&#x2715;</i></span></div>
      <div class="ue-tabs" aria-hidden="true"><span class="ue-tab">BP_ApartmentTour</span></div>
      <div class="ue-crumb" aria-hidden="true"><span>BP_ApartmentTour</span><b>›</b><span>Event Graph</span><em>Zoom 1:1</em></div>
      <div class="bp-body">{ui("bp_badge", "AI-assisted illustration · not real project code", cls="demo-badge")}{bp_media_html()}</div>
      <figcaption>{ui("bp_cap_b", "Illustration, made with AI tools.", tag="b")} <span{E("site:ui.bp_cap.text")}>{e((UI.get("bp_cap") or {}).get("text", "A mock-up of the kind of Blueprint logic I work on. It isn't from a real project: client work at 3DVision is under NDA."))}</span></figcaption>
    </figure>
  </div>
  <div class="wrap">
    <ol class="timeline"{L("site:timeline")}>
      {timeline_html()}
      <li class="tl-next">{ui("tl_next_when", "Next", cls="when")}{ui("tl_next_title", "Your team?", tag="b")}<a class="muted" href="#contact">{ui("tl_next_link", "Open to Unity and Unreal roles →")}</a></li>
    </ol>
  </div>
</section>
"""
    blocks["projects"] = f"""<section class="band blue palette-band" id="projects"{K("projects", "site:section_order")}>
  <div class="wrap">
    <div class="sec-head">{heading("projects")}<p class="muted"{E("site:projects_intro")}>{e(SITE_TEXT["projects_intro"])}</p></div>
    <div class="ptiles"{L("projects")}>{''.join(tiles)}</div>
  </div>
</section>
"""
    blocks["more_code"] = more_code_html()
    blocks["about"] = about_html()
    blocks["gallery_lab"] = f"""<section class="band lab-teaser" id="gallery-lab"{K("gallery_lab", "site:section_order")}{ADD("site:gallery_lab_buttons")}>
  {mosaic}
  <div class="wrap lab-row">
    <div>{heading("gallery_lab")}<p class="muted"{E("site:gallery_lab_text")}>{e(SITE_TEXT["gallery_lab_text"])}</p></div>
    <div class="btns"{L("site:gallery_lab_buttons")}>{btn_list("site:gallery_lab_buttons", SITE_TEXT["gallery_lab_buttons"], 0, lambda b: "btn" + (" ghost" if b.get("style") == "ghost" else ""))}</div>
  </div>
</section>
"""
    for cid, sec_html in custom_sections_html().items():
        blocks["cs_" + cid] = sec_html
    for k, cfg in SITE_TEXT.get("section_buttons", {}).items():
        if k not in blocks:
            continue
        row = f'<div class="wrap">{xrow(f"site:section_buttons.{k}", cfg, 0, "top" if cfg.get("position") == "top" else "")}</div>'
        b = blocks[k].replace("<section", "<section" + ADD(f"site:section_buttons.{k}.items"), 1)
        i = b.index(">", b.index("<section")) + 1
        blocks[k] = b[:i] + row + b[i:] if cfg.get("position") == "top" else b[:b.rindex("</section>")] + row + b[b.rindex("</section>"):]
    order = [k for k in SITE_TEXT.get("section_order", []) if k in blocks]
    order += [k for k in blocks if k not in order]          # anything not listed keeps its default place at the end
    html += "\n".join(blocks[k] for k in order)
    html += footer(0)
    (ROOT / "index.html").write_text(html)


def tbc_band(back_href, back_label):
    """End of the chain: no looping back to the first project."""
    return (f'<div class="tbc-band" id="next"><div class="wrap tbc-inner"><div class="tbc-card">'
            f'{ui("next_project", "Next project", cls="kicker")}<span class="tbc-title"><span{E("site:ui.tbc.text")}>{e((UI.get("tbc") or {}).get("text", "To be continued"))}</span><span class="tbc-dots"><i></i><i></i><i></i></span></span>'
            f'{ui("tbc_sub", "Saved for future projects.", cls="muted")}</div>'
            f'<a class="btn ghost" href="{back_href}">← {e(back_label)}</a></div></div>')

def next_band(nxt):
    """'Next project' band in the next project's own colors, with its character or an iconic frame."""
    d, m, a = nxt["theme"]
    if nxt.get("mascot"):
        art = f'<img class="next-art cutout" src="../assets/art/{nxt["mascot"]}.webp" alt="" loading="lazy">'
    else:
        art = f'<img class="next-art card" src="../assets/art/{NEXT_CARD[nxt["slug"]]}.webp" alt="" loading="lazy">'
    return (f'<a class="next-band" id="next" href="{nxt["slug"]}.html" style="--deep:{d};--mid:{m};--accent:{a}">'
            f'<div class="wrap next-inner"><div class="next-copy">{ui("next_project", "Next project", cls="kicker")}'
            f'<span class="next-title">{e(nxt["title"])} <span class="arr">→</span></span><span class="next-hook">{e(nxt["hook"])}</span></div>{art}</div></a>')


CS_KW = set("""abstract as base bool break case catch class const continue default do double else enum event false float for foreach
if in int interface internal is new null object out override private protected public readonly ref return sealed static string
struct switch this throw true try typeof using var virtual void while yield nullptr auto const""".split())

def highlight_cs(code):
    """Tiny C#/C++ syntax highlighter for the code snippets (comments, strings, attributes, keywords, types, numbers)."""
    import re, html
    tok = re.compile(r'(//[^\n]*)|("(?:[^"\\]|\\.)*")|(\[[A-Z][A-Za-z]*(?=\())|\b([A-Za-z_][A-Za-z0-9_]*)\b|(\d+(?:\.\d+)?f?)')
    out, last = [], 0
    for m in tok.finditer(code):
        out.append(html.escape(code[last:m.start()]))
        t = html.escape(m.group(0))
        if m.group(1): out.append(f'<span class="c">{t}</span>')
        elif m.group(2): out.append(f'<span class="s">{t}</span>')
        elif m.group(3): out.append(f'<span class="a">{t}</span>')
        elif m.group(4):
            w = m.group(4)
            if w in CS_KW: out.append(f'<span class="k">{t}</span>')
            elif w[0].isupper(): out.append(f'<span class="t">{t}</span>')
            else: out.append(t)
        else: out.append(f'<span class="n">{t}</span>')
        last = m.end()
    out.append(html.escape(code[last:]))
    return "".join(out)

def code_section(pj, base=""):
    """The 'Code sample' block on a project page, from SNIPPETS (file name, source link, highlighted code)."""
    if pj["slug"] not in SNIPPETS:
        return ""
    name, url, path = SNIPPETS[pj["slug"]]
    code = (ROOT / path).read_text().rstrip()
    return (f'<section class="mech-sec code-sec" id="code">{ui("h_code_sample", "Code sample", tag="h2", big=True)}'
            f'<figure class="code"><figcaption><span class="dots"><i></i><i></i><i></i></span><span{E(base + ".code_sample.file_label")}>{e(name)}</span>'
            f'</figcaption><pre><code{E(base + ".code_sample.code")} data-code>{highlight_cs(code)}</code></pre></figure>'
            f'{ui("trimmed", "Trimmed and commented for this page.", tag="p", cls="muted small center")}</section>')

def code_figure(name, path, base="", idx=0):
    """One highlighted code window (title bar + numbered lines)."""
    code = (ROOT / path).read_text().rstrip()
    return (f'<figure class="code"{I(idx)}><figcaption><span class="dots"><i></i><i></i><i></i></span><span{E(f"{base}.code.{idx}.file_label")}>{e(name)}</span></figcaption>'
            f'<pre><code{E(f"{base}.code.{idx}.code")} data-code>{highlight_cs(code)}</code></pre></figure>')

def build_code_page(i, cp):
    """Write code/<slug>.html: a page for one code system (intro, tech, highlights, the code itself, buttons)."""
    global DEPTH
    depth = DEPTH = 1
    nxt = CODE_PAGES[i + 1] if i + 1 < len(CODE_PAGES) else None
    B = f"code-pages:{i}"
    flow = f'<div class="flow"{L(B + ".flow")}>' + '<span class="flow-arrow" aria-hidden="true">→</span>'.join(
        f'<div class="flow-step"{I(j)}><b{E(f"{B}.flow.{j}.name")}>{e(a)}</b><span{E(f"{B}.flow.{j}.note")}>{e(b)}</span></div>' for j, (a, b) in enumerate(cp["flow"])) + '</div>'
    media = ""
    if cp.get("clip"):
        lbl, cap, f, d = cp["clip"]
        media = f'<section class="mech-sec" id="action"{K("clip", B + ".page_order")}>{ui("h_in_action", "In action", tag="h2", big=True)}<div class="mech-grid n1"><figure class="mech">{clip_tile(lbl, f, d, depth, big=True, cap=cap, mpath=B + ".clip.video")}<figcaption><b{E(B + ".clip.label")}>{e(lbl)}</b> <span{E(B + ".clip.caption")}>{e(cap)}</span></figcaption></figure></div></section>'
    codes = "".join(code_figure(n, pth, B, ix) for (n, pth), ix in zip(cp["code"], cp["code_idx"]))
    cb_btn = f'<div class="xrow-block"{K("buttons", B + ".page_order")}{ADD(B + ".buttons.items")}{"" if cp["buttons"].get("items") else " hidden data-edit-show"}>{xrow(B + ".buttons", cp["buttons"], 1, "blk")}</div>'
    cb = {"flow": f'<section class="mech-sec" id="flow"{K("flow", B + ".page_order")}>{ui("h_flow", "How it fits together", tag="h2", big=True)}{flow}</section>', "clip": media,
          "code": f'<section class="mech-sec code-sec" id="the-code"{K("code", B + ".page_order")}{L(B + ".code")}>{ui("h_the_code", "The code", tag="h2", big=True)}{codes}{ui("trimmed", "Trimmed and commented for this page.", tag="p", cls="muted small center")}</section>'}
    cb["buttons"] = cb_btn
    corder = [k for k in cp.get("page_order", []) if k in cb]
    corder += [k for k in cb if k not in corder]
    code_blocks = "\n".join(cb[k] for k in corder)
    html = head(f"{cp['title']} — Roee Tal", cp["hook"], depth, cp["theme"])
    html += topbar(depth, "projects")
    acc = cp["theme"][2]
    html += jump_menu([("#top", e(cp["title"]), acc, "", ICON_CODE), ("#built", "What I built", acc, "sub", ""),
                       ("#flow", "How it fits together", acc, "sub", "")]
                      + ([("#action", "In action", acc, "sub", "")] if cp.get("clip") else [])
                      + [("#the-code", "The code", acc, "sub", ""), ("#next", "Next", acc, "sub", "")], depth, site_jump(depth))
    html += f"""<section class="phero short code-hero" id="top"{X(*colors(B), ("Cover image (optional)", B + ".cover", "image"))}>
  <img class="phero-bg soft" src="{thumb(cp['cover'], 1800) if cp['cover'] else ''}" alt=""{BG(B + ".cover")}{'' if cp['cover'] else ' hidden'}>
  <div class="wrap phero-copy"><p class="kicker"><span{E("site:ui.more_code_kicker.text")}>{e((UI.get("more_code_kicker") or {}).get("text", "More code"))}</span> · <span{E(B + ".language")}>{e(cp['lang'])}</span></p><h1{E(B + ".title")}>{e(cp['title'])}</h1><p class="lead"{E(B + ".subtitle")}>{e(cp['sub'])}</p></div>
  {WAVE}
</section>
<div class="project">
  <section class="wrap intro" id="built">
    <div class="intro-text">
      <p class="hook"{E(B + ".hook")}>{e(cp['hook'])}</p>
      {ui("h_built", "What I built", tag="h3", cls="kicker")}
      {ticks(cp['did'], B + ".what_i_built", "bullet_built")}
      {ui("h_tech", "Tech & principles", tag="h3", cls="kicker")}
      <div class="techs"{L(B + ".tech")}>{''.join(f'<span{I(j)}{E(f"{B}.tech.{j}")}>{e(t)}</span>' for j, t in enumerate(cp['tech']))}</div>
    </div>
    <dl class="facts">
      <div>{ui("f_role", "Role", tag="dt")}<dd{E(B + ".role")}>{e(cp['role'])}</dd></div>
      <div>{ui("f_lang", "Language", tag="dt")}<dd{E(B + ".language")}>{e(cp['lang'])}</dd></div>
      <div>{ui("f_when", "When", tag="dt")}<dd{E(B + ".when")}>{e(cp['when'])}</dd></div>
      <div{'' if cp['context'] else ' hidden data-edit-show'}>{ui("f_context", "Context", tag="dt")}<dd{E(B + ".context")}>{e(cp['context'])}</dd></div>
    </dl>
  </section>
  <div class="wrap">
    {code_blocks}
  </div>
  <div class="wrap code-next" id="next"><a class="btn ghost{bcls("all_more_code")}" href="../index.html#more-code"{bs_attr("all_more_code")}>{ui("all_more_code", "← All of More code", btn="a")}</a>{f'<a class="btn{bcls("next_code")}" href="{nxt["slug"]}.html"{bs_attr("next_code")}>{ui("next_code", "Next:", btn="a")} {e(nxt["title"])} →</a>' if nxt else f'<span class="tbc-chip">{ui("next_code_tbc", "Next: to be continued…")} <em>{ui("tbc_sub_code", "saved for future projects")}</em></span>'}</div>
</div>
"""
    html += footer(depth, peek=False)
    (ROOT / "code").mkdir(exist_ok=True)
    (ROOT / "code" / f"{cp['slug']}.html").write_text(html)

def grid_cols(layout, n):
    """Clip grid columns: 'auto' fits the number of clips (max 3), or a fixed 1 / 2 / 3."""
    return {"one-big": 1, "two": 2, "three": 3}.get(layout or "auto", min(max(n, 1), 3))

def build_project(i, pj):
    """Write projects/<slug>.html: the project page (header with mascot, facts, what I built, clip sections, video, about, characters, credits, next project)."""
    global DEPTH
    depth = DEPTH = 1
    nxt = PROJECTS[i + 1] if i + 1 < len(PROJECTS) else None
    sections = []
    first = True
    layouts = pj.get("layouts", [])
    B = f"projects:{i}"
    for title, intro, clips in pj["sections"]:
        S = f"{B}.sections.{len(sections)}"
        sec_more = more_attrs(more_text(pj, (title, intro)))
        tiles = "".join(
            f'<figure class="mech"{I(j)}{X(("Thumbnail (optional)", f"{S}.clips.{j}.poster", "image"))}>{clip_tile(lbl, f, d, depth, big=(len(clips) == 1), cap=cap, more=sec_more, credit=credit_attr(pj['slug']), mpath=f"{S}.clips.{j}.video")}<figcaption><b{E(f"{S}.clips.{j}.label")}>{e(lbl)}</b> <span{E(f"{S}.clips.{j}.caption", "caption")}>{e(cap)}</span></figcaption></figure>'
            for j, (lbl, cap, f, d) in enumerate(clips))
        sections.append(f"""<section class="mech-sec" id="s{len(sections)+1}"{I(len(sections))}{X(("Clip layout", S + ".layout", "select", ["auto", "one-big", "two", "three"]), ("Heading icon", S + ".icon", "select", icon_choices()))}>
  <h2><span class="h-ico" style="--c:var(--accent)"{ICO(S + ".icon")}{"" if pj["sec_icons"][len(sections)] else " hidden"}>{_icon(pj["sec_icons"][len(sections)], 18) if pj["sec_icons"][len(sections)] else ""}</span><span{E(S + ".title")}>{e(title)}</span></h2><p class="muted center"{E(S + ".intro", "intro (optional)")}{'' if intro else ' hidden data-edit-show'}>{e(intro)}</p>
  <div class="mech-grid n{grid_cols(layouts[len(sections)], len(clips))}"{L(S + ".clips")}>{tiles}</div>
</section>""")
        first = False
    shots = ""
    if pj["shots"]:
        shots = f'<section class="mech-sec" id="shots">{ui("h_screens", "Screenshots", tag="h2", big=True)}<div class="shots"{L(B + ".screenshots")}>' + "".join(
            f'<button class="zoom" type="button"{I(si)}{X(("Caption", f"{B}.screenshots.{si}.caption", "text"))} data-full="{thumb(s, 2000)}" data-group="shots" data-title="Screenshot" data-cap="{e(SHOT_CAPS.get(s, ""))}"{more_attrs(more_text(pj))} aria-label="Enlarge screenshot"><img loading="lazy"{M(f"{B}.screenshots.{si}.image")} onerror="this.style.visibility=\'hidden\'" src="{thumb(s, 900)}" alt="{e(pj["title"])} screenshot">{FS_ICON}</button>' for s, si in zip(pj["shots"], pj["shot_idx"])) + "</div></section>"
    full = ""
    if pj["full"]:
        full = f'<section class="mech-sec center" id="full">{ui("h_full", "Full video showcase", tag="h2", big=True)}<button class="btn{bcls("play_full")}" type="button"{bs_attr("play_full")}{M(B + ".full_video", "video")} {play_attrs(pj["full"], pj["title"] + " · full video")}{more_attrs(more_text(pj))}{credit_attr(pj['slug'])}>{ui("play_full", "Play full video", icon="play-solid", btn="button")}</button></section>'
    cast = ""
    if pj.get("cast"):
        cast = f'<section class="mech-sec" id="characters">{ui("h_chars", "Characters", tag="h2", big=True)}<div class="cast"{L(B + ".characters")}>' + "".join(
            f'<figure{I(ci)}{X(("Caption", f"{B}.characters.{ci}.caption", "text"))}><button class="zoom bare" type="button" data-full="../assets/art/{f}.webp" data-group="cast" data-title="{e(c)}" data-cap="{e(CAST_CAPS.get(f, ""))}"{more_attrs(more_text(pj))} aria-label="Enlarge: {e(c)}"><img loading="lazy"{M(f"{B}.characters.{ci}.image", "art")} src="../assets/art/{f}.webp" alt="{e(c)}">{FS_ICON}</button><figcaption{E(f"{B}.characters.{ci}.name")}>{e(c)}</figcaption></figure>' for (f, c), ci in zip(pj["cast"], pj["cast_idx"])) + "</div></section>"
    PO = B + ".page_order"
    def blk(key, inner, cls="wrap"):
        return f'<div class="{cls}"{K(key, PO)}>{inner}</div>' if inner else ""
    pb = {
        "code_sample": blk("code_sample", code_section(pj, B)),
        "clips": f'<div class="wrap"{K("clips", PO)}{L(B + ".sections")}>{"".join(sections)}</div>' if sections else "",
        "screenshots": blk("screenshots", shots),
        "full_video": blk("full_video", full),
        "about": f'<section class="wrap about-game" id="about-project"{K("about", PO)}{L(B + ".about")}>{ui("h_about_project", "About the project", tag="h2", big=True)}{"".join(f"<p{I(j)}{E(f'{B}.about.{j}')}>{e(a)}</p>" for j, a in enumerate(pj["about"]))}</section>',
        "characters": blk("characters", cast),
        "buttons": f'<div class="wrap xrow-block"{K("buttons", PO)}{ADD(B + ".buttons.items")}{"" if pj["buttons"].get("items") else " hidden data-edit-show"}>{xrow(B + ".buttons", pj["buttons"], 1, "blk")}</div>',
        "credits": (f'<div class="wrap credits"{K("credits", PO)}><p class="art-note"><span aria-hidden="true">{"🎨" if pj["slug"] in ART_CREDIT_SLUGS else "🛠️"}</span><span>{ui("credits_label", "Credits.", tag="b")} <span{E(B + ".credits")}>{e(ART_NOTES[pj["slug"]])}</span></span></p></div>' if pj["slug"] in ART_NOTES else ""),
    }
    order = [k for k in pj.get("page_order", []) if k in pb]
    order += [k for k in pb if k not in order]
    page_blocks = "\n".join(pb[k] for k in order)
    html = head(f"{pj['title']} — Roee Tal", pj["hook"], depth, pj["theme"])
    html += topbar(depth, "projects")
    acc = pj["theme"][2]
    items = [("#top", e(pj["title"]), acc, "", ICON_PAD), ("#built", "What I built", acc, "sub", "")]
    if pj["slug"] in SNIPPETS: items.append(("#code", "Code sample", acc, "sub", ""))
    items += [(f"#s{k+1}", e(t), acc, "sub", "") for k, (t, _i, _c) in enumerate(pj["sections"])]
    if pj["shots"]: items.append(("#shots", "Screenshots", acc, "sub", ""))
    if pj["full"]: items.append(("#full", "Full video", acc, "sub", ""))
    items.append(("#about-project", "About the project", acc, "sub", ""))
    if pj.get("cast"): items.append(("#characters", "Characters", acc, "sub", ""))
    items.append(("#next", "Next project", acc, "sub", ""))
    html += jump_menu(items, depth, site_jump(depth))
    html += f"""<section class="phero" id="top"{X(*colors(B), ("Cover image", B + ".cover", "image"), ("Character cut-out (transparent PNG)", B + ".mascot", "art"), ("Square image for 'Next project'", B + ".next_card_image", "art"), ("Full video", B + ".full_video", "video"))}>
  <img class="phero-bg"{M(B + ".cover")} onerror="this.remove()" src="{thumb(pj['cover'], 1800)}" alt="">
  {f'<img class="mascot"{M(B + ".mascot", "art")} src="../assets/art/{pj["mascot"]}.webp" alt="">' if pj.get("mascot") else ""}
  <div class="wrap phero-copy">
    <p class="kicker"{E(B + ".engine")}>{e(pj['engine'])}</p>
    <h1{E(B + ".title")}>{e(pj['title'])}</h1>
    <p class="lead"{E(B + ".subtitle")}>{e(pj['sub'])}</p>
  </div>
  {WAVE}
</section>

<div class="project">
  <section class="wrap intro" id="built">
    <div class="intro-text">
      <p class="hook"{E(B + ".hook")}>{e(pj['hook'])}</p>
      {ui("h_built", "What I built", tag="h3", cls="kicker")}
      {ticks(pj['did'], B + ".what_i_built", "bullet_built")}
      {ui("h_team", "The rest of the engine (my teammates)", tag="h3", cls="kicker") + ticks(pj['did_team'], B + ".teammates_built", "bullet_team", team=True) if pj.get('did_team') else ''}
      {ui("h_tech", "Tech & principles", tag="h3", cls="kicker")}
      <div class="techs"{L(B + ".tech")}>{''.join(f'<span{I(j)}{E(f"{B}.tech.{j}")}>{e(t)}</span>' for j, t in enumerate(TECH[pj['slug']]))}</div>
    </div>
    <dl class="facts">
      <div>{ui("f_role", "Role", tag="dt")}<dd{E(B + ".role")}>{e(pj['role'])}</dd></div>
      <div>{ui("f_engine", "Engine", tag="dt")}<dd{E(B + ".engine")}>{e(pj['engine'])}</dd></div>
      <div>{ui("f_when", "When", tag="dt")}<dd{E(B + ".when")}>{e(pj['when'])}</dd></div>
      <div>{ui("f_context", "Context", tag="dt")}<dd{E(B + ".context")}>{e(pj['context'])}</dd></div>
    </dl>
  </section>
  {page_blocks}
</div>
{next_band(nxt) if nxt else tbc_band('../index.html#projects', 'All projects')}
"""
    html += footer(depth, peek=False)
    (ROOT / "projects").mkdir(exist_ok=True)
    (ROOT / "projects" / f"{pj['slug']}.html").write_text(html)


def build_lab():
    """Write lab.html: experiments and early work as clip tiles."""
    global DEPTH
    DEPTH = 0
    def labfig(fn, j, lbl, f, d, cap):
        return (f'<figure class="mech"{I(j)}{X(("Thumbnail (optional)", f"{fn}:{j}.poster", "image"))}>{clip_tile(lbl, f, d, 0, cap=cap, mpath=f"{fn}:{j}.video")}'
                f'<figcaption><b{E(f"{fn}:{j}.label")}>{e(lbl)}</b> <span{E(f"{fn}:{j}.caption")}>{e(cap)}</span></figcaption></figure>')
    tiles = "".join(labfig("lab", j, *t) for j, t in enumerate(LAB))
    early = "".join(labfig("early-work", j, *t) for j, t in enumerate(EARLY))
    html = head("The Lab — Roee Tal", "Shaders, systems and course experiments by Roee Tal.", 0, ("#0c2f6e", "#1758b0", "#ffd23f"))
    html += topbar(0, "lab")
    html += jump_menu([("#top", "The lab", "#ffd23f", "", J_FLASK), ("#experiments", "Experiments", "#ffd23f", "sub", ""),
                       ("#early", "Early work", "#ffd23f", "sub", "")], 0, site_jump(0))
    html += f"""<section class="phero short" id="top"{X(("Header background image (optional)", "site:lab_cover", "image"))}>
  <img class="phero-bg soft" src="{thumb(SITE_TEXT['_lab_cover'], 1800) if SITE_TEXT['_lab_cover'] else ''}" alt=""{BG("site:lab_cover")}{'' if SITE_TEXT['_lab_cover'] else ' hidden'}>
  <div class="wrap phero-copy">{ui("lab_kicker", "Experiments", tag="p", cls="kicker")}{ui("lab_title", "The lab", tag="h1")}{ui("lab_lead", "Small things I built to learn how they work: shaders, engines, UI and mini-games.", tag="p", cls="lead")}</div>
  {WAVE}
</section>
<div class="project"><div class="wrap"><section class="mech-sec" id="experiments"><div class="mech-grid n3"{L("lab")}>{tiles}</div></section>
<section class="mech-sec appendix" id="early">{ui("early_kicker", "Appendix", tag="p", cls="kicker")}{ui("h_early", "Early work", tag="h2", big=True)}{ui("early_text", "Where I started: small first projects and exercises, kept here for the record.", tag="p", cls="muted center")}<div class="mech-grid n3"{L("early-work")}>{early}</div></section></div></div>
"""
    html += footer(0)
    (ROOT / "lab.html").write_text(html)


def build_gallery():
    """Every clip, screenshot, character and full video in one filterable page."""
    global DEPTH, THEMES
    THEMES = {pj["slug"]: pj["theme"] for pj in PROJECTS}
    DEPTH = 0
    items = []  # (html, project slug, kind)
    def card(inner, proj_title, label, cap, slug, kind, more=""):
        info = f'<button class="info" type="button" aria-label="Show description" aria-expanded="false"><span class="i-ic">i</span><span class="i-tx">Info</span></button>' if (cap or more) else ""
        mt = re.search(r'data-more="([^"]*)"', more)
        mh = re.search(r'data-href="([^"]*)"', more)
        extra = (f'<span class="gmore">{mt.group(1)}</span>' if mt else "") + (f'<a class="glink" href="{mh.group(1)}">Open the project page →</a>' if mh else "")
        th = THEMES.get(slug)
        style = f' style="--deep:{th[0]};--mid:{th[1]};--accent:{th[2]}"' if th else ""
        return (f'<figure class="gitem" data-proj="{slug}" data-kind="{kind}"{style}>{inner}{info}'
                f'<figcaption><span class="gproj">{e(proj_title)}</span><b>{e(label)}</b> {e(cap)}{extra}</figcaption></figure>')
    for pj in PROJECTS:
        href = f"projects/{pj['slug']}.html"
        for sec_title, intro, clips in pj["sections"]:
            m = more_attrs(more_text(pj, (sec_title, intro)), href)
            for lbl, cap, f, d in clips:
                items.append(card(clip_tile(lbl, f, d, 0, cap=cap, group="all", still=True, more=m, credit=credit_attr(pj["slug"])), pj["title"], lbl, cap, pj["slug"], "video", m))
        if pj["full"]:
            name = FULL.get(pj["full"])
            poster = f"assets/posters/full-{name}.jpg" if name and (ROOT / f"assets/posters/full-{name}.jpg").exists() else thumb(pj["cover"], 900)
            src = f"assets/full/{name}.mp4" if name and (ROOT / f"assets/full/{name}.mp4").exists() else ""
            cap = "The full gameplay video."
            inner = (f'<button class="clip" type="button" data-group="all" data-still data-src="{src}" data-drive="{pj["full"]}" data-title="{e(pj["title"])} · full video" data-cap="{cap}"{more_attrs(more_text(pj), href)}{credit_attr(pj["slug"])} aria-label="Play the full {e(pj["title"])} video">'
                     f'<video muted playsinline preload="none" poster="{poster}"></video><span class="tag">Full video</span>{FS_ICON}</button>')
            items.append(card(inner, pj["title"], "Full video", cap, pj["slug"], "video", more_attrs(more_text(pj), href)))
        for sid in pj["shots"]:
            cap = SHOT_CAPS.get(sid, "")
            inner = (f'<button class="zoom" type="button" data-full="{thumb(sid, 2000)}" data-group="all" data-title="{e(pj["title"])}" data-cap="{e(cap)}"{more_attrs(more_text(pj), href)} aria-label="Enlarge screenshot">'
                     f'<img loading="lazy" src="{thumb(sid, 900)}" alt="{e(cap or pj["title"])}">{FS_ICON}</button>')
            items.append(card(inner, pj["title"], "Screenshot", cap, pj["slug"], "image", more_attrs(more_text(pj), href)))
        for f, c in pj.get("cast", []):
            cap = CAST_CAPS.get(f, "")
            inner = (f'<button class="zoom art" type="button" data-full="assets/art/{f}.webp" data-group="all" data-title="{e(c)}" data-cap="{e(cap)}"{more_attrs(more_text(pj), href)} aria-label="Enlarge: {e(c)}">'
                     f'<img loading="lazy" src="assets/art/{f}.webp" alt="{e(c)}">{FS_ICON}</button>')
            items.append(card(inner, pj["title"], c, cap, pj["slug"], "image", more_attrs(more_text(pj), href)))
    for lbl, f, d, cap in LAB:
        items.append(card(clip_tile(lbl, f, d, 0, cap=cap, group="all", still=True), "Lab", lbl, cap, "lab", "video"))
    for lbl, f, d, cap in EARLY:
        items.append(card(clip_tile(lbl, f, d, 0, cap=cap, group="all", still=True), "Early work", lbl, cap, "early", "video"))
    chips = [("all", ui("chip_all", "Everything")), ("video", ui("chip_video", "Videos")), ("image", ui("chip_image", "Images"))] + [(pj["slug"], e(pj["title"])) for pj in PROJECTS] + [("lab", ui("chip_lab", "Lab")), ("early", ui("chip_early", "Early work"))]
    def chip_style(k):
        th = THEMES.get(k)
        return f' style="--deep:{th[0]};--mid:{th[1]};--accent:{th[2]}"' if th else ""
    chip_html = "".join(f'<button type="button" class="chip{" themed" if k in THEMES else ""}" data-filter="{k}"{chip_style(k)} aria-pressed="{str(k == "all").lower()}">{v}</button>' for k, v in chips)
    html = head("Gallery — Roee Tal", "Every clip, screenshot and character from Roee Tal's projects in one place.", 0, ("#0c2f6e", "#1758b0", "#ffd23f"))
    html += topbar(0, "gallery")
    gal_mosaic = mosaic_html(mosaic_pool("".join(items)))
    html += jump_menu([("#top", "Gallery", "#ff8fc0", "", J_IMG), ("#ggrid", "Browse everything", "#ff8fc0", "sub", "")], 0, site_jump(0))
    html += f"""<section class="phero short gal-hero" id="top">
  {gal_mosaic}
  <div class="wrap phero-copy">{ui("gal_kicker", "Everything in one place", tag="p", cls="kicker")}{ui("gal_title", "Gallery", tag="h1")}<p class="lead">{len(items)} clips, screenshots and characters. Tap any of them to view it full screen.</p></div>
  {WAVE}
</section>
<div class="project"><div class="wrap">
  <div class="chips-row" role="group" aria-label="Filter the gallery">{chip_html}</div>
  <p class="gcount muted" id="gcount" aria-live="polite"></p>
  <div class="ggrid" id="ggrid">{''.join(items)}</div>
</div></div>
"""
    html += footer(0)
    (ROOT / "gallery.html").write_text(html)


# ---------------------------------------------------------------- résumé (CV) page + PDF / PNG files
def _cv_render(variants, depth, edit=False):
    """Run assets/cv.js (the same renderer the editor uses) on every variant."""
    import subprocess
    js = ("const C=require(process.argv[1]);let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const o={};"
          "for(const[id,v]of Object.entries(j.v))o[id]=C.render(v,id,{photo:p=>j.pre+String(p).replace(/^\\//,''),edit:j.edit,icons:j.icons});process.stdout.write(JSON.stringify(o))})")
    r = subprocess.run(["node", "-e", js, str(ROOT / "assets/cv.js")], input=_json.dumps({"v": variants, "pre": "../" * depth, "edit": edit, "icons": {**ICONS_22, **ICON_RAW}}),
                       capture_output=True, text=True, check=True)
    return _json.loads(r.stdout)

def _cv_font(v):
    """Google Fonts URL for a résumé's chosen font (mirrors FONTS in assets/cv.js)."""
    fonts = {"Open Sans": "Open+Sans:ital,wght@0,400;0,600;0,700;1,400", "Inter": "Inter:wght@400;500;600;700", "Lato": "Lato:ital,wght@0,400;0,700;1,400",
             "Source Serif 4": "Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400", "Rubik": "Rubik:ital,wght@0,400;0,500;0,700;1,400", "Assistant": "Assistant:wght@400;600;700"}
    return "https://fonts.googleapis.com/css2?family=" + fonts.get(v.get("font"), fonts["Inter"]) + "&display=swap"

def _cv_file(v):
    """File name base for a résumé's downloads, from the person's name: 'Roee Tal' → 'Roee-Tal-CV'."""
    name = re.sub(r"[^A-Za-z0-9]+", "-", (v.get("person") or {}).get("name") or "CV").strip("-") or "CV"
    return name + "-CV"

def _chrome():
    """Path of a Chrome/Chromium binary for making résumé PDFs/PNGs (CHROME env var, PATH, or Playwright's copy); None if missing."""
    import shutil, glob, os
    for c in (os.environ.get("CHROME"), shutil.which("google-chrome"), shutil.which("google-chrome-stable"), shutil.which("chromium"), shutil.which("chromium-browser"),
              *sorted(glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome")))):
        if c and os.path.exists(c):
            return c
    return None

def build_cv():
    """Write cv.html (the public résumé page with the main résumé, download/share buttons and the data of all public versions) and make their PDFs/PNGs."""
    global DEPTH
    DEPTH = 0
    path = ROOT / "content/cv.json"
    if not path.exists():
        return
    cv = _json.loads(path.read_text())
    allv = cv.get("variants") or {}
    pub = {k: v for k, v in allv.items() if v.get("public", True)}
    if not pub:
        return
    default = cv.get("default") if cv.get("default") in pub else next(iter(pub))
    sheets = _cv_render(pub, 0)
    files = {k: "cv/" + k + ".pdf" for k in pub}
    data = {"default": default, "files": files, "names": {k: _cv_file(v) for k, v in pub.items()},
            "variants": pub, "icons": {**ICONS_22, **ICON_RAW} if any(v.get("show_icons") for v in pub.values()) else {}}
    dv = pub[default]
    html = head(f"Résumé — {(dv.get('person') or {}).get('name', 'Roee Tal')}", "Résumé of Roee Tal, game developer (Unity / Unreal). Download as PDF.", 0)
    html = html.replace("</head>", f'<link rel="stylesheet" href="{_cv_font(dv)}" id="cv-font">\n<link rel="stylesheet" href="assets/cv.css?v={ver("assets/cv.css")}">\n</head>', 1)
    html += topbar(0, "cv")
    nm = data["names"][default]
    html += f"""<div class="cv-bar wrap" id="cvBar">
  <div class="cv-bar-l"><p class="kicker">Résumé</p></div>
  <div class="cv-bar-r">
    <a class="btn small" id="cvPdf" href="{files[default]}" download="{nm}.pdf"><span class="ic">{_icon("download", 16) if "download" in ICONS_22 else ""}</span>Download PDF</a>
    <a class="btn small ghost" id="cvPng" href="cv/{default}.png" download="{nm}.png">Image</a>
    <button class="btn small ghost" type="button" id="cvShare">Share</button>
  </div>
</div>
<div class="cv-print-root cv-stage" id="cvStage">{sheets[default]}</div>
<script id="cv-data" type="application/json">{_json.dumps(data, ensure_ascii=False).replace("</", "<\\/")}</script>
<script src="assets/cv.js?v={ver('assets/cv.js')}"></script>
<script src="assets/cv-page.js?v={ver('assets/cv-page.js')}"></script>
"""
    html += footer(0, peek=False)
    (ROOT / "cv.html").write_text(html)
    _cv_files(pub, default)

def build_tv():
    """tv.html: the Netflix-style screen for TVs (assets/tv.js builds it from the site's own pages)."""
    html = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<title>{e(SITE_TEXT.get("hero_title") or "Roee Tal")} · TV</title><meta name="robots" content="noindex"><meta name="theme-color" content="#0b0b10">'
            f'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@600;800;900&display=swap">'
            f'<link rel="stylesheet" href="assets/tv.css?v={ver("assets/tv.css")}"></head>'
            f'<body><div class="tv" id="tv"><div class="tv-loading">{e((SITE_TEXT.get("hero_title") or "Roee Tal").upper())}</div></div>'
            f'<script src="assets/tv.js?v={ver("assets/tv.js")}"></script></body></html>')
    (ROOT / "tv.html").write_text(html)

def _cv_files(pub, default):
    """PDF + PNG of every public résumé, made by headless Chrome. Only redone when that résumé or its design changed."""
    import subprocess, shutil
    out = ROOT / "cv"
    out.mkdir(exist_ok=True)
    sheets = _cv_render(pub, 1)
    code = hashlib.md5(((ROOT / "assets/cv.js").read_bytes() + (ROOT / "assets/cv.css").read_bytes())).hexdigest()
    hp = out / ".hashes.json"
    old = _json.loads(hp.read_text()) if hp.exists() else {}
    new, chrome = {}, _chrome()
    for k, v in pub.items():
        page = (f'<!doctype html><html lang="{e(v.get("lang", "en"))}"><head><meta charset="utf-8"><meta name="robots" content="noindex">'
                f'<title>{e(_cv_file(v))}</title><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="{_cv_font(v)}">'
                f'<link rel="stylesheet" href="../assets/cv.css"><style>html,body{{margin:0;background:#fff}}</style></head>'
                f'<body><div class="cv-print-root">{sheets[k]}</div></body></html>')
        (out / f"{k}.html").write_text(page)
        h = hashlib.md5((page + code).encode()).hexdigest()
        new[k] = h
        pdf, png = out / f"{k}.pdf", out / f"{k}.png"
        if old.get(k) == h and pdf.exists() and png.exists():
            continue
        if not chrome:
            print("cv: no Chrome here, PDF for", k, "not rebuilt")
            new[k] = old.get(k, "")
            continue
        src = (out / f"{k}.html").resolve().as_uri()
        base = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=10000", "--run-all-compositor-stages-before-draw"]
        try:
            subprocess.run(base + ["--no-pdf-header-footer", f"--print-to-pdf={pdf}", src], capture_output=True, timeout=120)
            subprocess.run(base + ["--window-size=794,1123", "--force-device-scale-factor=2", f"--screenshot={png}", src], capture_output=True, timeout=120)
        except subprocess.TimeoutExpired:
            print("cv: Chrome took too long for", k)
        print("cv: built", pdf.name, png.name)
    hp.write_text(_json.dumps(new, indent=1))
    d = out / f"{default}.pdf"
    if d.exists():                                    # the old address keeps working: it is always the main résumé
        shutil.copyfile(d, ROOT / (_cv_file(pub[default]) + ".pdf"))


if __name__ == "__main__":
    (ROOT / "assets/icons.json").write_text(_json.dumps({**ICONS_22, **ICON_RAW}))  # icon previews in the visual editor
    build_gallery()
    build_index()
    for i, pj in enumerate(PROJECTS):
        build_project(i, pj)
    build_lab()
    build_cv()
    build_tv()
    for i, cp in enumerate(CODE_PAGES):
        build_code_page(i, cp)
    print("built", 3 + len(PROJECTS), "pages")
