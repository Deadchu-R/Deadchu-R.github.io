# Content files (`content/*.json`)

Everything the site shows comes from these files. The editor writes them, and `build.py` reads them through `content_loader.py`.

**Paths.** The editor and the AI point at a value with a *content path*: `<file>:<key>.<key>.<index>…`
* `site:hero_title`: key `hero_title` in `content/site.json`.
* `projects:2.sections.0.title`: in `content/projects.json` (a list), item 2, then `sections[0].title`.
* `cv:variants.novo.main.0.items.1.role`: inside `content/cv.json`.
* `cvlocal:…`: same shape, but for device-only résumés (localStorage, never published).

File names map like this (`FILES` in edit.js): `site`, `projects`, `code-pages`, `lab`, `early-work`, `about`, `cv` → `content/<name>.json`.

**Media values** are site paths like `/assets/uploads/x.webp` (uploaded in the editor) or `/assets/clips/x.mp4`. A `drive_id` is a Google Drive file id, used when a video is not self-hosted.

**Colors** are `#rrggbb`. **Icons** are names from `assets/icons.json` (e.g. `brief`, `pad`, `code`, `star`, `climbing`), or an uploaded icon path. `""` means no icon.

**Buttons** use this shape everywhere: `{label, link, icon, style: "solid"|"ghost", fill, text_color, border, border_w, glow}`. `link` can be a URL, `mailto:`, `tel:`, a site page (`cv.html`), or `#id`.

---

## `site.json`: main page and site-wide settings

| Key | Type | What |
|---|---|---|
| `name`, `email`, `phone`, `linkedin` | string | Contact info (footer, résumé defaults) |
| `hero_title`, `hero_kicker`, `hero_lead` | string | The name, the small line above it, and the text under it |
| `hero_video`, `hero_video_mobile` | media | Background video (wide / phone). Converted by content_loader |
| `hero_panel` | number 0–90 | Darkness (%) of the glass panel behind the hero text, so it reads over the video. 0 = no panel |
| `hero_buttons` | list of `{label, link, icon, color}` | Colored quick-link pills under the hero |
| `showreel_video`, `showreel_drive_id`, `showreel_label` | | The showreel button and its video |
| `brand_photo` | media | Small round photo next to the name in the top bar (empty = none) |
| `nav` | list of `{label, link, icon}` | Top-bar menu links |
| `section_order` | list of keys | Order of the main page sections. Built-in: `experience`, `projects`, `more_code`, `about`, `gallery_lab`. Custom sections use their `cs_…` id |
| `headings` | `{key: {title, icon, color}}` | Heading text, icon and color of each built-in section |
| `section_buttons` | `{key: {position, align, items: [button]}}` | Extra buttons per built-in section |
| `custom_sections` | `{cs_id: section}` | Sections the owner added (see below) |
| `job_title`, `job_subtitle`, `job_start` (`YYYY-MM`), `job_end` (empty = ongoing), `job_bullets`, `job_tools` | | The "Experience" band. `job_tools` holds `{label, icon}` chips |
| `bp_media` | media | Optional picture/video replacing the drawn Blueprint window |
| `timeline` | list of `{when, title, text}` | The timeline under Experience |
| `projects_intro`, `more_code_intro` | string | Intros of those bands |
| `gallery_lab_text`, `gallery_lab_buttons`, `lab_cover` | | The "Gallery & lab" band |
| `footer_title`, `footer_text`, `footer_buttons`, `footer_peek` | | Footer; `footer_peek` is the character art peeking over the edge |
| `ui` | `{key: {icon, color, fill, text_color, border, glow…}}` | Looks of fixed buttons (e.g. `showreel_btn`, `play_full`) |
| `sound` | `{enabled, start, music, mv, click, cv}` | Site sound. `enabled`: show the speaker toggle; `start`: on by default; `music`: file; `mv`: music volume 0–100; `click`: click sound style; `cv`: click volume |
| `skin` | `classic`·`arcade`·`sketchbook`·`hobbies`·`plain` | Site style (optional; default `classic`) |
| `custom_css` | string | The owner's / AI's extra CSS for every page (optional) |
| `ai_notes` | string | The owner's notes for the AI assistant. The AI reads them after its guide, and they win when the two disagree (optional) |

### Custom sections (`site:custom_sections.<cs_id>`)

Rendered by `assets/sections.js` (`RTSections.render(id, data, env)`). Common fields:

