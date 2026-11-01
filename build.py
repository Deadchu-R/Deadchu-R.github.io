#!/usr/bin/env python3
"""Builds the static site: index.html, lab.html and one page per project.

Edit the data below, then run:  python3 build.py
Clips live in assets/clips/<file>.mp4 (posters in assets/posters/<file>.jpg).
Until a clip file exists, pages fall back to the Google Drive copy (by id).
"""
from html import escape as e
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).parent

SITE = {
    "name": "Roee Tal",
    "email": "roeetal17@gmail.com",
    "phone": "(+972) 053-337-4350",
    "linkedin": "https://www.linkedin.com/in/roee-tal/",
    "github": "https://github.com/Deadchu-R",
    "showreel": "1rlhZHUS8bYwiMmg42SXIdjwMXsK0N5bz",
}

# theme: (deep, mid, accent) colors for the project's own page
PROJECTS = [
    dict(slug="musical-level", mascot="musical-cat", cast=[('musical-cat', 'The space cat, the playable hero'), ('musical-flower', 'A tentacle flower enemy')], title="A Musical Level", sub="Inspired by Rayman Legends",
         engine="Unity", role="Producer · design · scripting", when="2nd year, Tiltan", context="Game Production course, team project",
         theme=("#1a0b3d", "#4a2398", "#c9a7ff"), cover="1rCzhK2h7CgKMN0q1Rj8IwI3agBA1dbsP",
         hook="A space cat runs, jumps and fights through a level that moves to the beat.",
         about=["Developed in my second year for the Game Production course, the goal was to replicate real-world game production. My team and I created a rhythm-based level inspired by Rayman Legends' beat-driven gameplay.",
                "I served as the Producer, leading the team and making key design decisions. I also contributed to scripting gameplay mechanics, making sure they matched our creative vision and improved the player experience."],
         did=["Produced the team from pitch to a playable level", "Made key design decisions on the beat-driven platforming", "Scripted gameplay mechanics alongside the programmers"],
         sections=[
             ("Action indicators", "Icons that tell the player what the beat wants next.", [
                 ("Jump!", "A bold arrow prompting timely jumps.", "musical-indicator.mp4", "1GmLecwlKi0yxsthTLXaq47NMBzhvEEPW"),
                 ("Attack!", "A fist icon signaling combat moments.", "musical-attack.mp4", "1Wlay5mvFlwNrT6sQCLVBJ7hxzUvdk-CF"),
             ]),
             ("Platforms", "Movement pieces that keep the run tense and readable.", [
                 ("Wall jump & hover", "Jump walls and a hover to stretch a jump.", "musical-walljump.mp4", "1kPgVVUSQZxFdqd71GMiGisgOrqmwEi_3"),
                 ("Trampolines", "Launch pads that throw the player up to the next beat.", "musical-trampoline.mp4", "1pjC3tc_jsP7YIo4875abDV45rqQd-SCI"),
                 ("Shaking platforms", "Unstable platforms that add tension and immersion.", "musical-shaking.mp4", "1hjmNAM8uoKoC1Wm-hAwvpBgZ1a2dcQqT"),
             ]),
         ],
         full="18ezKyaZ6x8iKwvC2Gpj-vhhxqdaGCitd",
         shots=["1rCzhK2h7CgKMN0q1Rj8IwI3agBA1dbsP", "1cuHuKj4H0HIaWXCJpQLxaxdFCUKOtDzX"]),
    dict(slug="shards", mascot="shards-protagonist", cast=[('shards-protagonist', 'The protagonist'), ('shards-shadow', 'A shadow memory'), ('shards-ghost', 'A ghost memory'), ('shards-cityhall', 'City hall')], title="Shards", sub="Isometric story-driven game",
         engine="Unity · C#", role="Programmer", when="Nov 2023 · 3 weeks", context="Hackathon team",
         theme=("#0b3b3a", "#17736b", "#ffd36e"), cover="10P_bsBNsYOX6C94sR7FoAYuW_PC8ax71",
         hook="A man goes back to his hometown to face what happened there.",
         about=["Developed during a three-week hackathon in November 2023 and inspired by the October 7th attack on Israel, this story-driven game follows an adult returning to his hometown to confront unresolved trauma.",
                "The team aimed for a colorful yet unsettling atmosphere, reflecting distorted memories and haunting experiences."],
         did=["Architected a modular dialogue system with ScriptableObjects, so writers add scenes as data", "Text types out letter by letter and fires an OnLetterTyped event that other systems hook into", "Built the UI interactions that move the story forward"],
         sections=[
             ("The dialogue system", "Conversations are data, not code.", [
                 ("Dialogue in action", "ScriptableObject-driven conversations with a typewriter effect.", "shards-dialogue.mp4", "1V9Hw7lS-zYJeBm6_fuOe69KBtvrrVjJk"),
                 ("Gameplay", "Exploring the hometown.", "shards-gameplay.mp4", "1tmPJS60ybrLUhAnFwKSwCj7VyI8NLrSG"),
             ]),
         ],
         full=None,
         shots=["1zjGW8_ae9tuE9bmyLUJHdzC5rAy_sTMs", "16zegm2GpKTfOOXm_tla1LzZwL_C9_Zdd", "1drQqWNwqwsZIWPUU4jKuJ3fDPl8tnlIV", "1C6MJmp797kMPTI44UvfzQVxYKh2cUtT9", "1Dd3c_DEp92QUQXE3ARTjPviLE8tNLoOS", "1RY1cYQJqStXInxQu8B4x_tkVJvZGFlky"]),
    dict(slug="boss-rush", mascot="bossrush-dracovid", cast=[('bossrush-axe', 'Axe fighter'), ('bossrush-mage', 'Mage'), ('bossrush-ranger', 'Ranger'), ('bossrush-dracovid', 'Dracovid, the boss')], title="Boss Rush", sub="Grid-based tactical combat",
         engine="Unity · C#", role="Producer & game designer", when="12/2023 – 09/2024", context="Final year · Game Production 2",
         theme=("#3a0b2a", "#8c1d55", "#ff8fc0"), cover="1ds2k9OIavd8wmB638ZMaas-4uHDBN5dH",
         hook="Three heroes, one giant boss, and a grid. Medicines against disease, inside a microscopic world.",
         about=["Developed in my final year for the Game Production 2 course: a grid-based strategy game where the player controls a party of three characters to defeat a powerful boss.",
                "Set in a microscopic world, it pits bacteria and diseases against medicines, with a focus on strategic teamwork and coordination."],
         did=["Designed the core gameplay loop, the tactical grid mechanics and the overall balance", "Led a cross-functional team of programmers and artists for nine months, through delivery", "Resolved conflicts and blockers between team members to keep the workflow smooth"],
         sections=[
             ("Combat on the grid", "Reading the board, moving, striking.", [
                 ("Tactical view", "A top-down read of the whole battlefield.", "bossrush-tactical.mp4", "1aDkpRLZy3QNMPEeAIcHc3f8_Cf9acxPM"),
                 ("Movement arrow", "Shows where a unit will move on the grid.", "bossrush-arrow.mp4", "1vcp3IeeehFJ_Ppq5JHC6mzsaFMiTb7Pc"),
                 ("Attack sequence", "How a party member's attack plays out.", "bossrush-attack.mp4", "12FAXoXFoiz_-gTPMpAHg0HDlMtjLlzJO"),
             ]),
             ("Effects", "Feedback that makes each action land.", [
                 ("Fireball", "The fireball attack effect.", "bossrush-fireball.mp4", "1HNorCwv_7PXALP_TCjANvZW385rQE3BR"),
                 ("Resource gather", "The effect that plays when resources are gathered.", "bossrush-gather.mp4", "1OZmcyiAOi2JdeSAK5nQF3ZrqDwe8VoyK"),
             ]),
         ],
         full="15gejO8JuCfXQFWnQmd209mHFPer7dyFD",
         shots=[]),
    dict(slug="infiltration", title="Infiltration", sub="FPS level in Unreal Engine 5",
         engine="Unreal 5 · C++ & Blueprints", role="Solo developer", when="06/2024 – 08/2024", context="Final project · Unreal C++ course",
         theme=("#14261f", "#2f5a45", "#e8c36a"), cover="1wghjod73Nu2WRcwxH32Q5rEhXCIN0K6e",
         hook="Sneak into a dictator's compound, steal the chip, get out alive.",
         about=["The final project for my Unreal Engine C++ course: the player infiltrates a military base to retrieve a valuable chip.",
                "I designed an unconventional base with a dictatorship atmosphere using Unreal Marketplace assets, and built the mechanics in a mix of C++ and Blueprints."],
         did=["Programmed raycast-based shooting with recoil feedback, and dynamic weapon pickups", "Developed enemy AI with detection logic and patrol routes for stealth play", "Built the chip objective and designed the compound layout"],
         sections=[
             ("Gunplay", "", [
                 ("Aiming & shooting", "Raycast shots with recoil feedback.", "fps-shooting.mp4", "1n41GdjA2EyP8mzpEkXMg3Bc8eSyndK3N"),
                 ("Weapon pickup", "Grab a new weapon on the fly.", "fps-pickup.mp4", "1DwSYEwlV_wUiXQb3PpXpJhq6zZMLcemI"),
             ]),
             ("Stealth & objective", "", [
                 ("Detected", "Patrolling guards spot the player.", "fps-detected.mp4", "1S2__pZSY-X0TT8gnz3JyDHFArXmIPWk0"),
                 ("The chip", "The interactable objective.", "fps-chip.mp4", "1woY9O2N8uW1xJGtTdQa_9ZSufwajvgii"),
             ]),
         ],
         full="1vL8FiPkjc6uhVvU76h9tpVB-diiNVmWc",
         shots=["1XKdeZXwJXXcGLC-PLBU1AQnQTI0q1Jnl", "1vxite6U0WSEwBSumniwODX1HcLkG5bws", "1A6NvKk0XuyzGLglwsEt_koiogPNRFDMd", "1RSsJOWmaaCGo-ITMmSw50PgxQcOyCOBd", "1VaeqPSLmbuIN1fWtjF4kB5d7_ZKoTFBH", "1Tjj_5cknQ_98sqItEYD7McOjM5rpw7Jk", "1an1Bz7pWXvz1K8BBtg61GLg1WJUE7YDw", "19JMa8TxKunQdd_Ga3ChQp8HwCUkE4sHc", "1uGg_f72WbVOmD-jkJ_3K04-ggVF-CJGE"]),
    dict(slug="almond-bar", title="Almond Bar", sub="Unreal Engine quest game",
         engine="Unreal · Blueprints", role="Solo developer", when="Tiltan", context="Final project · Unreal Blueprints course",
         theme=("#2c0830", "#7a1a73", "#ff7ae0"), cover="1S38ITtBFY7fynF-MWLseHT9h5Q9K5cms",
         hook="My hometown bar, rebuilt brighter. Find the key, talk to the regulars, finish the quest.",
         about=["The final project for my Unreal Engine Blueprints course: an adventure game set in a bar, where the player must retrieve a key and complete a quest.",
                "Inspired by my hometown bar, CharlieBar, I blended its atmosphere with a modern, brightly lit design."],
         did=["Implemented a dialogue and quest system in Blueprints", "Designed and dressed the bar environment"],
         sections=[
             ("Quest flow", "", [
                 ("Dialogue & quest taking", "Talk to an NPC and pick up the quest.", "almond-dialogue.mp4", "1MLFl9JnF-W2McG5Oifk0kycXAbX6_3wq"),
                 ("Mission complete", "Finishing the quest.", "almond-mission.mp4", "1gJONPXImUmGUgLn0zeO4VT1worbnZSCu"),
             ]),
         ],
         full="1v6g2kcwsTc-zuTUEQRORRMUeyW6SRdSC",
         shots=["1I2lAcIWXNzTkPj7L3w5LZN8RkEbfi_41", "17zGlB0VBU26ZydIbjMk7YcrRy41PSAut", "1Gct_kp7cI4xI4Si6gcWkLweDXTAHItSC", "1EOJa-7DdPolPhDGGo32evJwWnIpR6tfh"]),
]

