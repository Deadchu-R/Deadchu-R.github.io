# The AI assistant (✨ in the editor)

The owner chats with an assistant in edit mode (✨ in the bottom bar, `openAI`). It changes the page live, and nothing is saved until **Publish**. It understands Hebrew and English, voice input and attached pictures/files (`aiFiles`).

## 1. Flow of one message (`aiSend`)

```
message ──▶ executeRuleCommand(text)          (always first, unless files are attached)
               │ handled? ── yes ──▶ done (instant, no AI)
               ▼ no
           provider = localStorage["rt-ai-provider"] (default "hybrid")
               ├─ "rules"           ─▶ "command not recognized" + /help hint
               ├─ "local" / "app"   ─▶ sectionFlow() if it asks for a section, else localSend() / appSend()
               └─ "gemini"/"hybrid" ─▶ Gemini with tools (needs a key; aiKeyBox asks for it)
```

## 2. Providers

| Value | Icon | What | Where it runs |
|---|---|---|---|
| `hybrid` (default) | ⚡🤖 | Rule commands first; anything else goes to Gemini. | browser + Google |
| `rules` | ⚡ | Only rule commands. No AI and no key. | browser |
| `gemini` | G | Google Gemini with tool calling. Free key from Google AI Studio, stored in `localStorage["rt-gemini-key"]`. | Google |
| `local` | 📱 | On-device model through **WebLLM** (WebGPU). Downloaded once and cached (`ensureEngine`, `localModelId`). | this device |
| `app` | 🔌 | The owner's own AI app: **Ollama** (also in Termux on Android) or **LM Studio**, through its local OpenAI-style / Ollama API (`appChat`, `detectOllama`). URL in `rt-ai-app-url`. | the owner's PC/phone |

Choosing a provider: ✨ › AI source (`aiMenu` → `setProvider`), or ⋯ › Site settings › AI (`aiSettingsBlock`).

**Gemini models:**
* `rankModels` reads Google's live model list and ranks it, newest Flash first. Retired models drop out automatically.
* `pickModel` uses the owner's pinned model (`rt-gemini-model-pin`) or the best one.
* When a model is busy (503) or out of quota (429), the editor waits and retries, then tries the next models.

## 3. Rule commands (no AI, `executeRuleCommand`)

These work with every provider. Words in Hebrew or English also work ("שנה צבע מבטא לירוק", "add stats").

| Command | Does |
|---|---|
| `/help` (`עזרה`, `?`) | Lists the commands |
| `/skin <classic\|arcade\|sketchbook\|hobbies\|plain>` | Site style |
| `/color <accent\|bg\|text> <color>` | Color of the selected section (or site); color words → hex by `parseColorVal`/`COLOR_MAP` |
| `/add <type> [topic]` | Adds a custom section (`faq`, `stats`, `cards`, `banner`, `quote`, `cta`, `steps`…). With a topic it is built from web search (`buildFullFluffySection`) |
| `/remove <cs_id>` / "remove last section" | Deletes a custom section |
| `/width full\|contained`, `/align center\|left` | Layout of the selected section. (`/pad …` is listed in /help but **not implemented yet**) |
| `/title …`, `/kicker …` | Text of the selected section. (`/text …` is listed in /help but **not implemented yet**) |
| `/css <rules>` | Appends to `site:custom_css` |

## 4. Gemini tools (the JSON protocol)

Gemini gets the **guide** (see 5), the owner's notes and a **catalog** of the page. The catalog (`catalog()`) lists every editable path with its current value and type, plus the custom CSS. Gemini answers with tool calls:

| Tool | Does |
|---|---|
| `set_value {path, value}` | Sets any text, field, color, media path… (`applyValue` converts the value to the field's type and updates the page live) |
| `add_item` / `remove_item` / `move_item` | List items |
| `add_section {type, section, after}` / `remove_section` / `move_section` | Custom sections (full section JSON, see [CONTENT.md](CONTENT.md#custom-sections-sitecustom_sectionscs_id)) |
| `set_custom_css {css}` | Layout and design that has no field |
| `use_attachment {attachment, path}` | Puts an attached picture/file into a media slot |
| `search_web {query}` | Looks something up (`searchWeb`) |

Small local models can't do tool calls well. For them, `applyJsonAnswer` reads one JSON answer of the form `{changes:[{path,value}], reply}`, and `smallCatalog` sends a shorter catalog. A request for a new section goes through `sectionFlow`: the model writes only titles and text, and the code builds a real section.

## 5. What the AI reads (its knowledge)

| Source | What |
|---|---|
| `assets/ai-guide.md` | Words the owner uses (Hebrew → meaning), section types and fields, how to do common requests. The part after `<!-- small -->` is the short version for small models. |
| `assets/cv-guide.md` | Résumé rules with sources (Harvard OCS, Google recruiters, Ladders study…), used by the tips and the résumé AI. Never invent experience or numbers; ask the owner or use `[N]`. |
| `site:ai_notes` | The owner's own notes (⋯ › Site settings). They come **after** the guide and win when the two disagree. |
| The catalog | The page as it is now. |

When you add a feature the owner may ask the AI about, add it to `ai-guide.md`.

## 6. Web sections ("section from the web")

* `promptWebSection` asks for a topic.
* `searchWeb` tries `/api/search` (if a server provides it), then Wikipedia (Hebrew or English by the text), then DuckDuckGo instant answers. `cleanSearchQuery` strips command words first.
* `buildFullFluffySection` turns the results into a full section (title, text, cards/steps/faq…), grounded in what was found.

## 7. Résumé AI (cv.html)

`aiText(sys, user, …)` sends a text request to the chosen provider. It is used for:
* rewriting bullets (X-Y-Z formula);
* the "Fix" suggestions of the red ! tips;
* importing a résumé from PDF or text;
* the ATS check's review against a job post.

The ATS keyword match itself is plain code (`jobTerms`, `hasTerm`); the AI only adds the review and suggested rewrites.

## 8. Privacy

* Keys stay in this browser.
* Gemini receives the request, the page catalog and attached pictures. Local and app providers send nothing outside the owner's devices.
* Résumé text is sent to the chosen provider only when the owner asks the AI for something.
