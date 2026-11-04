# Architecture

How roeetal.com is built, served and edited. For rules and a quick start see [AGENTS.md](../AGENTS.md).

## 1. Big picture

| Layer | Files | Runs where |
|---|---|---|
| **Content** (the source of truth) | `content/*.json`, `assets/uploads/*` | stored in git |
| **Build** | `build.py`, `content_loader.py`, plus Node for `assets/sections.js` and `assets/cv.js` | the owner's PC or the GitHub Action |
| **Output** (generated) | `*.html`, `projects/`, `code/`, `snippets/`, `cv/`, `Roee-Tal-CV.pdf`, the media copies under `assets/` | served by GitHub Pages |
| **Visitor scripts** | `assets/site.js`, `site.css`, `skins/*`, `cv-page.js`, `tv.js`/`tv.css` | the visitor's browser |
| **Editor** | `assets/edit.js` (plus the shared renderers) | the owner's browser, only with `?edit` |

There is no server and no database. The site is static files on GitHub Pages, and "saving" means making a git commit.

## 2. The build (`python3 build.py`)

1. **`content_loader.py`** runs on import:
   * It reads every `content/*.json` (`_load`).
   * It turns uploads into what the pages need:
     * Pictures become sized WebP/JPEG copies in `assets/img`, `assets/thumbs`, `assets/full` and `assets/art`.
     * Videos become MP4 plus posters in `assets/clips` and `assets/posters` (ffmpeg).
     * Videos that are only on Google Drive keep their Drive id.
   * It exposes ready Python structures to build.py: `SITE`, `SITE_TEXT`, `PROJECTS`, `CODE_PAGES`, `LAB`, `ABOUT`, …
   * It writes project code samples to `snippets/`.
2. **`build.py`**, in its `__main__` block:
   1. It writes `assets/icons.json` (the icon set; the editor uses it for previews).
   2. It builds the pages in this order: `build_gallery()` (also collects the gallery pool used by the main page mosaic), `build_index()`, `build_project()` for each project, `build_lab()`, `build_cv()`, `build_tv()`, and `build_code_page()` for each code page.
3. **Shared renderers through Node:**
   * Custom sections: build.py's `custom_sections_html()` runs `node` with `assets/sections.js`, which returns HTML for every section in `site:custom_sections`.
   * Résumés: `_cv_render()` runs `node` with `assets/cv.js`.
   * The editor runs the same JS files in the browser, so the two always produce the same markup.
4. **Résumé files:**
   * `_cv_files()` prints every public résumé to `cv/<id>.pdf` and `cv/<id>.png` with headless Chrome (`_chrome()` finds the binary). The default résumé is also copied to `Roee-Tal-CV.pdf`.
   * A hash of the résumé data plus `cv.js`/`cv.css` is kept in `cv/.hashes.json`, so unchanged résumés are skipped.
   * The Chrome flags that work: `--headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=10000 --run-all-compositor-stages-before-draw`. Don't add `--user-data-dir`; it hangs.
5. **Cache busting:** every CSS/JS link gets `?v=<hash>` from `ver(path)`, so browsers pick up changes right away.

### Editor markers are written by the build

build.py wraps every editable value with small helpers that add `data-*` attributes. The editor reads those attributes and never needs to know the page structure.

| Helper | Adds | Meaning |
|---|---|---|
| `E(path)` | `data-e` | editable text at that content path |
| `L(path)` / `I(i)` | `data-l` / `data-i` | a list and the index of each item in it |
| `M(path, kind)` | `data-m`, `data-mk` | replaceable media (image, video, art…) |
| `X(*rows)` | `data-x` | settings fields: JSON `[label, path, type, opts]` rows |
| `K(key)` | `data-k` (with `data-ok` on the holder) | a block in an ordered list (sections, page blocks) |
| `ICO(path)` | `data-ico` | an icon slot |
| `BG(path)` | `data-bg` | background media |
| `ADD(path, tpl)` | `data-add`, `data-tpl` | where ＋ adds new items and from which template |

