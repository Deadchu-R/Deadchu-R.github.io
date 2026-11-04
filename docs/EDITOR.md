# The visual editor (`assets/edit.js`)

The owner edits the live site himself, in the browser. The editor is like Squarespace for the site and like NovoResume for the résumé. Visitors never load this file.

* **Open:** add `?edit` to any page URL (e.g. `roeetal.com/?edit`). `site.js` sees it, stores `sessionStorage["rt-edit"]` (so edit mode survives page changes) and loads `edit.js`.
* **Sign in:** username + password unlock the GitHub token stored encrypted in `assets/editor-auth.json` (`loginBox`, `derive`). The first time, the owner pastes a fine-grained token (`askToken`) and it is saved encrypted (`saveTokenForLogin`).
* **Change password:** ⋯ › Change password. It needs the current password, and a strong new one (14+ characters, or a passphrase). You can paste a new GitHub token / Gemini key at the same time. The secrets are kept only in this tab (sessionStorage).
* **Save:** changes are kept in memory per file and counted in the bottom bar. **Publish** (`publish`) commits all changed `content/*.json` files plus new uploads in **one** commit, through the Git Data API (blobs → tree → commit → move `main`). `watchBuild` then follows the Action until the site is live.
* **History:** ⋯ › History lists recent content commits. Restore loads that version as new unpublished changes (`historyBox`, `restore`).

## Markers

build.py (and the renderers `sections.js` / `cv.js`) put these attributes in the HTML. The editor works only from them.

| Attribute | Value | Meaning / behavior |
|---|---|---|
| `data-e` | content path | **Editable text.** Tap to type (`initText`, `startEdit`). Enter finishes, except in code (`data-code`, where newlines and spaces are kept). |
| `data-l` | path of a list | A **list** holder. Its children with `data-i` are the items. |
| `data-i` | index | An **item's** index in its list. The editor renumbers it after moves, duplicates and deletes (`listOp`, `moveItem`). |
| `data-m` + `data-mk` | path + kind (`image`, `art`, `video`, `media`, `audio`) | **Replaceable media** (`replaceMedia`). |
| `data-x` | JSON `[[label, path, type, opts], …]` | **Settings fields** shown in the panel (`field`). Types: `color`, `select` (opts = choices), `image`, `art`, `video`, `media`, `audio`, `link`, `textarea`, `range` (opts = `[min, max, step, unit, cssVar, default]`), `toggle`. |
| `data-ok` | path of an order list (e.g. `site:section_order`) | A holder whose blocks can be **reordered**. |
| `data-k` | key | A **block** inside a `data-ok` holder. It gets a section bar (↑ ↓ ⚙ ＋) (`secBars`). |
| `data-add` + `data-tpl` | list path + template name | Where **＋** adds things and what a new item looks like (`addItem`, `addOptions`). |
| `data-ico` | path | An **icon slot**, changed with the icon picker. |
| `data-bg` | path | **Background media** of a block. |
| `data-edit-show` | — | A part that's hidden when empty for visitors but shown in the editor so it can be filled. |
| `.rt-pick` | — | Placeholder ("tap to pick a picture") that appears only in edit mode. |
| `.rt-ui` | — | Any editor UI. Ignored by selection, the readability guard and the TV code. |

**Paths** look like `file:key.sub.0`. Top-level lists put `:` before the index (`projects:2.title`). See [CONTENT.md](CONTENT.md).

## Screen parts

| Part | Id / class | What |
|---|---|---|
| Top bar | the pencil next to the name | The name goes home; the pencil turns edit mode on or off. |
| Bottom bar | `#rt-bar` | Unpublished count, **Publish**, ⋯ menu (site settings, site style, history, help, preview, exit), ✨ AI. |
| Selection toolbar | `#rt-tb` | Next to the selected thing: move ↑↓, duplicate, delete, settings ⚙, replace media, ＋. |
| Settings panel | `#rt-panel` | The fields from `data-x` of the selection and its parents (`renderPanel`). |
| Section bars | `.rt-secbar` | On every reorderable block. |
| Dialogs | `.rt-modal` | `modal()`, `alertBox()`. |

**Selecting:** a click selects the nearest editable thing (`select`). A second tap on text starts typing. Esc clears the selection. Drag the ⠿ handle to reorder (`moveDrag`, `endDrag`).

## The ＋ button and hold menus