LAB = [
    ("World-bending shader", "lab-worldbend.mp4", "1w8G1TMj93LvZqCNxYdG46o4rOHp4_2i2", "A shader that bends the world as it moves away from the camera."),
    ("Toon shader", "lab-toon.mp4", "17zl6JE6t6rm-GDynooXcIjXIdwDehpk6", "Cel-shaded lighting with hard color steps."),
    ("Hatching in Shader Graph", "lab-hatching.mp4", "1Sne0ks3fKGrbedu_LFnLIw84JBKD-g9a", "Pencil-style hatching shading, built in Shader Graph."),
    ("Plane-bending shader", "lab-planebend.mp4", "1lEnZM78NR3td-blCaTno0pfAXRFfc597", "A shader that curves a flat plane."),
    ("Tile-map engine", "lab-tilemap.mp4", "1sUZPRr_thhO3rtqT5IQf4YXVsv4wBNZL", "A tile-map engine running a level."),
    ("Chess on the tile-map engine", "lab-chess.mp4", "1srlkDJalpOIqbZGvRddobo8xjGCLa_Qi", "A chess game built on top of the tile-map engine."),
    ("Card-draw system", "lab-cards.mp4", "1_WDc8rzjxa7d6zPILMB0E2DsOPjuMyQc", "Drawing cards into the player's hand."),
    ("Multiplayer login UI", "lab-mpui.mp4", "1Cy7YyN8rTMAOnD0nJ3wLVHLuxE2zXoeL", "Login and password screen for a multiplayer game."),
    ("Escape-room camera", "lab-escapecam.mp4", "1t1hd1aLov8GhUp2G_fn2yfejbeJVwUdd", "Camera control for an escape-room game."),
    ("AI training", "lab-aitraining.mp4", "1fDZRyrlEcJ4YKWOP8dyob5qL3pHyhs_M", "Training an AI agent."),
    ("Portal × Angry Birds", "lab-portal.mp4", "1hr7Xf76Kqlwt1apXkOBeSaaSp1PVswgI", "Angry Birds-style launching, with portals."),
    ("3-lane runner", "lab-runner.mp4", "1aEOUM2jy6SdJU2bQzpZQ59jWytxGDc66", "A hyper-casual three-lane runner."),
    ("Space Invaders", "lab-invaders.mp4", "1kC6Ikjb6H7kVDjeW56lN_Uv9p8GIGsbq", "A Space Invaders remake."),
    ("Snake", "lab-snake.mp4", "14TZn87SvelWovus4Zn1E_RqhUrwqV5jg", "A Snake remake."),
    ("Snow shader", "lab-snow.mp4", "164BZh7NNCB082xrTOb3skcxzQ4GvIAGH", "A shader that covers objects in snow."),
    ("Aquarium in Unreal 4", "lab-aquarium.mp4", "1n7Sllz8QFlxmMBKCmnPvlq9hYfAx8_-d", "An aquarium scene built in Unreal Engine 4."),
]


