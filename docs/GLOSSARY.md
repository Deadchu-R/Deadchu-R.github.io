# Glossary — מילון מונחים

Definitions of the words used in the code, the docs and the owner's messages. Hebrew is in parentheses. For the AI's own word list (what the owner says → which field), see `assets/ai-guide.md`.

## The site

| Term | Definition |
|---|---|
| **Content** (תוכן) | Everything the site shows. It lives in `content/*.json` and is the source of truth. |
| **Content path** (נתיב) | Address of one value: `file:key.sub.0`, e.g. `site:hero_title`, `projects:2.sections.0.title`. |
| **Build** (בנייה) | `python3 build.py`: turns the content into HTML pages. |
| **Generated files** | Files the build writes, such as `index.html`, `projects/*.html` and `cv/*`. Never edit them by hand. |
| **Action** | The GitHub Action that runs the build on every push and commits `Rebuild site [skip ci]`. |
| **Publish** (פרסום) | The editor's button. It commits all changes to GitHub in one commit, and the Action then rebuilds the site. |
| **Hero** (הירו) | The first, full-screen part of the main page: name, video background, quick links. |
| **Hero panel** | The dark glass box behind the hero text that keeps it readable (`site:hero_panel`, 0–90%). |
| **Brand photo** | The small round photo next to the name in the top bar (`site:brand_photo`). |
| **Showreel** (שואוריל) | The video reel button in the hero. |
| **Section / band** (סקשן, רצועה, בלוק) | One full-width horizontal part of a page. |
| **Built-in section** | A main-page section built from fixed code: `experience`, `projects`, `more_code`, `about`, `gallery_lab`. |
| **Custom section** (סקשן מותאם) | A section the owner or the AI added. Its data is in `site:custom_sections.<cs_id>` and it's rendered by `sections.js`. 10 types. |
| **Section order** | `site:section_order`: the order of sections on the main page. |
| **Kicker** (קיקר, כותרת קטנה) | The small colored line above a title. |
| **Accent** (צבע מבטא) | The highlight color. |
| **Clip** (קליפ) | A short muted gameplay loop. Tap it to open the viewer. |
| **Viewer / lightbox** | The full-screen video player and picture zoom (`site.js`). |
| **Mosaic** | The drifting wall of screenshots in the "Gallery & lab" band. |
| **Code page** | `code/<slug>.html`: a page about one code system, with the real code. |
| **Lab** (מעבדה) | Small experiments (`lab.html`). |
| **Peek** | The character art peeking over the footer edge. |
| **Skin / site style** (סקין, עיצוב אתר) | A whole-site look: `classic`, `arcade`, `sketchbook`, `hobbies`, `plain` (`site:skin`). |
| **Readability guard** | `skins/guard.js`: fixes text that's hard to read in a style. |
| **Custom CSS** | Extra CSS for every page (`site:custom_css`), written by the owner or the AI. |
| **TV mode** | The normal site on a TV: remote focus and CH ▲▼ paging. |
| **TV app** | `tv.html`: a Netflix-style screen for the remote. |
| **Billboard / row / rail** | TV app parts: the big top area for the focused item, a horizontal row of cards, the left menu. |
| **Pointer remote** | A TV remote that moves an on-screen cursor like a mouse. The TV app's `.tv-pointer` mode handles it. |

## The editor

| Term | Definition |
|---|---|
| **Edit mode** (מצב עריכה) | The site with `?edit`, after signing in. It loads `assets/edit.js`. |
| **Marker** | A `data-*` attribute that tells the editor what something is: `data-e` text, `data-l`/`data-i` list/item, `data-m` media, `data-x` settings, `data-k`/`data-ok` ordered block, `data-add` ＋ target, `data-ico` icon, `data-bg` background. See [EDITOR.md](EDITOR.md#markers). |
| **Selection** | The thing you clicked. It gets an outline, the toolbar and the panel. |
| **Toolbar** (`#rt-tb`) | Buttons next to the selection: move, duplicate, delete, settings, replace, ＋. |
| **Panel** (`#rt-panel`) | Settings fields of the selection. |
| **Section bar** | ↑ ↓ ⚙ ＋ on each reorderable block. |
| **＋ (plus)** | Adds something. A quick tap adds the remembered default; holding opens the hold menu. |
| **Hold menu** (תפריט אפל) | An Apple-style pop-up: press, slide, release to pick. › opens a sub-menu (or flick right), ‹ / flick left goes back. |
| **Template** (`data-tpl`) | What a new item looks like when ＋ adds it. |
| **Upload** | A file the owner added in the editor. It is saved to `assets/uploads/` on Publish. |
| **Crop tool** | Zoom and drag a picture to fit its spot exactly. |
| **History / restore** | The list of earlier content commits. Restore brings one back as unpublished changes. |
| **Token** | The GitHub fine-grained access token that lets the editor commit. It's saved only encrypted (`assets/editor-auth.json`). Never write it anywhere. |
| **Login** | Username + password that unlock the encrypted token on this device. |

## The AI

| Term | Definition |
|---|---|
| **Assistant** (✨, בינה מלאכותית) | The chat in the editor that changes the page. |
| **Provider** | Which "brain" answers: `hybrid`, `rules`, `gemini`, `local`, `app`. |
| **Rule commands** (פקודות) | `/skin`, `/color`, `/add`… They run instantly with no AI (`executeRuleCommand`). |
| **Hybrid** | Rule commands first, Gemini for everything else. The default. |
| **Gemini** | Google's AI, used with the owner's free key. |
| **WebLLM / local** | A model that runs inside the browser on the device (WebGPU). |
| **App provider** | The owner's own Ollama / LM Studio server. |
| **Catalog** | The list of editable paths and values on the current page that is sent to the AI. |
| **Tools** | Actions the AI can call: `set_value`, `add_section`, `set_custom_css`, `search_web`… |
| **Guide** | `assets/ai-guide.md` / `cv-guide.md`: what the AI reads every time. |
| **AI notes** | The owner's own instructions for the AI (`site:ai_notes`). They win over the guide. |
| **Section flow** | A step-by-step way for small models to build a section. |
| **Web section / fluffy section** | A section built from web search results about a topic (`buildFullFluffySection`). |

## The résumé (קורות חיים)

| Term | Definition |
|---|---|
| **Variant / version** (גרסה) | One résumé in `content/cv.json › variants`. |
| **Default** | The variant cv.html shows first, also `Roee-Tal-CV.pdf`. |
| **Public / device-only** | Public = in `cv.json` (on the site). Device-only = only in this browser's `localStorage["rt-cv-local"]`, for friends' résumés. Paths start with `cvlocal:`. |
| **Template / design** | `ats` (ATS Pro, one column), `novo` (two columns + photo), `studio` (colored sidebar). |
| **Density** | `compact` / `normal` / `roomy` spacing. |
| **ATS** | Applicant Tracking System: software that reads résumés into fields and searches them by keywords. |
| **ATS check** | The edit-only page that matches a résumé against a job post (keywords + structure) and suggests fixes. |
| **Tips / red !** | Automatic checks on the résumé, each with a suggested fix (`cvLint`). |
| **X-Y-Z bullet** | "Accomplished X, measured by Y, by doing Z": the bullet formula from Google recruiters. |
| **Share** | Sends the PDF to the phone's share menu (WhatsApp, mail…). |
