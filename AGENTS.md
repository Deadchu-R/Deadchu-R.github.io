# AGENTS.md — start here (for AI coding agents and developers)

This is the source of **roeetal.com**, Roee Tal's portfolio site. Roee is a game / Unreal developer. He writes Hebrew and edits the site mostly by himself through the **visual editor** (`?edit`) and its **AI assistant**.

Read this file first. Then use the guide that fits your task:

| Task | Read |
|---|---|
| How the pieces fit together: build, pages, scripts, the GitHub Action | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Changing content, or adding a field to a JSON file | [docs/CONTENT.md](docs/CONTENT.md) |
| Working on the visual editor (`assets/edit.js`): markers, menus, publishing, the résumé builder, the TV screen | [docs/EDITOR.md](docs/EDITOR.md) |
| Working on the AI assistant: providers, rule commands, tools, guides | [docs/AI.md](docs/AI.md) |
| Looking up a term ("skin", "data-x", "variant", "hold menu", or Hebrew words like סקשן) | [docs/GLOSSARY.md](docs/GLOSSARY.md) |
| Finding what changed and when | [CHANGELOG.md](CHANGELOG.md) (summary) · [docs/COMMITS.md](docs/COMMITS.md) (every commit with its files, generated) |

## 1. The 30-second model

```
content/*.json  ──(python3 build.py)──▶  index.html, projects/*.html, code/*.html, gallery.html, lab.html, cv.html, tv.html
     ▲                                       │
     │ Publish (GitHub API, owner's token)   │ GitHub Pages serves the repo as-is
     │                                       ▼
assets/edit.js  ◀──── loaded only with ?edit ──── the live site (assets/site.js, site.css, skins, tv.js, cv-page.js)
```

* **Content is data.** Every text, picture, color and order lives in `content/*.json`. The HTML pages are **generated**.
* **Build:** `python3 build.py` reads the JSON (through `content_loader.py`) and writes the HTML. It also converts media and makes the résumé PDFs/PNGs. Node runs the shared renderers `assets/sections.js` and `assets/cv.js`, so the build and the editor produce the same markup.
* **Deploy:** every push to `main` runs `.github/workflows/build.yml`, which runs `python3 build.py` and commits the output as `Rebuild site [skip ci]`. GitHub Pages then serves that commit.
* **Editing on the live site:** open `roeetal.com/?edit` and sign in. `assets/edit.js` makes the page editable and saves changes into the JSON in memory. **Publish** commits the changed JSON (and uploads) to GitHub, and the Action rebuilds the site.

## 2. Rules (must follow)

1. **Never write secrets anywhere.** That covers files, docs, commit messages, comments and logs. Secrets here are GitHub tokens, the editor password and API keys.
   * The owner's GitHub token is stored only **encrypted** in `assets/editor-auth.json`. It is AES-GCM, with the key derived by PBKDF2 from username and password. Don't decrypt it, print it, or add other copies.
   * Gemini keys and similar stay in the visitor's own browser (localStorage).
   * The repo is **public**.
2. **Don't hand-edit generated files**, because the next build overwrites them. Change `content/*.json`, `build.py` or the renderers instead. Generated files:
   * `index.html`, `gallery.html`, `lab.html`, `cv.html`, `tv.html`
   * `projects/*.html`, `code/*.html`, `snippets/`
   * `cv/*`, `Roee-Tal-CV.pdf`
   * the media copies under `assets/{img,thumbs,full,posters,clips,art,cv}/`
