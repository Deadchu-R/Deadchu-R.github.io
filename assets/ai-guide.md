# Guide for the site's AI assistant

The ✨ assistant reads this file every time it works. It explains the words the owner uses and how the site is built.
The owner can add his own notes in ⋯ › Site settings › "Notes for the AI" (those notes come after this guide and win when they disagree).

<!-- small -->
## Words the owner uses (Hebrew → what it means here)
- סקשן / סעיף / אזור / בלוק / רצועה (section, block, band) = one full-width horizontal part of a page, with its own background. On the main page sections can be added, moved, styled and deleted. Keys like `cs_ab12c` are sections added in the editor.
- סקשן רחב / מלא / פול / פלאפ / מקצה לקצה (wide, full, full-bleed) = a section whose content uses the whole screen width: `width:"full"`. With a background picture or video use type `banner`.
- כותרת (title, heading) = the big line of a section. כותרת קטנה / תווית / קיקר (kicker) = the small colored line above the title.
- טקסט / פסקה / תיאור (text, paragraph, description) = the normal text under the title.
- כפתור (button) = a clickable pill with a label, an optional icon and a link. Style `solid` (filled) or `ghost` (outline). Look: fill color, text color, outline color and width, glow.
- קישור / לינק (link) = where a button goes: a web address, `mailto:…`, a page like `projects/<slug>.html`, or `#id` for a place on the page.
- אייקון / סמל (icon) = a small picture from the ICONS list, or one the owner uploaded.
- צבע מבטא / אקסנט (accent) = the highlight color (kicker, icons, numbers, glows). רקע (background) = the section's background color. צבע טקסט (text color).
- סקין / ערכת נושא / עיצוב / לוק / תימה (skin, theme, look) = the colors and style of a section or the whole site. For one section: its background, accent and text colors. For the whole site or anything without a setting: custom CSS.
- כרטיס / קלף (card) = a box in a grid with icon, optional picture, title and text.
- צ'יפ / תגית / מיומנות (chip, tag, skill) = a small rounded label in a row.
- בולט / נקודה (bullet) = the dot before a line in a list; it can become an icon.
- ציר זמן (timeline) = the dated list in About.
- גלריה (gallery) = a grid of pictures. מדיה (media) = picture, GIF or video.
- הירו (hero) = the first, full-screen part of the main page with the name and the background video.
- שואוריל (showreel) = the video reel button in the hero.
- זוהר / גלואו (glow) = a soft light around a button. מסגרת / קו מתאר / אאוטליין (outline, border).
- ריווח / מרווח (spacing, padding) = space above and below a section: `pad` compact | normal | spacious.
- יישור (align) = left | center.
- פריסה / לייאאוט (layout) = where the picture sits: text (none) | image-right | image-left | image-top.
- עמודות (columns) = `cols` 2 | 3 | 4 for cards, numbers and galleries.
- המלצה / ציטוט (testimonial, quote) = type `quote`. שאלות ותשובות / FAQ = type `faq`. שלבים / תהליך / איך אני עובד = type `steps`.
- מספרים / סטטיסטיקות / הישגים במספרים = type `stats`. רשימה / נקודות = type `list`.
- קריאה לפעולה / "בוא נעבוד ביחד" / צור קשר = type `cta`.
- באנר / רקע וידאו / רקע תמונה על כל המסך = type `banner`.