DEPTH = 0  # set per page so local asset paths resolve


SHOT_CAPS = {  # one line shown under each enlarged screenshot
    "1rCzhK2h7CgKMN0q1Rj8IwI3agBA1dbsP": "The space cat runs under a tree full of staring eyes.",
    "1cuHuKj4H0HIaWXCJpQLxaxdFCUKOtDzX": "Level design overview of the whole stage.",
    "1zjGW8_ae9tuE9bmyLUJHdzC5rAy_sTMs": "The hometown, in isometric view.",
    "16zegm2GpKTfOOXm_tla1LzZwL_C9_Zdd": "Top-down layout of the hometown map.",
    "1drQqWNwqwsZIWPUU4jKuJ3fDPl8tnlIV": "NPC data component: each NPC links its dialogue sheet, UI handler and speech bubble.",
    "1C6MJmp797kMPTI44UvfzQVxYKh2cUtT9": "The typewriter method that types dialogue letter by letter.",
    "1Dd3c_DEp92QUQXE3ARTjPviLE8tNLoOS": "A dialogue sheet: pages of conversation stored as data.",
    "1RY1cYQJqStXInxQu8B4x_tkVJvZGFlky": "An NPC ID asset holding the guard's name and icons.",
    "1XKdeZXwJXXcGLC-PLBU1AQnQTI0q1Jnl": "Inside the watchtower.",
    "1vxite6U0WSEwBSumniwODX1HcLkG5bws": "The dictator's building, first floor.",
    "1A6NvKk0XuyzGLglwsEt_koiogPNRFDMd": "The dictator's building, second floor.",
    "1RSsJOWmaaCGo-ITMmSw50PgxQcOyCOBd": "Inside the hospital.",
    "1VaeqPSLmbuIN1fWtjF4kB5d7_ZKoTFBH": "The hospital from outside.",
    "1Tjj_5cknQ_98sqItEYD7McOjM5rpw7Jk": "The armoury.",
    "1an1Bz7pWXvz1K8BBtg61GLg1WJUE7YDw": "The soldiers' bedroom.",
    "19JMa8TxKunQdd_Ga3ChQp8HwCUkE4sHc": "A statue in front of one of the base's buildings.",
    "1uGg_f72WbVOmD-jkJ_3K04-ggVF-CJGE": "The military base in the desert.",
    "1I2lAcIWXNzTkPj7L3w5LZN8RkEbfi_41": "The bar, inspired by CharlieBar.",
    "17zGlB0VBU26ZydIbjMk7YcrRy41PSAut": "The bar seen from the entrance.",
    "1Gct_kp7cI4xI4Si6gcWkLweDXTAHItSC": "The lounge seating area.",
    "1EOJa-7DdPolPhDGGo32evJwWnIpR6tfh": "The restroom, part of the quest.",
}