| Field | Values |
|---|---|
| `type` | `text-media`, `cards`, `stats`, `gallery`, `quote`, `cta`, `list`, `faq`, `steps`, `banner` |
| `kicker`, `title`, `text`, `icon` | heading parts |
| `layout` | `text`, `image-right`, `image-left`, `image-top` (where the picture sits) |
| `media` | picture / GIF / video |
| `cols` | 2, 3, 4 (cards, stats, gallery) |
| `width` | `contained`, `full` |
| `align` | `left`, `center` |
| `pad` | `compact`, `normal`, `spacious` |
| `height` | `short`, `tall`, `screen` (banner) |
| `overlay` | 0–90, banner darkness |
| `bg`, `accent`, `text_color` | colors |
| `buttons` | list of button |
| `items` | list; the shape depends on `type` (see `TYPES[type].item` in sections.js). Examples: cards `{icon, image, title, text}`, stats `{value, label}`, faq `{q, a}`, steps `{title, text}`, list `{icon, text}`, gallery `{image, caption}` |
| `quote`, `author`, `role` | quote type |

To add a section type: add it to `TYPES` and to the body switch in `sections.js`, style it in `site.css` as `.cs.t-<type>`, and describe it in `assets/ai-guide.md › Section types`.

---

## `projects.json`: list of projects (one page each)

| Key | What |
|---|---|
| `slug` | Page name: `projects/<slug>.html` |
| `title`, `subtitle`, `engine`, `role`, `when`, `context` | Header facts |
| `card_role`, `card_tech` | Text on the main-page card |
| `color_deep`, `color_main`, `color_accent` | The game's palette (page, card, gallery tiles) |
| `cover`, `mascot`, `next_card_image` | Pictures: card cover, header character, "next project" band |
| `hook` | One-line pitch |
| `what_i_built`, `teammates_built`, `tech` | Lists of what I built, what teammates built, and tech/principles |
| `about` | Story paragraphs |
| `sections` | Clip sections `{title, intro, clips:[{label, caption, video, drive_id}]}` |
| `screenshots` | Images |
| `full_video`, `full_video_drive_id` | Full gameplay video |
| `characters` | `[{name, art, text}]` (may be empty) |
| `team_art` | Credit note when the art is by teammates |
| `credits` | Text or list |
| `code_sample` | `{file_label, code}`, saved to `snippets/` |
| `page_order` | Order of page blocks: `code_sample`, `clips`, `screenshots`, `full_video`, `about`, `characters`, `credits` |

## `code-pages.json`: "More code" pages (`code/<slug>.html`)

`slug`, `title`, `subtitle`, `language`, `role`, `when`, `context`, palette colors, `hook`, `what_i_built`, `tech`:
* `flow`: `[{name, note}]`, the boxes of the flow diagram.
* `clip`: an optional clip.
* `code`: `[{file_label, code}]`.
* `page_order`: `flow`, `clip`, `code`.

## `lab.json`, `early-work.json`

Lists of clips `{label, caption, video, drive_id}`, shown on lab.html and in the gallery.

## `about.json`: "Get to know me"

* `intro`
* `hobbies`: `[{name, icon, color}]`
* `games`: favorite games `[{name, icon, color}]`
* `ai_kicker`, `ai_title`, `ai_text`, `ai_tools`: the local-AI side project card
* `rig_title`, `rig` (`[{part, value}]`), `rig_note`: the PC parts

---

## `cv.json`: résumés

```jsonc
{
  "default": "unity-ats",              // which public résumé cv.html and Roee-Tal-CV.pdf show
  "variants": {
    "<id>": {
      "label": "Unity ATS",            // name in the editor's résumé picker
      "public": true,                  // false = kept in the file but not on cv.html
      "template": "ats",               // ats | chicago | executive | novo | top | corporate | monogram | studio  (see RTCV.TEMPLATES)
      "accent": "#2a8a8f", "font": "Open Sans", "density": "compact|normal|roomy",
      "photo": "/assets/uploads/…", "show_photo": true, "show_icons": false,
      "lang": "en", "dir": "ltr",
      "person": {"name","title","summary","email","phone","location","links":[{"label","url"}]},
      "main": [section…],              // main column (the only column in "ats")
      "side": [section…]               // side column (novo/studio)
    }
  }
}
```

A **section** has the shape `{type, title, icon?, items:[…]}`. Item shapes by type (from `RTCV.SECTION_TYPES` in cv.js):

| type | item |
|---|---|
| `experience` | `{role, org, dates, location, about, label, bullets[]}` |
| `projects` | `{name, meta, dates, link, link_label, bullets[]}` |
| `education` | `{degree, school, dates, location, about, label, bullets[]}` |
| `skills` / `tags` | `{label, items[]}` |
| `languages` | `{name, level}` |
| `list` | `{title, sub, dates, text}` (certificates, awards) |
| `text` | `{text}` |

Current public variants: `unity-ats` (default), `novo`, `studio`, `gemini-edited`. **Device-only** résumés use the same shape in `localStorage["rt-cv-local"]` and are edited as `cvlocal:` paths.