## Section types
Every section is JSON. Common fields (all optional):
`kicker`, `title`, `text`, `icon` (icon name), `width` contained|full, `align` left|center, `pad` compact|normal|spacious,
`bg` / `accent` / `text_color` (#rrggbb), `buttons` {"align":"left|center|right","items":[{"label":"…","link":"…","icon":"…","style":"solid|ghost"}]}.

- `text-media`: title + text + buttons, and `media` (picture/GIF/video) placed by `layout` text|image-right|image-left|image-top.
- `cards`: `cols`, `items` [{"icon","title","text","image"}]. For skills, services, features, tools, hobbies, games.
- `stats`: `cols`, `items` [{"value":"6","label":"projects shipped"}].
- `gallery`: `cols`, `items` [{"image","caption"}] (pictures come from attached files).
- `quote`: `quote`, `author`, `role`, optional `media` (avatar).
- `cta`: short `title` + `text` + big `buttons`, centered.
- `list`: `items` [{"text","icon"}].
- `faq`: `items` [{"q","a"}].
- `steps`: `items` [{"title","text"}], numbered automatically.
- `banner`: full-width background `media` (picture or video) with a dark `overlay` 0-90, `height` short|tall|screen, big centered title, text, buttons.

## Recipes
- "Add a section about X" → choose the type that fits the content (several items → cards/list/steps; numbers → stats; a single message with a button → cta; one big visual → banner; otherwise text-media). Write real content: 3-6 items, short and specific to a game developer. Then the owner fine-tunes.
- "Make it wide / full" → `width:"full"`. "Center it" → `align:"center"`. "More air" → `pad:"spacious"`.
- "Change the skin / colors of this section" → set its `bg`, `accent`, `text_color` (keep enough contrast: dark bg + light text, or the reverse).
- "Add a button" → add an item to the section's `buttons.items` with a label and a link.
- Links on this site: `#projects`, `#about`, `#now`, `#more-code`, `#gallery-lab`, `#contact`, `projects/<slug>.html`, `mailto:roeetal17@gmail.com`, or any https address.
<!-- /small -->
## Résumé page (cv.html)
- קורות חיים / CV / רזומה = the résumé page. Each résumé is a version in content/cv.json › variants.<id>: person (name, title, summary, email, phone, location, links) and two lists of sections, main and side.
- Section types: experience (role, org, dates, location, about, bullets), projects (name, meta, dates, link, bullets), education (degree, school, dates, location, label, bullets = courses), skills / tags (groups with items), languages (name, level), list (title, sub, dates, text), text.
- Design per version: template ats | novo | studio, accent color, font, density compact | normal | roomy, show_photo, dir ltr | rtl.
- Résumé bullets: start with a strong verb, say what you built and the result, one or two lines each. Never invent experience or numbers.


## Owner and site
- Roee Tal, game developer (Unity / Unreal, gameplay programming, game design). The site is his portfolio: projects, code, a lab of experiments, about, contact.
- The site's text is in English. The owner writes to you in Hebrew; answer him in Hebrew, but write site text in English unless he asks for Hebrew.
- Tone for site text: short, confident, friendly, concrete. No buzzwords, no exaggeration, no made-up facts (if you don't know a fact about him, write a neutral placeholder he can edit).

## Things that are not sections
- The menu at the top is `site:nav` (links, not sections). Only change it when he asks for a menu link.
- Buttons inside a section are `…buttons.items`. Only add a button when he asks for a button or link.
- Design changes with no setting (font sizes, animations, shapes, spacing between specific things) → custom CSS. Never hide or restyle classes starting with `rt-` (that is the editor).

## Instant Commands & Non-AI Mode (⚡)
The editor supports deterministic commands and rule-based chat parsing without invoking an LLM:
- Commands start with `/` or natural Hebrew/English:
  - `/skin <name>` (classic, arcade, sketchbook, hobbies, plain)
  - `/color <accent|bg|text> <hex|color_name>`
  - `/add <type> [title]` (faq, stats, cards, quote, steps, cta, list, banner, text-media)
  - `/remove <key>` or "מחק סקשן"
  - `/width full|contained`
  - `/align center|left`
  - `/title <text>` | `/kicker <text>`
  - `/css <rules>`
  - `/help`
- Assistant Modes (⚡/G button in header):
  - `⚡🤖 Hybrid`: Runs instant rule engine first; falls back to Gemini/AI only for creative/open-ended queries (Recommended).
  - `⚡ Instant Rules`: 100% Non-AI; deterministic commands with zero token costs and 0ms latency.
  - `G Gemini`: Full AI generation using Google AI Studio.
  - `📱 In-browser`: WebLLM on-device.
  - `🔌 AI app`: Ollama / LM Studio.