CAST_CAPS = {
    "musical-cat": "The playable hero.",
    "musical-flower": "An enemy waiting in the level.",
    "shards-protagonist": "The man returning to his hometown.",
    "shards-shadow": "A figure from his distorted memories.",
    "shards-ghost": "Another figure from his memories.",
    "shards-cityhall": "A building from the hometown.",
    "bossrush-axe": "One of the three party members.",
    "bossrush-mage": "One of the three party members.",
    "bossrush-ranger": "One of the three party members.",
    "bossrush-dracovid": "The boss the party fights.",
}


def thumb(i, w=1280):
    small = w <= 900
    name = f"{i}-s.jpg" if small else f"{i}.jpg"
    if (ROOT / "assets/img" / name).exists():
        return "../" * DEPTH + "assets/img/" + name
    return f"https://drive.google.com/thumbnail?id={i}&sz=w{w}"


FULL = {  # Drive id of a full video -> local compressed file in assets/full
    "15gejO8JuCfXQFWnQmd209mHFPer7dyFD": "bossrush",
    "1vL8FiPkjc6uhVvU76h9tpVB-diiNVmWc": "infiltration",
    "18ezKyaZ6x8iKwvC2Gpj-vhhxqdaGCitd": "musical-level",
    "1v6g2kcwsTc-zuTUEQRORRMUeyW6SRdSC": "almond-bar",
    "1rlhZHUS8bYwiMmg42SXIdjwMXsK0N5bz": "showreel",
}