Full definitions: [EDITOR.md › Markers](EDITOR.md#markers).

## 3. Deploy

`.github/workflows/build.yml` runs on every push to `main` (and by hand):

1. Checkout, then Python 3.12, ffmpeg and Pillow.
2. `python3 build.py`.
3. If anything changed, it commits it as **`site-builder`** with the message `Rebuild site [skip ci]` and pushes. `[skip ci]` stops the commit from triggering the Action again.
4. GitHub Pages serves `main`. The custom domain is in `CNAME` (www.roeetal.com).

`concurrency: site-build` keeps runs in order. Publishing from the editor waits for the run (`watchBuild` in edit.js) and tells the owner when the site is live.

## 4. Pages and their scripts

| Page | Built by | Scripts on the page |
|---|---|---|
| `index.html` | `build_index` | `site.js` (+ skin css/js, `sections.js` only in the editor) |
| `projects/<slug>.html` | `build_project` | `site.js` |
| `code/<slug>.html` | `build_code_page` | `site.js` |
| `gallery.html` | `build_gallery` | `site.js` (filter chips) |
| `lab.html` | `build_lab` | `site.js` |
| `cv.html` | `build_cv` | `cv.js` + `cv-page.js` (+ `edit.js` with `?edit`) |
| `tv.html` | `build_tv` | `tv.js` only (it fetches `index.html` and `gallery.html` and builds rows from them) |

### `assets/site.js` (every page)
* **Viewer:** clips play muted while on screen. Tapping one opens the video player (small, then full screen). Screenshots and art open in a zoomable lightbox with arrows and swipe.
* **Reveal:** fade-in on scroll. The projects band takes the colors of the card in view.
* **Gallery filters** and **(i) info** buttons.
* **Sound:** optional click sounds and music, set in `site:sound`. The visitor's toggle is stored in `localStorage["rt-sound"]`.
* **TV mode:** a TV is detected by its user agent, by `?tv=1`, or by `localStorage["rt-tv"]` (`?tv=0` turns it off). In TV mode:
  * The arrow keys move focus between elements by position.
  * CH ▲▼ / Page Up/Down jump between parts of the page and show a label.
  * Autoplay is limited to the focused clip, and animations are off.
  * The home page redirects to `tv.html` unless "Website view" was chosen (`?web=1` → `sessionStorage["rt-web"]`).
* **Editor loader:** `?edit` (or `sessionStorage["rt-edit"]`) loads `assets/edit.js`.

### Site styles (skins)
`site:skin` is one of `classic | arcade | sketchbook | hobbies | plain` (`SKINS` in build.py). The page gets `<html data-skin="…">`, plus `assets/skins/<skin>.css`, `guard.js` and `<skin>.js` when that file exists.
* `arcade.js`: a tiny platformer on the first screen. Collect a coin to go to that place.
* `hobbies.js`: a bouldering wall. Each hold is a link, and a climber climbs to it.
* `guard.js` (`window.RTGuard`): checks text contrast and switches unreadable text to black/white. The editor calls `RTGuard.soon()` after changes.
* Skin CSS must not touch the résumé sheet, so its rules use `:not(.cvdoc *)`.

## 5. Storage keys (browser)

| Key | Where | What |
|---|---|---|
| `rt-edit`, `rt-login` | sessionStorage | edit mode is on in this tab / signed in |
| `rt-edit-token` | sessionStorage | the GitHub token, decrypted at sign-in; this tab only, cleared on Exit editing (older versions kept it in localStorage; it is removed from there on load) |
| `rt-cv-local` | localStorage | device-only résumés (never published) |
| `rt-add-last` | localStorage | last ＋ choice per place |
| `rt-ai-provider` | localStorage | AI provider (`hybrid` default) |
| `rt-gemini-key` | sessionStorage | Gemini key, decrypted at sign-in; this tab only |
| `rt-gemini-model`, `rt-gemini-model-pin` | localStorage | Gemini model choice |
| `cve_users`, `cve_vault`, `cve_cur_user`, `cve_draft_cv` | localStorage | CVEditor: device-only accounts (passwords only as PBKDF2 hashes) and their résumés |
| `rt-ai-local-model`, `rt-ai-app-url`, `rt-ai-app-model` | localStorage | on-device / local app AI settings |
| `rt-sound` | localStorage | visitor's sound toggle |
| `rt-tv` / `rt-web` | localStorage / sessionStorage | force TV mode / prefer the website over the TV app |

## 6. Security model

* The repo is public. Anyone can read the content, but writing needs a GitHub token with access to **this repo only** (fine-grained, Contents read/write, Actions read).
* The token is saved in `assets/editor-auth.json` **encrypted**:
  * PBKDF2 (300k iterations, random salt) of username + password gives an AES-GCM key.
  * A separate PBKDF2 `check` value lets the login form say "wrong password" without trying to decrypt.
  * Visitors can't use it without the password.
* Signing in is needed in every new tab: the decrypted token and Gemini key live only in sessionStorage.
* **Change password** (⋯ menu, `changePasswordBox`) re-encrypts everything with a new salt and 1,000,000 PBKDF2 rounds, checks the new password's strength, and offers to swap in a NEW token / Gemini key. That matters because old versions of `editor-auth.json` stay in git history, locked with the old password. After swapping, delete the old token on GitHub.
* Commits made by the editor use the GitHub no-reply address (`AUTHOR` in edit.js), so the owner's real email isn't added to git history.
* AI keys never leave the owner's browser, except in calls to that AI provider.
* CVEditor (`assets/cveditor.js`) accounts are device-only. There is no built-in admin account and no password in the code.
* Device-only résumés stay in localStorage.