* **Quick tap** on ＋ adds the usual thing for that place: the option picked last time there (`localStorage["rt-add-last"]`, see `defaultOpt`/`remember`). The button shows what it will add (`plusLabel`).
* **Press and hold** opens the **hold menu** (`holdMenu`), an Apple-style pop-up:
  * Slide to an option and release to pick it.
  * Rows with › open a sub-menu: rest on them, tap them, or flick right.
  * Flick left or tap ‹ to go back (`pmBack`).
  * The gesture code is `pmGestureStart`, `pmMove`, `pmHover` and `pmRelease`. Menu items use `data-n`, not `data-k`, so they don't collide with section bars.
* The same hold menu is used for ⋯, the AI provider menu and every `<select>`: `appleSelect` turns new selects into hold menus automatically with a MutationObserver.
* **Add options** (`addOptions`):
  * another item like this one;
  * an item in any list of this section;
  * a button;
  * a **new section** of any type (`sectionItems` / `sectionPicker`);
  * a section **from the web** (`promptWebSection`);
  * asking the AI.

## Media

* **Replace** (`replaceMedia`): pick a file, or take a photo or video.
  * Pictures are shrunk and converted (`prepImage`). Icons become small squares (`prepIcon`). GIFs stay animated.
  * Then the **crop tool** opens (`cropBox`): zoom and drag so exactly the wanted part fills the spot's shape (`targetShape`).
* New files are kept in memory and shown right away (`previewBox`), then uploaded on Publish to `assets/uploads/<name>-<rand>.<ext>`. build.py makes the sized copies.
* The hero background video applies to both wide and phone versions.

## Site settings (⋯ › Site settings, `siteSettings`)

Site style (skin), menu links, sound, the hero panel darkness, the brand photo, **Notes for the AI** (`site:ai_notes`) and **Custom CSS** (`site:custom_css`, applied live by `applyCustomCss`).

**Site style** (`applySkin`, `SKIN_NAMES`) switches `<html data-skin>` live and saves `site:skin`. Styles: Classic, Arcade, Sketchbook, Hobbies, Plain.

## Custom sections in the editor

* `addSection` inserts a section into `site:custom_sections` and `site:section_order`.
* `rerenderSection` redraws it with `RTSections.render`, using the editor environment `csEnv()`.
* `deleteSection` removes it.

The settings fields come from `fields()` in sections.js.

## Résumé builder (cv.html with `?edit`)

`cvInit` turns cv.html into the builder. The functions all start with `cv`.

* **Résumé picker:** all résumés, public (`cv:` paths) and **device-only** (`cvlocal:`, stored in `localStorage["rt-cv-local"]`). `cvMoveDoc` moves one between the two. Friends' résumés stay device-only unless the owner makes them public.
* **New:** blank, copy, or **import** from a PDF or text (`cvImport`, using pdf.js 3.11.174 from cdnjs, with AI help when available).
* **Design:** template (`ats` = ATS Pro, one column; `novo`; `studio`), color, font, density, photo, and section icons.
* **＋ Add** (`cvAddMenu`): section, entry, bullet, date, skill, link, photo, icons.
* **Tips** (`cvLint`, `cvTips`): red **!** marks on the sheet. Each one says what's wrong and has a **Fix** button (`cvTipBox`). Examples: missing dates, weak bullets without numbers, long summary, missing contact info.
* **ATS check** (`cvAtsPage`, edit mode only):
  * Paste a job link or text. The job text is cleaned by `fetchJob`, `parseHtmlToJobText` and `cleanJobText`.
  * Key terms are extracted (`jobTerms`, with synonyms) and matched against the résumé (`hasTerm`).
  * Structure checks (`cvAtsChecks`): one column, real text, standard headings, dates, contact.
  * Optional AI review with suggested fixes.
* **Download / share:**
  * In the editor: `cvPrint` (PDF via the print dialog) and `cvImage` (PNG).
  * On the public page (`cv-page.js`): download links use blob URLs, so the file really saves. **Share** passes the PDF to the phone's share menu (`navigator.share` with files) for WhatsApp, mail and others.
  * The site's own PDFs/PNGs are built by the Action (`cv/<id>.pdf|png`).

## TV

* On the normal pages (`site.js`), TV mode handles remote focus and CH ▲▼ paging (see [ARCHITECTURE.md](ARCHITECTURE.md#assetssitejs-every-page)).
* `tv.html` + `tv.js` is a separate Netflix-style app:
  * a left menu rail;
  * a billboard for the focused item;
  * rows such as projects, videos, clips per project, code, gallery, about and links, built by parsing `index.html` and `gallery.html` at runtime.
* Keys: ← → ↑ ↓ move, OK opens or plays, Back closes, CH ▲▼ jump rows, ← at the start of a row opens the menu.
* **Pointer remotes** (the remote moves an on-screen cursor): `.tv-pointer` mode shows big ‹ › arrows on rows, and hovering never moves rows (`S.hover`).