def play_attrs(drive_id, title, cap="The full gameplay video."):
    """Attributes for a button that opens a full video: local file if present, Drive otherwise."""
    name = FULL.get(drive_id)
    src = ""
    if name and (ROOT / "assets/full" / f"{name}.mp4").exists():
        src = "../" * DEPTH + f"assets/full/{name}.mp4"
    return f'data-play-drive="{drive_id}" data-src="{src}" data-title="{e(title)}" data-cap="{e(cap)}"'



def has_clip(f):
    return (ROOT / "assets/clips" / f).exists()


WAVE = '<svg class="wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40 C 240 90 480 0 720 34 S 1200 80 1440 30 V80 H0Z"/></svg>'


def ver(path):
    """Short content hash so browsers fetch new CSS/JS right after an update."""
    return hashlib.md5((ROOT / path).read_bytes()).hexdigest()[:8]


def head(title, desc, depth, theme=None):
    p = "../" * depth
    style = ""
    if theme:
        style = f'<style>:root{{--deep:{theme[0]};--mid:{theme[1]};--accent:{theme[2]}}}</style>'
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="{theme[0] if theme else '#0c2f6e'}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600;800;900&family=Roboto:ital,wght@0,400;0,700;1,400&display=swap">
<link rel="stylesheet" href="{p}assets/site.css?v={ver('assets/site.css')}">
{style}
</head>
<body>
"""


def topbar(depth, current=""):
    p = "../" * depth
    def a(href, label, key):
        cur = ' aria-current="page"' if key == current else ""
        return f'<a href="{p}{href}"{cur}>{label}</a>'
    return f"""<header class="topbar"><div class="wrap">
<a class="mark" href="{p}index.html">Roee Tal</a>
<nav>{a('index.html#projects','Projects','projects')}{a('gallery.html','Gallery','gallery')}{a('lab.html','Lab','lab')}{a('Roee-Tal-CV.pdf','CV','cv')}{a('index.html#contact','Contact','contact')}</nav>
</div></header>
"""


def footer(depth):
    p = "../" * depth
    return f"""<footer class="foot" id="contact">
<svg class="foot-wave" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C 260 80 520 0 760 30 S 1220 70 1440 22 V70 H0Z"/></svg>
<div class="peekcat" aria-hidden="true"><img src="{p}assets/art/musical-cat.webp" alt="" loading="lazy"></div>
<div class="wrap foot-grid">
  <div>
    <h2>Let's make games together</h2>
    <p class="muted">Open to Unity and Unreal developer roles in Israel.</p>
  </div>
  <div class="contact-lines">
    <div class="copyrow"><span class="email" id="email">{SITE['email']}</span><button class="btn ghost" type="button" data-copy="#email">Copy</button></div>
    <span class="muted">{e(SITE['phone'])}</span>
    <div class="btns">
      <a class="btn" href="mailto:{SITE['email']}">Email me</a>
      <a class="btn ghost" href="{SITE['linkedin']}" target="_blank" rel="noopener">LinkedIn</a>
      <a class="btn ghost" href="{SITE['github']}" target="_blank" rel="noopener">GitHub</a>
      <a class="btn ghost" href="{p}Roee-Tal-CV.pdf" target="_blank" rel="noopener">CV</a>
    </div>
  </div>
</div>
<div class="wrap small muted">© {SITE['name']}</div>
</footer>
<div class="viewer" id="viewer" hidden role="dialog" aria-modal="true" aria-label="Video player">
  <div class="viewer-top"><div class="viewer-text"><span id="viewerTitle"></span><div class="cap-row"><p id="viewerCap"></p><button class="info" type="button" id="viewerInfo" aria-label="Show full description" aria-expanded="false" hidden>i</button></div><div class="viewer-more" id="viewerMore"><p id="viewerMoreText"></p><a id="viewerLink" href="#">Open the project page →</a></div></div><button class="btn ghost" type="button" id="viewerClose">Close ✕</button></div>
  <div class="viewer-stage" id="viewerStage"></div>
  <button class="nav nav-prev" type="button" id="viewerPrev" aria-label="Previous image"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z" fill="currentColor"/></svg></button>
  <button class="nav nav-next" type="button" id="viewerNext" aria-label="Next image"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M8.6 18.6 10 20l8-8-8-8-1.4 1.4 6.6 6.6z" fill="currentColor"/></svg></button>
</div>
<script src="{p}assets/site.js?v={ver('assets/site.js')}" defer></script>
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
    return f' data-more="{e(text)}"' + (f' data-href="{href}"' if href else "")


FS_ICON = '<span class="fs" title="Full screen"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM6 15v3h3v2H4v-5h2zm12 0h2v5h-5v-2h3v-3z" fill="currentColor"/></svg></span>'


