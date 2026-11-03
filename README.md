# Roee Tal — Portfolio (roeetal.com)

Game / Unreal developer portfolio: projects with playable clips, code pages, a gallery, a lab, a résumé builder, and a TV app. The owner edits everything himself on the live site, with a visual editor and an AI assistant.

* **Visit:** https://www.roeetal.com · TV: `/tv.html` · résumé: `/cv.html`
* **Edit:** open `https://www.roeetal.com/?edit` and sign in. Click anything to change it, then press **Publish**.
* **For developers and AI agents:** start with [AGENTS.md](AGENTS.md).

## How it works in one paragraph

All content lives in `content/*.json`. `python3 build.py` turns it into static HTML pages. GitHub Pages hosts the repository. On every push, a GitHub Action (`.github/workflows/build.yml`) rebuilds the pages and commits them. The visual editor (`assets/edit.js`, only loaded with `?edit`) changes the JSON in the browser and commits it through the GitHub API, which triggers that same Action.

## What's on the site

| Part | Where | Notes |
|---|---|---|
| Main page | `index.html` | Hero with video, current job, projects, more code, about me, gallery & lab, plus sections the owner added himself. The owner can reorder sections. |
| Project pages | `projects/<slug>.html` | Each page uses its game's colors, with what I built, clips, code sample, characters and credits. |
| Code pages | `code/<slug>.html` | One page per system, with the real code. |
| Gallery / Lab | `gallery.html`, `lab.html` | Clips, screenshots and art, with filters and a full-screen viewer. |
| Résumé | `cv.html` | Public résumé versions, with PDF/PNG download and share. In the editor it becomes a résumé builder with 3 designs, tips and an ATS check. |
| TV app | `tv.html` | Netflix-style screen for TV remotes. TVs open it automatically. |
| Site styles | editor › ⋯ › Site style | Classic, Arcade (playable first screen), Sketchbook, Hobbies (climbing wall), Plain. |

## Docs

* [AGENTS.md](AGENTS.md): rules, quick start, file map
* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): build pipeline, pages, scripts, deploy
* [docs/CONTENT.md](docs/CONTENT.md): every content file and field
* [docs/EDITOR.md](docs/EDITOR.md): the visual editor, résumé builder, TV
* [docs/AI.md](docs/AI.md): the AI assistant
* [docs/GLOSSARY.md](docs/GLOSSARY.md): definitions (English + Hebrew)
* [CHANGELOG.md](CHANGELOG.md) · [docs/COMMITS.md](docs/COMMITS.md): history