3. **After any change to content, build.py or a renderer, run `python3 build.py`**, then check the result in a browser.
4. **Don't commit résumé PDFs/PNGs made on your machine.** Without the site's fonts installed, Chrome uses fallback fonts and the files come out wrong. Run `git checkout Roee-Tal-CV.pdf cv/` before committing; the Action makes the real ones.
5. **Behavior lives in one place.** Custom sections are rendered only by `assets/sections.js`, and résumés only by `assets/cv.js`. Both build.py (through Node) and the editor use them. Change the renderer, not a copy.
6. **Keep the editor markers in sync.** Every editable thing in the HTML carries `data-*` markers (see [docs/EDITOR.md](docs/EDITOR.md#markers)). New content needs markers, or the owner can't edit it.
7. **Privacy of friends' résumés.** A résumé is public only when it's saved in `content/cv.json`. Device-only résumés live in the browser (`localStorage["rt-cv-local"]`) and must never be written to the repo by code.
8. **Text for the owner:** short and plain. The UI is in English, and the AI answers in the owner's language (usually Hebrew).
9. **Comments and docs:** every function has a one-line comment (JS) or docstring (Python). Keep it true when you change the function.

## 3. Quick start

```bash
pip install pillow            # ffmpeg is needed for video conversion (apt install ffmpeg)
python3 build.py              # builds every page; needs node on PATH; Chrome/Chromium for résumé PDFs (optional locally)
python3 -m http.server 8000   # then open http://localhost:8000/ , /?edit for the editor, /tv.html for the TV screen
for f in assets/*.js assets/skins/*.js; do node --check "$f"; done   # syntax check
python3 tools/commit_log.py   # refresh docs/COMMITS.md
```

Local testing of the editor without a token: the editor loads content from the site itself when it can't reach GitHub. For automated tests, use Playwright and mock GitHub API responses. Never use a real token in tests.

## 4. File map

| Path | What it is |
|---|---|
| `build.py` | Builds all pages. One `build_*` function per page type, plus helpers. The marker helpers `E/L/M/X/K/ICO/BG/ADD` add editor markers. |
| `content_loader.py` | Loads `content/*.json` into Python structures for build.py. Converts uploads (images → WebP sizes, videos → MP4/posters) and writes code snippets. |
| `content/site.json` | Main page and site-wide settings: hero, nav, buttons, sections order, custom sections, style (`skin`), sound, AI notes… |
| `content/projects.json`, `code-pages.json`, `lab.json`, `early-work.json`, `about.json` | Project pages, code pages, lab clips, early work, "Get to know me". |
| `content/cv.json` | The public résumés ("variants") and which one is the default. |
| `assets/site.js` | Visitor script: video viewer and lightbox, scroll reveal, gallery filter, sound, TV remote mode. Loads `edit.js` when `?edit`. |
| `assets/edit.js` | The visual editor: selection, toolbar, panel, ＋ menus, hold menus, media and crop, publishing, history, AI assistant, résumé builder, ATS check. |
| `assets/sections.js` | Renderer for custom sections (10 types). Shared by build, editor and AI. |
| `assets/cv.js` | Renderer for résumés (templates `ats`, `novo`, `studio`). Shared by build, editor and `cv-page.js`. |
| `assets/cv-page.js` | `cv.html` for visitors: fit the A4 sheet, switch public versions, download and share PDF/PNG. |
| `assets/tv.js`, `assets/tv.css` | `tv.html`: the Netflix-style TV screen, built at runtime from `index.html` and `gallery.html`. |
| `assets/site.css`, `assets/cv.css` | Styles. |
| `assets/skins/*.css` / `*.js` | Site styles: `arcade` (mini platformer), `sketchbook`, `hobbies` (climbing wall), `plain`. `guard.js` is the readability guard. |
| `assets/ai-guide.md`, `assets/cv-guide.md` | Guides the AI reads every time: words the owner uses, section types, résumé rules. Part of the product, so keep them accurate. |
| `assets/icons.json` | Built-in icon set (SVG paths) used by headings, buttons, sections and the résumé. |
| `assets/editor-auth.json` | Login check value + **encrypted** token (see rule 1). |
| `assets/uploads/` | Files the owner uploaded in the editor (the originals; build.py makes sized copies). |
| `.github/workflows/build.yml` | The build-and-commit Action. |
| `tools/commit_log.py` | Generates `docs/COMMITS.md`. |

## 5. Making a change: checklist

1. Find the data (`content/*.json`) and the builder function (`build.py` › `build_*`), or the renderer (`sections.js` / `cv.js`).
2. Change it. Add editor markers for anything new and editable.
3. If the AI should know about it, update `assets/ai-guide.md` (or `cv-guide.md`) and, if it's a new kind of field, `catalog()` / `applyValue()` in edit.js.
4. Run `python3 build.py` and `node --check`, then look at the page (phone width too) and at `?edit`.
5. Run `git checkout Roee-Tal-CV.pdf cv/`, then commit **source only**. Add a line to `CHANGELOG.md`, and run `python3 tools/commit_log.py` after committing if you keep the log fresh.
6. Push. The Action rebuilds the site. Check that the Actions tab shows green.

## 6. Commit messages

Use one line that says what changed for the owner or visitor, e.g. `Editor: crop & zoom pictures when adding them`. Prefixes like `Editor:`, `TV:`, `Résumé:`, `AI:` help. `feat(cv): …` style is also fine. Commits made by the editor's Publish button read `Edit on the site: <files>, <n> upload(s)`.