def clip_tile(label, file, did, depth, big=False, cap="", group="", still=False, more=""):
    p = "../" * depth
    poster = f"{p}assets/posters/{file.replace('.mp4', '.jpg')}"
    if not (ROOT / "assets/posters" / file.replace(".mp4", ".jpg")).exists():
        poster = thumb(did, 960)
    src = f"{p}assets/clips/{file}" if has_clip(file) else ""
    return (f'<button class="clip{" big" if big else ""}" type="button"{f' data-group="{group}"' if group else ""}{" data-still" if still else ""} data-src="{src}" data-drive="{did}" data-title="{e(label)}" data-cap="{e(cap)}"{more} aria-label="Play video: {e(label)}">'
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

def build_index():
    global DEPTH
    DEPTH = 0
    tiles = []
    for i, pj in enumerate(PROJECTS):
        tiles.append(f"""<a class="ptile" id="p-{pj['slug']}" href="projects/{pj['slug']}.html" data-mid="{pj['theme'][1]}" data-deep="{pj['theme'][0]}" style="--deep:{pj['theme'][0]};--mid:{pj['theme'][1]};--accent:{pj['theme'][2]}">
  <span class="ptile-img"><img loading="lazy" onerror="this.style.visibility='hidden'" src="{thumb(pj['cover'], 900)}" alt="{e(pj['title'])} screenshot">{f'<img class="peek" loading="lazy" src="assets/art/{pj["mascot"]}.webp" alt="">' if pj.get("mascot") else ""}</span>
  <span class="ptile-body">
    <span class="kicker">{e(pj['engine'])}</span>
    <span class="ptile-title">{e(pj['title'])}</span>
    <span class="ptile-hook">{e(pj['hook'])}</span>
    <span class="more">View project →</span>
  </span>
</a>""")
    slides = "".join(f'<img onerror="this.remove()" src="{thumb(pj["cover"], 1600)}" alt="" style="--i:{i}">' for i, pj in enumerate(PROJECTS))
    hero_video = ""
    if (ROOT / "assets/hero.mp4").exists():
        hero_video = '<video class="hero-video" data-wide="assets/hero.mp4" data-tall="assets/hero-m.mp4" muted loop playsinline autoplay preload="auto" aria-hidden="true"></video>'
    html = head("Roee Tal — Game Developer", "Roee Tal, game developer. Gameplay systems in Unity and Unreal Engine.", 0)
    html += topbar(0)
    # decorative film-strip mosaic behind the Gallery & lab band
    rows = []
    for r in range(4):
        ids = [(r * 7 + k * 3) % 24 + 1 for k in range(8)]
        imgs = "".join(f'<img src="assets/thumbs/t{i:02d}.jpg" loading="lazy" alt="">' for i in ids)
        rows.append(f'<div class="mrow"><div class="mtrack">{imgs}{imgs}</div></div>')
    mosaic = '<div class="mosaic" aria-hidden="true">' + "".join(rows) + '</div><div class="mosaic-wash" aria-hidden="true"></div>'
    rail_items = [("top","Home","#ffd23f","")]+[("projects","Projects","#5aa0ff","")]+[(f"p-{pj['slug']}",pj['title'],pj['theme'][2],"sub") for pj in PROJECTS]+[("now","Currently","#38b6ff",""),("gallery-lab","Gallery & lab","#ff8fc0",""),("contact","Contact","#6fd3c2","")]
    rail = '<nav class="rail" aria-label="Jump to a section">' + "".join(f'<a class="{c}" href="#{i}" style="--c:{col}"><span>{e(t)}</span></a>' for i,t,col,c in rail_items) + '</nav>\n'
    html += rail
    html += f"""<section class="hero" id="top">
  <div class="hero-media">{hero_video or f'<div class="slides" aria-hidden="true">{slides}</div>'}</div>
  <div class="wrap hero-copy">
    <p class="kicker">Game developer · Unity &amp; Unreal Engine</p>
    <h1>Roee Tal</h1>
    <p class="lead">I build the systems players touch: combat, AI, dialogue and UI. Unreal developer at 3DVision, trained in game design and development at Tiltan.</p>
    <div class="btns">
      <a class="btn" href="#projects">See projects</a>
      <button class="btn ghost" type="button" {play_attrs(SITE['showreel'], 'Showreel', 'Projects from my three years of game development at Tiltan.')}>▶ Watch showreel</button>
    </div>
  </div>
  {WAVE}
</section>

<section class="band blue palette-band" id="projects">
  <div class="wrap">
    <div class="sec-head"><h2>Projects</h2><p class="muted">Five games from design to code. Each opens its own page with clips.</p></div>
    <div class="ptiles">{''.join(tiles)}</div>
  </div>
</section>

<section class="band now" id="now">
  <div class="wrap now-grid">
    <div class="now-copy">
      <p class="kicker">Currently · since 02/2025</p>
      <h2>Unreal Developer at 3DVision</h2>
      <p class="muted">Tel Aviv · real-time interactive simulation apps for real-estate companies</p>
      <div class="tools"><span class="tool"><i style="--c:#e8e8e8"></i>Unreal Engine 5</span><span class="tool"><i style="--c:#3d8bff"></i>Blueprints</span><span class="tool"><i style="--c:#6fd3c2"></i>Cesium for Unreal</span></div>
      <ul class="ticks">
        <li>Develop and integrate interactive features based on client requests</li>
        <li>Debug and optimize complex logic and Blueprints across multiple projects</li>
        <li>Build custom UI elements and functionality for each client</li>
      </ul>
    </div>
    <figure class="bp">
      <div class="win-bar"><span class="win-ico" aria-hidden="true"></span><span class="win-title">BP_ApartmentTour (illustration)</span><span class="win-ctl" aria-hidden="true"><i>&#x2212;</i><i>&#x25A1;</i><i class="x">&#x2715;</i></span></div>
      <div class="ue-tabs" aria-hidden="true"><span class="ue-tab">BP_ApartmentTour</span></div>
      <div class="ue-crumb" aria-hidden="true"><span>BP_ApartmentTour</span><b>›</b><span>Event Graph</span><em>Zoom 1:1</em></div>
      <div class="bp-body"><span class="demo-badge">AI-assisted illustration · not real project code</span>{bp_svg()}</div>
      <figcaption><b>Illustration, made with AI tools.</b> A mock-up of the kind of Blueprint logic I work on. It isn&#x27;t from a real project: client work at 3DVision is under NDA.</figcaption>
    </figure>
  </div>
  <div class="wrap">
    <ol class="timeline">
      <li><span class="when">2021–2024</span><b>Tiltan, Haifa</b><span class="muted">Game design &amp; development. Five games in Unity and Unreal.</span></li>
      <li><span class="when">02/2025</span><b>3DVision, Tel Aviv</b><span class="muted">Unreal developer on real-time simulation apps.</span></li>
      <li class="tl-next"><span class="when">Next</span><b>Your team?</b><a class="muted" href="#contact">Open to Unity and Unreal roles →</a></li>
    </ol>
  </div>
</section>

<section class="band lab-teaser" id="gallery-lab">
  {mosaic}
  <div class="wrap lab-row">
    <div><h2>Gallery &amp; lab</h2><p class="muted">Every clip, screenshot and character in one place, plus shaders, a tile-map engine and other things I built to learn how they work.</p></div>
    <div class="btns"><a class="btn" href="gallery.html">Open the gallery →</a><a class="btn ghost" href="lab.html">The lab</a></div>
  </div>
</section>
"""
    html += footer(0)
    (ROOT / "index.html").write_text(html)


def build_project(i, pj):
    global DEPTH
    depth = DEPTH = 1
    nxt = PROJECTS[(i + 1) % len(PROJECTS)]
    sections = []
    first = True
    for title, intro, clips in pj["sections"]:
        sec_more = more_attrs(more_text(pj, (title, intro)))
        tiles = "".join(
            f'<figure class="mech">{clip_tile(lbl, f, d, depth, big=(len(clips) == 1), cap=cap, more=sec_more)}<figcaption><b>{e(lbl)}</b>{(" " + e(cap)) if cap else ""}</figcaption></figure>'
            for lbl, cap, f, d in clips)
        sections.append(f"""<section class="mech-sec">
  <h2>{e(title)}</h2>{f'<p class="muted center">{e(intro)}</p>' if intro else ''}
  <div class="mech-grid n{min(len(clips), 3)}">{tiles}</div>
</section>""")
        first = False
    shots = ""
    if pj["shots"]:
        shots = '<section class="mech-sec"><h2>Screenshots</h2><div class="shots">' + "".join(
            f'<button class="zoom" type="button" data-full="{thumb(s, 2000)}" data-group="shots" data-title="Screenshot" data-cap="{e(SHOT_CAPS.get(s, ""))}"{more_attrs(more_text(pj))} aria-label="Enlarge screenshot"><img loading="lazy" onerror="this.style.visibility=\'hidden\'" src="{thumb(s, 900)}" alt="{e(pj["title"])} screenshot">{FS_ICON}</button>' for s in pj["shots"]) + "</div></section>"
    full = ""
    if pj["full"]:
        full = f'<section class="mech-sec center"><h2>Full video showcase</h2><button class="btn" type="button" {play_attrs(pj["full"], pj["title"] + " · full video")}{more_attrs(more_text(pj))}>▶ Play full video</button></section>'
    cast = ""
    if pj.get("cast"):
        cast = '<section class="mech-sec"><h2>Characters</h2><div class="cast">' + "".join(
            f'<figure><button class="zoom bare" type="button" data-full="../assets/art/{f}.webp" data-group="cast" data-title="{e(c)}" data-cap="{e(CAST_CAPS.get(f, ""))}"{more_attrs(more_text(pj))} aria-label="Enlarge: {e(c)}"><img loading="lazy" src="../assets/art/{f}.webp" alt="{e(c)}">{FS_ICON}</button><figcaption>{e(c)}</figcaption></figure>' for f, c in pj["cast"]) + "</div></section>"
    html = head(f"{pj['title']} — Roee Tal", pj["hook"], depth, pj["theme"])
    html += topbar(depth, "projects")
    html += f"""<section class="phero">
  <img class="phero-bg" onerror="this.remove()" src="{thumb(pj['cover'], 1800)}" alt="">
  {f'<img class="mascot" src="../assets/art/{pj["mascot"]}.webp" alt="">' if pj.get("mascot") else ""}
  <div class="wrap phero-copy">
    <p class="kicker">{e(pj['engine'])}</p>
    <h1>{e(pj['title'])}</h1>
    <p class="lead">{e(pj['sub'])}</p>
  </div>
  {WAVE}
</section>

<div class="project">
  <section class="wrap intro">
    <div class="intro-text">
      <p class="hook">{e(pj['hook'])}</p>
      {''.join(f'<p>{e(a)}</p>' for a in pj['about'])}
      <h3 class="kicker">What I did</h3>
      <ul class="ticks">{''.join(f'<li>{e(d)}</li>' for d in pj['did'])}</ul>
    </div>
    <dl class="facts">
      <div><dt>Role</dt><dd>{e(pj['role'])}</dd></div>
      <div><dt>Engine</dt><dd>{e(pj['engine'])}</dd></div>
      <div><dt>When</dt><dd>{e(pj['when'])}</dd></div>
      <div><dt>Context</dt><dd>{e(pj['context'])}</dd></div>
    </dl>
  </section>
  <div class="wrap">{cast}{''.join(sections)}{shots}{full}</div>
  <a class="next wrap" href="{nxt['slug']}.html"><span class="kicker">Next project</span><span class="next-title">{e(nxt['title'])} →</span></a>
</div>
"""
    html += footer(depth)
    (ROOT / "projects").mkdir(exist_ok=True)
    (ROOT / "projects" / f"{pj['slug']}.html").write_text(html)


def build_lab():
    global DEPTH
    DEPTH = 0
    tiles = "".join(f'<figure class="mech">{clip_tile(lbl, f, d, 0, cap=cap)}<figcaption><b>{e(lbl)}</b> {e(cap)}</figcaption></figure>' for lbl, f, d, cap in LAB)
    html = head("The Lab — Roee Tal", "Shaders, systems and course experiments by Roee Tal.", 0, ("#0c2f6e", "#1758b0", "#ffd23f"))
    html += topbar(0, "lab")
    html += f"""<section class="phero short">
  <div class="wrap phero-copy"><p class="kicker">Experiments</p><h1>The lab</h1><p class="lead">Small things I built to learn how they work: shaders, engines, UI and mini-games.</p></div>
  {WAVE}
</section>
<div class="project"><div class="wrap"><section class="mech-sec"><div class="mech-grid n3">{tiles}</div></section></div></div>
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
        info = f'<button class="info" type="button" aria-label="Show description" aria-expanded="false">i</button>' if (cap or more) else ""
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
                items.append(card(clip_tile(lbl, f, d, 0, cap=cap, group="all", still=True, more=m), pj["title"], lbl, cap, pj["slug"], "video", m))
        if pj["full"]:
            name = FULL.get(pj["full"])
            poster = f"assets/posters/full-{name}.jpg" if name and (ROOT / f"assets/posters/full-{name}.jpg").exists() else thumb(pj["cover"], 900)
            src = f"assets/full/{name}.mp4" if name and (ROOT / f"assets/full/{name}.mp4").exists() else ""
            cap = "The full gameplay video."
            inner = (f'<button class="clip" type="button" data-group="all" data-still data-src="{src}" data-drive="{pj["full"]}" data-title="{e(pj["title"])} · full video" data-cap="{cap}"{more_attrs(more_text(pj), href)} aria-label="Play the full {e(pj["title"])} video">'
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
    chips = [("all", "Everything"), ("video", "Videos"), ("image", "Images")] + [(pj["slug"], pj["title"]) for pj in PROJECTS] + [("lab", "Lab")]
    def chip_style(k):
        th = THEMES.get(k)
        return f' style="--deep:{th[0]};--mid:{th[1]};--accent:{th[2]}"' if th else ""
    chip_html = "".join(f'<button type="button" class="chip{" themed" if k in THEMES else ""}" data-filter="{k}"{chip_style(k)} aria-pressed="{str(k == "all").lower()}">{e(v)}</button>' for k, v in chips)
    html = head("Gallery — Roee Tal", "Every clip, screenshot and character from Roee Tal's projects in one place.", 0, ("#0c2f6e", "#1758b0", "#ffd23f"))
    html += topbar(0, "gallery")
    html += f"""<section class="phero short">
  <div class="wrap phero-copy"><p class="kicker">Everything in one place</p><h1>Gallery</h1><p class="lead">{len(items)} clips, screenshots and characters. Tap any of them to view it full screen.</p></div>
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


if __name__ == "__main__":
    build_index()
    for i, pj in enumerate(PROJECTS):
        build_project(i, pj)
    build_lab()
    build_gallery()
    print("built", 3 + len(PROJECTS), "pages")
