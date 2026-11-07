/* Bootkeh role sets (window.BKSets): your own saved sets, and importing a set
     - from a picture of a script sheet (like the official one: names on their own lines) — read in the browser with
       Tesseract.js (OCR, loaded from jsDelivr the first time), then matched to our roles by name;
     - from the JSON that the official Script Tool / botcscripts.com export ([{"id":"_meta","name":…}, "librarian", …]).
   Saved sets live on this device (localStorage "bk_scripts") and appear in the "Role set" list under "My sets". */
(function () {
  "use strict";
  const KEY = "bk_scripts";
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const B = () => window.Bootkeh, he = () => !B() || B()._state.lang !== "en", tr = (h, e) => he() ? h : e;
  const roles = () => window.BOOTKEH_ROLES || [];
  const norm = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z֐-׿]/g, "");

  function list() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function store(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} }
  // a saved set in the same shape as the built-in scripts (bootkeh.js getScript uses this)
  function get(id) { const s = list().find(x => x.id === id); return s ? { id: s.id, name_en: s.name, name_he: s.name, author: s.author || "", roles: s.roles.slice() } : null; }
  function save(name, author, ids) {
    const l = list(), id = "u_" + Date.now().toString(36);
    l.push({ id, name: String(name || "").slice(0, 60) || tr("הסט שלי", "My set"), author: String(author || "").slice(0, 40), roles: [...new Set(ids)].filter(x => roles().some(r => r.id === x)) });
    store(l); return id;
  }
  function remove(id) { store(list().filter(x => x.id !== id)); }

  // the "Role set" dropdown: built-in sets, then "My sets", then "Custom"
  function renderSelect() {
    const sel = document.getElementById("scriptSelect"); if (!sel) return;
    const cur = B() ? B()._state.scriptId : sel.value, S = window.BOOTKEH_SCRIPTS || {};
    const built = Object.keys(S).map(k => `<option value="${esc(k)}">${esc(he() ? S[k].name_he : S[k].name_en)}</option>`).join("");
    const mine = list();
    sel.innerHTML = `<optgroup label="${tr("סטים רשמיים", "Official sets")}">${built}</optgroup>`
      + (mine.length ? `<optgroup label="${tr("הסטים שלי", "My sets")}">${mine.map(s => `<option value="${esc(s.id)}">${esc(s.name)} · ${s.roles.length}</option>`).join("")}</optgroup>` : "")
      + `<option value="custom">${tr("מותאם אישית", "Custom")}</option>`;
    sel.value = [...sel.options].some(o => o.value === cur) ? cur : "custom";
    const del = document.getElementById("bkSetDel"); if (del) del.hidden = !String(sel.value).startsWith("u_");
  }

  // ---- matching text / ids to our roles ----
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  // one OCR line → a role, if the line is (almost) just that role's name
  function roleForLine(line) {
    const L = norm(line); if (L.length < 3) return null;
    let best = null, bs = 0;
    for (const r of roles()) {
      for (const nm of [r.name_en, r.name_he, r.id.replace(/_/g, "")]) {
        const N = norm(String(nm || "").replace(/\(.*?\)/g, "")); if (N.length < 3) continue;
        let sc = 0;
        if (L === N) sc = 1;
        else if (Math.abs(L.length - N.length) <= Math.max(2, N.length * 0.25)) sc = 1 - lev(L, N) / Math.max(L.length, N.length);
        if (sc > bs) { bs = sc; best = r; }
      }
    }
    return bs >= 0.78 ? best : null;
  }
  function fromText(text) {
    const lines = String(text || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const found = [];
    const add = r => { if (r && !found.includes(r.id)) found.push(r.id); };
    for (const ln of lines) {
      if (!/^[^A-Za-z\u0590-\u05ff]*[A-Z\u0590-\u05ff]/.test(ln)) { if (!/[A-Z]/.test(ln)) continue; }   // names start with a capital
      const whole = /^[^A-Za-z\u0590-\u05ff]*[A-Z\u0590-\u05ff]/.test(ln) && roleForLine(ln); if (whole) { add(whole); continue; }
      // two columns read as one line ("Snake Charmer Slayer", "Librarian Each day, if you…"): try every 1–3 word
      // window, but not words in the middle of a sentence ("…they are drunk.")
      const w = ln.split(/\s+/).filter(Boolean), skip = /^(are|is|the|a|an|be|as|if|of|you|your|their|they|was|were|by|to)$/i;
      for (let i = 0; i < w.length; i++) {
        if (i && skip.test(w[i - 1].replace(/[^a-z]/gi, ""))) continue;
        if (!/^[A-Z\u0590-\u05ff]/.test(w[i].replace(/^[^A-Za-z\u0590-\u05ff]+/, ""))) continue;   // a name starts with a capital letter
        for (let k = 3; k >= 1; k--) { if (i + k > w.length) continue; const r = roleForLine(w.slice(i, i + k).join(" ")); if (r) { add(r); i += k - 1; break; } }
      }
    }
    // title + "by author" from the first lines (e.g. "Return of the Crimson Guard by Sit")
    let name = "", author = "";
    const top = lines.slice(0, 3).join(" ").replace(/\s+/g, " "), m = /^(.*?)\s+(?:by|jy|hy|bv|ky|ty|wy)\s*(.{2,40})$/i.exec(lines[0] || "") || /^(.*?)\s+by\s+(\S+)/i.exec(top);   // italic "by" is often read as "jy"
    if (m) { name = m[1].trim(); author = m[2].trim().replace(/[^\p{L}\p{N} .'-]/gu, ""); author = author.charAt(0).toUpperCase() + author.slice(1); } else if (lines[0] && !roleForLine(lines[0])) name = lines[0];
    return { name, author, ids: found };
  }
  function fromJSON(txt) {
    const d = JSON.parse(txt), arr = Array.isArray(d) ? d : (d.roles || d.characters || []);
    let name = "", author = ""; const ids = [];
    for (const x of arr) {
      if (x && typeof x === "object" && x.id === "_meta") { name = x.name || ""; author = x.author || ""; continue; }
      const id = typeof x === "string" ? x : x && (x.id || x.name);
      const k = norm(id), r = roles().find(r => norm(r.id) === k || norm(r.name_en) === k);
      if (r && !ids.includes(r.id)) ids.push(r.id);
    }
    return { name, author, ids };
  }

  // ---- OCR (Tesseract.js from jsDelivr, loaded the first time) ----
  let tess = null;
  function loadTess() {
    tess = tess || new Promise((ok, bad) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"; s.onload = () => ok(window.Tesseract); s.onerror = () => bad(new Error("OCR")); document.head.appendChild(s); });
    return tess;
  }
  async function fromImage(file, onProgress) {
    const T = await loadTess();
    // "sparse text" reads each column's names on their own; the automatic layout is a second pass, and both are merged
    let pass = 0, text = "";
    const w = await T.createWorker("eng", 1, { logger: m => { if (m.status === "recognizing text" && onProgress) onProgress((pass + m.progress) / 2); } });
    try {
      await w.setParameters({ tessedit_pageseg_mode: "11" }); text += (await w.recognize(file)).data.text + "\n"; pass = 1;
      await w.setParameters({ tessedit_pageseg_mode: "3" }); text += (await w.recognize(file)).data.text;
    } finally { w.terminate(); }
    const a = fromText(text);
    return a;
  }

  // ---- the import / save window ----
  let draft = null;
  function openDialog(d, title) {
    draft = { name: d.name || "", author: d.author || "", ids: d.ids.slice() };
    let ov = document.getElementById("bkSetDlg");
    if (!ov) { ov = document.createElement("div"); ov.id = "bkSetDlg"; ov.className = "bk-sendall"; document.body.appendChild(ov); }
    const draw = () => {
      const rs = draft.ids.map(id => roles().find(r => r.id === id)).filter(Boolean);
      const cnt = k => rs.filter(r => r.type === k).length;
      ov.innerHTML = `<div class="bk-sendall-card bk-group" role="dialog" aria-label="${esc(title)}">
        <div class="bk-sendall-top"><b>${esc(title)}</b><button type="button" class="bk-sendall-x" aria-label="${tr("סגור", "Close")}">×</button></div>
        <p class="bk-hint">${rs.length ? tr(`נמצאו ${rs.length} תפקידים: ${cnt("townsfolk")} תושבים · ${cnt("outsider")} אאוטסיידרים · ${cnt("minion")} משרתים · ${cnt("demon")} שדים. לחיצה על תפקיד מסירה אותו.`, `Found ${rs.length} roles: ${cnt("townsfolk")} Townsfolk · ${cnt("outsider")} Outsiders · ${cnt("minion")} Minions · ${cnt("demon")} Demons. Tap a role to remove it.`) : tr("לא זוהו תפקידים. נסה תמונה חדה יותר, ישרה ובאור טוב.", "No roles found. Try a sharper, straight, well-lit picture.")}</p>
        <div class="bk-set-roles">${rs.map(r => `<button type="button" class="${esc(r.type)}" data-id="${esc(r.id)}">${r.icon || ""} ${esc(he() ? r.name_he : r.name_en)} <i>×</i></button>`).join("")}</div>
        <label class="bk-hint">${tr("שם הסט", "Set name")}<input id="bkSetName" class="bk-input" value="${esc(draft.name)}" maxlength="60"></label>
        <label class="bk-hint">${tr("מחבר (לא חובה)", "Author (optional)")}<input id="bkSetAuthor" class="bk-input" value="${esc(draft.author)}" maxlength="40"></label>
        <button type="button" class="bk-btn pri bk-wide bk-big" data-act="save" ${rs.length ? "" : "disabled"}>${tr("שמור לרשימת הסטים והשתמש בו", "Save to my sets and use it")}</button>
        <button type="button" class="bk-btn bk-wide" data-act="once" ${rs.length ? "" : "disabled"}>${tr("השתמש רק במשחק הזה (בלי לשמור)", "Use for this game only (don't save)")}</button>
      </div>`;
      ov.querySelector(".bk-sendall-x").onclick = () => ov.remove();
      ov.querySelectorAll("[data-id]").forEach(b => b.onclick = () => { draft.ids = draft.ids.filter(x => x !== b.dataset.id); keep(); draw(); });
      const keep = () => { const n = ov.querySelector("#bkSetName"), a = ov.querySelector("#bkSetAuthor"); if (n) draft.name = n.value; if (a) draft.author = a.value; };
      ov.querySelector('[data-act="once"]').onclick = () => { keep(); ov.remove(); if (B() && B().useTempSet) B().useTempSet({ name: draft.name, author: draft.author, ids: draft.ids }); };
      ov.querySelector('[data-act="save"]').onclick = () => { keep(); const id = save(draft.name, draft.author, draft.ids); ov.remove(); use(id); };
    };
    draw();
  }
  // switch the game to a set
  function use(id) {
    renderSelect();
    const sel = document.getElementById("scriptSelect"); if (sel) sel.value = id;
    if (B()) { B().setScript(id); B().renderSetupView && B().renderSetupView(); }
    renderSelect();
  }

  // buttons in the Roles panel
  function saveCurrent() {
    const st = B()._state, ids = st.scriptId === "custom" ? st.customRoles : ((B().getScriptRoles && B().getScriptRoles()) || st.customRoles);
    if (!ids || !ids.length) { alert(tr("אין תפקידים לשמור — בחר קודם תפקידים.", "Nothing to save — pick some roles first.")); return; }
    openDialog({ name: "", author: "", ids }, tr("שמירת הסט שבנית", "Save the set you built"));
  }
  function pickImage() {
    let inp = document.getElementById("bkSetImg");
    if (!inp) { inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.id = "bkSetImg"; inp.hidden = true; document.body.appendChild(inp); }
    inp.value = "";
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const st = document.getElementById("bkSetStatus"); if (st) st.textContent = tr("קורא את התמונה…", "Reading the picture…");
      try { const d = await fromImage(f, p => { if (st) st.textContent = tr(`קורא את התמונה… ${Math.round(p * 100)}%`, `Reading the picture… ${Math.round(p * 100)}%`); }); if (st) st.textContent = ""; openDialog(d, tr("סט מתמונה", "Set from a picture")); }
      catch (e) { if (st) st.textContent = tr("לא הצלחתי לקרוא את התמונה (צריך חיבור לאינטרנט).", "Couldn't read the picture (needs an internet connection)."); }
    };
    inp.click();
  }
  function pasteJSON() {
    const txt = prompt(tr("הדבק כאן את ה־JSON של הסט (מ־Script Tool או botcscripts.com):", "Paste the set's JSON (from the Script Tool or botcscripts.com):"));
    if (!txt) return;
    try { openDialog(fromJSON(txt), tr("סט מ־JSON", "Set from JSON")); } catch (e) { alert(tr("זה לא JSON תקין של סט.", "That isn't a valid set JSON.")); }
  }
  function deleteCurrent() {
    const sel = document.getElementById("scriptSelect"); if (!sel || !sel.value.startsWith("u_")) return;
    const s = list().find(x => x.id === sel.value);
    if (!confirm(tr(`למחוק את הסט "${s ? s.name : ""}" מהרשימה?`, `Delete the set "${s ? s.name : ""}"?`))) return;
    remove(sel.value); use("crimson_guard");
  }

  window.BKSets = { list, get, save, remove, renderSelect, fromText, fromJSON, fromImage, saveCurrent, pickImage, pasteJSON, deleteCurrent, use };
})();
