#!/usr/bin/env python3
"""Builds the static site: index.html, lab.html and one page per project.

Edit the data below, then run:  python3 build.py
Clips live in assets/clips/<file>.mp4 (posters in assets/posters/<file>.jpg).
Until a clip file exists, pages fall back to the Google Drive copy (by id).
"""
from html import escape as e
from pathlib import Path
import hashlib

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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600;800;900&display=swap">
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
<nav>{a('index.html#projects','Projects','projects')}{a('lab.html','Lab','lab')}{a('Roee-Tal-CV.pdf','CV','cv')}{a('index.html#contact','Contact','contact')}</nav>
</div></header>
"""


def footer(depth):
    p = "../" * depth
    return f"""<footer class="foot" id="contact">
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
  <div class="viewer-top"><div class="viewer-text"><span id="viewerTitle"></span><p id="viewerCap"></p></div><button class="btn ghost" type="button" id="viewerClose">Close ✕</button></div>
  <div class="viewer-stage" id="viewerStage"></div>
  <button class="nav nav-prev" type="button" id="viewerPrev" aria-label="Previous image"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z" fill="currentColor"/></svg></button>
  <button class="nav nav-next" type="button" id="viewerNext" aria-label="Next image"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M8.6 18.6 10 20l8-8-8-8-1.4 1.4 6.6 6.6z" fill="currentColor"/></svg></button>
</div>
<script src="{p}assets/site.js?v={ver('assets/site.js')}" defer></script>
</body>
</html>
"""


def clip_tile(label, file, did, depth, big=False, cap=""):
    p = "../" * depth
    poster = f"{p}assets/posters/{file.replace('.mp4', '.jpg')}"
    if not (ROOT / "assets/posters" / file.replace(".mp4", ".jpg")).exists():
        poster = thumb(did, 960)
    src = f"{p}assets/clips/{file}" if has_clip(file) else ""
    return (f'<button class="clip{" big" if big else ""}" type="button" data-src="{src}" data-drive="{did}" data-title="{e(label)}" data-cap="{e(cap)}" aria-label="Play video: {e(label)}">'
            f'<video muted loop playsinline preload="none" poster="{poster}"></video>'
            f'<span class="fs" title="Full screen"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM6 15v3h3v2H4v-5h2zm12 0h2v5h-5v-2h3v-3z" fill="currentColor"/></svg></span></button>')


def build_index():
    global DEPTH
    DEPTH = 0
    tiles = []
    for i, pj in enumerate(PROJECTS):
        tiles.append(f"""<a class="ptile" href="projects/{pj['slug']}.html" style="--deep:{pj['theme'][0]};--mid:{pj['theme'][1]};--accent:{pj['theme'][2]}">
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
    html += f"""<section class="hero">
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

<section class="band blue" id="projects">
  <div class="wrap">
    <div class="sec-head"><h2>Projects</h2><p class="muted">Five games from design to code. Each opens its own page with clips.</p></div>
    <div class="ptiles">{''.join(tiles)}</div>
  </div>
</section>

<section class="band now">
  <div class="wrap now-grid">
    <div>
      <p class="kicker">Currently · since 02/2025</p>
      <h2>Unreal Developer at 3DVision</h2>
      <p class="muted">Tel Aviv · real-time interactive simulation apps for real-estate companies</p>
    </div>
    <ul class="ticks">
      <li>Develop and integrate interactive features based on client requests</li>
      <li>Debug and optimize complex logic and Blueprints across multiple projects</li>
      <li>Build custom UI elements and functionality for each client</li>
      <li>Before that: game design and development at Tiltan, Haifa (2021–2024)</li>
    </ul>
  </div>
</section>

<section class="band lab-teaser">
  <div class="wrap lab-row">
    <div><h2>The lab</h2><p class="muted">Shaders, a tile-map engine, multiplayer UI and other things I built to learn how they work.</p></div>
    <a class="btn" href="lab.html">Open the lab →</a>
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
        tiles = "".join(
            f'<figure class="mech">{clip_tile(lbl, f, d, depth, big=(len(clips) == 1), cap=cap)}<figcaption><b>{e(lbl)}</b>{(" " + e(cap)) if cap else ""}</figcaption></figure>'
            for lbl, cap, f, d in clips)
        sections.append(f"""<section class="mech-sec">
  <h2>{e(title)}</h2>{f'<p class="muted center">{e(intro)}</p>' if intro else ''}
  <div class="mech-grid n{min(len(clips), 3)}">{tiles}</div>
</section>""")
        first = False
    shots = ""
    if pj["shots"]:
        shots = '<section class="mech-sec"><h2>Screenshots</h2><div class="shots">' + "".join(
            f'<button class="zoom" type="button" data-full="{thumb(s, 2000)}" data-group="shots" data-cap="{e(SHOT_CAPS.get(s, ""))}" aria-label="Enlarge screenshot"><img loading="lazy" onerror="this.style.visibility=\'hidden\'" src="{thumb(s, 900)}" alt="{e(pj["title"])} screenshot"></button>' for s in pj["shots"]) + "</div></section>"
    full = ""
    if pj["full"]:
        full = f'<section class="mech-sec center"><h2>Full video showcase</h2><button class="btn" type="button" {play_attrs(pj["full"], pj["title"] + " · full video")}>▶ Play full video</button></section>'
    cast = ""
    if pj.get("cast"):
        cast = '<section class="mech-sec"><h2>Characters</h2><div class="cast">' + "".join(
            f'<figure><button class="zoom bare" type="button" data-full="../assets/art/{f}.webp" data-group="cast" data-title="{e(c)}" data-cap="{e(CAST_CAPS.get(f, ""))}" aria-label="Enlarge: {e(c)}"><img loading="lazy" src="../assets/art/{f}.webp" alt="{e(c)}"></button><figcaption>{e(c)}</figcaption></figure>' for f, c in pj["cast"]) + "</div></section>"
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


if __name__ == "__main__":
    build_index()
    for i, pj in enumerate(PROJECTS):
        build_project(i, pj)
    build_lab()
    print("built", 2 + len(PROJECTS), "pages")
