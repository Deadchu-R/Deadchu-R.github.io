/* Bootkeh live game (window.BKLive) — runs the game across everyone's phones.
   Storyteller panel (top of the "Game" tab):
     phase stepper (night → day → accusations → night…), announcements, accusations with a live vote
     (players vote on their own page, or the storyteller ticks hands raised at the table), execution, and the
     night composer that sends every player their info for the night in one go (alive and dead players separately).
   Player page (…/Bootkeh/?g=<game>&k=<key>):
     the current phase, alerts (vibration, sound, system notification) when someone is accused or the storyteller
     announces something, the accusation with "for / against" buttons and the accused's defence, the town list,
     and the player's own role card with every piece of info received so far.
   Data lives in Firestore through window.BKCloud (assets/bootkeh-cloud.js); the rules in firestore.rules decide who
   may change what (only the storyteller changes the game; a player only their own vote and defence). */
(function () {
  "use strict";
  // ---------------------------------------------------------------------------------------------
  // The roles sheet, laid out like the official script sheet: title "by author", a line per kind with its label at the
  // end, two columns of icon + name (blue = good, red = evil) + ability, and the "* Not the first night" footer.
  // Used by the storyteller's "Roles sheet" screen and by the 📜 pull-out on the players' phones.
  // opts: {title, author, roles:[{icon,type,name_he,name_en,ability_he,ability_en}], lang}
  // ---------------------------------------------------------------------------------------------
  function sheetHTML(o) {
    const isHe = (o.lang || "he") !== "en", e = x => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const kinds = [["townsfolk", "תושבי העיירה", "Townsfolk"], ["outsider", "אאוטסיידרים", "Outsiders"], ["minion", "משרתים", "Minions"], ["demon", "שדים", "Demons"],
      ["traveller", "נוסעים", "Travellers"], ["fabled", "אגדיים", "Fabled"]];
    const roles = o.roles || [];
    return `<div class="bk-script bk-script-${sheetMode()}" dir="${isHe ? "rtl" : "ltr"}">
      <div class="bk-script-head"><h2>${e(o.title || "")}</h2>${o.author ? `<span>${isHe ? "מאת" : "by"} ${e(o.author)}</span>` : ""}</div>
      ${kinds.map(([k, h, en]) => { const rs = roles.filter(r => r.type === k); if (!rs.length) return "";
        return `<div class="bk-script-kind ${k}"><div class="bk-script-rule"><span>${isHe ? h : en.toUpperCase()}</span></div>
          <div class="bk-script-grid">${rs.map(r => `<div class="bk-script-role ${k}"><div class="bk-script-ic" aria-hidden="true">${r.icon || "🎭"}</div>
            <div><b>${e(isHe ? r.name_he || r.name_en : r.name_en || r.name_he)}</b><p>${e(isHe ? r.ability_he || r.ability_en : r.ability_en || r.ability_he)}</p></div></div>`).join("")}</div></div>`;
      }).join("")}
      <div class="bk-script-foot"><span>© Steven Medway, bloodontheclocktower.com</span><span>* ${isHe ? "לא בלילה הראשון" : "Not the first night"}</span></div>
    </div>`;
  }
  // Two ways to show the sheet: "list" (one column that scrolls, easy to read on a phone) or "page" (the whole sheet in
  // two columns like the printed one, shrunk to fit the screen; pinch to zoom in). The choice is kept on this device.
  // "tv" = a 16:9 sheet (four columns, big type) to show on a screen or a TV.
  function sheetMode() { try { return localStorage.getItem("bk_sheet_mode") || "list"; } catch (e) { return "list"; } }
  function fitSheets() {
    document.querySelectorAll(".bk-script-page").forEach(el => {
      const box = el.parentElement, w = box ? box.clientWidth : 0;
      el.style.zoom = w ? Math.min(1, w / 1000).toFixed(3) : "";
    });
    document.querySelectorAll(".bk-script-tv").forEach(el => {
      el.style.zoom = ""; el.style.setProperty("--tvk", "1");
      const box = el.parentElement, onTV = !!el.closest("#bkTV"), w = onTV ? innerWidth : (box ? box.clientWidth : 0), h = onTV ? innerHeight : w * 9 / 16;
      // shrink the type when there are many roles, so it all fits in 16:9
      let k = 1; while (el.scrollHeight > 900 && k > 0.6) { k -= 0.05; el.style.setProperty("--tvk", k.toFixed(2)); }
      if (w) el.style.zoom = Math.min(w / 1600, h / 900).toFixed(4);
    });
    document.querySelectorAll(".bk-sheet-mode button").forEach(b => b.classList.toggle("on", b.dataset.mode === sheetMode()));
  }
  function setMode(m) {
    try { localStorage.setItem("bk_sheet_mode", m); } catch (e) {}
    document.querySelectorAll(".bk-script").forEach(el => { if (el.closest("#bkTV")) return; el.classList.toggle("bk-script-page", m === "page"); el.classList.toggle("bk-script-tv", m === "tv"); el.classList.toggle("bk-script-list", m !== "page" && m !== "tv"); });
    fitSheets();
  }

  // ---- 📺 the roles sheet on a TV: a link that holds the list of roles (public in this game) and the time it stops working ----
  const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const b64d = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))));
  function tvLink(hours) {
    const st = window.Bootkeh && window.Bootkeh._state, d = (st && st.sheetData) || { title: "", author: "", ids: [] };
    const base = location.origin + location.pathname.replace(/\/Bootkeh(\.html|\/index\.html|\/)?$/i, "/").replace(/[^/]*$/, "") + "Bootkeh/";
    return base + "?tv#" + b64e({ t: d.title, a: d.author, l: (st && st.lang) || "he", r: d.ids, x: Date.now() + hours * 3600e3 });
  }
  function tvDialog() {
    const he = !window.Bootkeh || window.Bootkeh._state.lang !== "en", T = (h, e) => he ? h : e;
    let ov = document.getElementById("bkTvDlg");
    if (!ov) { ov = document.createElement("div"); ov.id = "bkTvDlg"; ov.className = "bk-sendall"; document.body.appendChild(ov); }
    let hours = 4;
    const draw = () => { const url = tvLink(hours);
      ov.innerHTML = `<div class="bk-sendall-card bk-group" role="dialog" aria-label="${T("קישור לטלוויזיה", "Link for a TV")}">
        <div class="bk-sendall-top"><b>📺 ${T("דף התפקידים בטלוויזיה", "The roles sheet on a TV")}</b><button type="button" class="bk-sendall-x" aria-label="${T("סגור", "Close")}">×</button></div>
        <p class="bk-hint">${T("פתח את הקישור בדפדפן של הטלוויזיה (או סרוק את הקוד בטלפון ושדר למסך). הדף מוצג ב־16:9 על כל המסך, ומפסיק לעבוד אחרי הזמן שבחרת.", "Open the link in the TV's browser (or scan the code with a phone and cast it). The sheet fills the screen in 16:9 and stops working after the time you choose.")}</p>
        <div class="bk-seg bk-tv-hours">${[2, 4, 8, 12].map(h => `<button type="button" data-h="${h}" class="${h === hours ? "on" : ""}">${h} ${T("שעות", "hours")}</button>`).join("")}</div>
        <div class="bk-qr" id="bkTvQr" aria-label="QR"></div>
        <div class="bk-row"><button type="button" class="bk-btn pri" data-act="copy">${T("העתק קישור", "Copy link")}</button><a class="bk-btn" href="${url}" target="_blank" rel="noopener">${T("פתח בטאב חדש", "Open in a new tab")}</a></div>
      </div>`;
      ov.querySelector(".bk-sendall-x").onclick = () => ov.remove();
      ov.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { hours = +b.dataset.h; draw(); });
      ov.querySelector('[data-act="copy"]').onclick = e => { navigator.clipboard && navigator.clipboard.writeText(url); e.target.textContent = "✓"; };
      drawQr(url, "bkTvQr");
    };
    draw();
  }
  function openTV() {
    let d = null; try { d = b64d(location.hash.slice(1)); } catch (e) {}
    const he = !d || d.l !== "en";
    document.documentElement.classList.add("bk-tv-mode");
    const root = document.createElement("div"); root.id = "bkTV"; document.body.appendChild(root);
    if (!d || !Array.isArray(d.r) || !(d.x > Date.now())) {
      document.title = "Bootkeh";
      root.innerHTML = `<div class="bk-tv-msg"><b>⌛</b><p>${he ? "הקישור הזה כבר לא פעיל. בקש ממספר הסיפורים קישור חדש." : "This link has expired. Ask the storyteller for a new one."}</p></div>`; return;
    }
    const roles = d.r.map(id => window.Bootkeh && window.Bootkeh.getRole(id)).filter(Boolean);
    document.title = `📺 ${d.t || "Bootkeh"}`;
    root.innerHTML = sheetHTML({ title: d.t, author: d.a, roles, lang: d.l }).replace(/bk-script bk-script-\w+/, "bk-script bk-script-tv")
      + `<button type="button" class="bk-tv-full" aria-label="${he ? "מסך מלא" : "Full screen"}">⛶</button>`;
    root.querySelector(".bk-tv-full").onclick = () => { const f = document.documentElement; (f.requestFullscreen || f.webkitRequestFullscreen || (() => {})).call(f); };
    fitSheets();
    setTimeout(() => { root.innerHTML = `<div class="bk-tv-msg"><b>⌛</b><p>${he ? "הקישור הזה כבר לא פעיל." : "This link has expired."}</p></div>`; }, Math.min(d.x - Date.now(), 2147483000));
    let idle; addEventListener("mousemove", () => { root.classList.remove("idle"); clearTimeout(idle); idle = setTimeout(() => root.classList.add("idle"), 2500); });
  }
  addEventListener("resize", () => fitSheets());
  window.BKSheet = { html: sheetHTML, setMode, fit: fitSheets, mode: sheetMode, tvLink, tvDialog, openTV };

  // Copy every "small screen" rule (@media max-width ≤ 900px) of the Bootkeh styles to html.bk-phone, so a phone gets
  // the phone layout even when the browser lays the page out wider than the screen (see the script in Bootkeh.html).
  function phoneStyles() {
    const d = document.documentElement; if (!d.classList.contains("bk-phone") || document.getElementById("bkPhoneCss")) return;
    const out = [];
    const pre = sel => sel.split(",").map(x => { x = x.trim(); if (!x) return x;
      if (/^html\b/.test(x)) return x.replace(/^html/, "html.bk-phone"); if (/^:root\b/.test(x)) return x.replace(/^:root/, "html.bk-phone");
      return "html.bk-phone " + x; }).join(", ");
    const walk = rules => { for (const r of rules) {
      if (r.type === 4 /* media */) {
        const m = /max-width:\s*(\d+)px/.exec(r.conditionText || r.media.mediaText || ""), print = /print/.test(r.conditionText || "");
        if (m && +m[1] <= 900 && !print) for (const x of r.cssRules) if (x.selectorText) out.push(pre(x.selectorText) + "{" + x.style.cssText + "}");
      } } };
    for (const sh of document.styleSheets) { if (!/bootkeh/.test(sh.href || "")) continue; try { walk(sh.cssRules); } catch (e) { /* other origin */ } }
    const st = document.createElement("style"); st.id = "bkPhoneCss"; st.textContent = out.join("\n"); document.head.appendChild(st);
  }
  if (document.readyState === "complete") phoneStyles(); else addEventListener("load", phoneStyles);
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // a seat's face: its photo (from the saved players) or its first letter
  const okPic = u => typeof u === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u);
  const av = (x, cls) => `<span class="bk-avatar${cls ? " " + cls : ""}">${x && okPic(x.photo) ? `<img src="${x.photo}" alt="">` : `<span>${esc((String(x && x.name || "?").trim()[0] || "?").toUpperCase())}</span>`}</span>`;
  // who runs the game, shown to the players so they know who is who
  const stLine = (s, T) => s && s.st && s.st.name ? `<div class="bkp-st">${av(s.st, "sm")}<span>👑 ${T("מספר הסיפורים", "Storyteller")}: <b>${esc(s.st.name)}</b></span></div>` : "";
  const B = () => window.Bootkeh, C = () => window.BKCloud;
  const he = () => (B() && B()._state ? B()._state.lang : "he") !== "en";
  const tr = (h, e) => he() ? h : e;
  const phaseName = (st, isHe) => {
    const H = isHe !== false;
    if (!st) return "";
    if (st.phase === "lobby") return H ? "מתכוננים" : "Getting ready";
    if (st.phase === "end") return H ? "סוף המשחק" : "Game over";
    if (st.phase === "night") return (H ? "לילה " : "Night ") + st.day;
    if (st.phase === "dawn") return (H ? "בוקר יום " : "Dawn, day ") + st.day;
    if (st.phase === "nominate") return (H ? "ערב " : "Evening ") + st.day + (H ? " · האשמות והצבעות" : " · Nominations & votes");
    return (H ? "יום " : "Day ") + st.day + (H ? " · דיון" : " · Discussion");
  };
  const needed = st => Math.ceil(((st && st.seats) || []).filter(s => s.alive).length / 2);
  const TYPES = [["townsfolk", "תושבי העיירה", "Townsfolk"], ["outsider", "אאוטסיידרים", "Outsiders"], ["minion", "משרתים", "Minions"], ["demon", "שדים", "Demons"]];

  // =============================================================================================
  // Storyteller — the game flow:  send to everyone → night 1 → dawn (who died) → day → accusations → night 2 → …
  // Every step updates every phone at once (phase + an announcement), and everything can still be changed by hand.
  // =============================================================================================
  const ST = { game: null, players: {}, taken: {}, unGame: null, unPlayers: null, unTaken: null, gid: null, draft: {}, deaths: {}, edit: {}, ieOpen: false, chips: {}, executed: null, dec: {}, decDone: {}, rcpt: {}, pendingKills: [], poisonExtra: [] };

  // Start listening to the live game made on this device (called when the Game tab is shown).
  async function attach() {
    const g = B() && B().liveGame && B().liveGame();
    if (!g) { ST.gid = null; render(); return; }
    if (ST.gid === g.gameId) { render(); return; }
    ST.gid = g.gameId; ST.game = null; ST.players = {}; ST.taken = {}; ST.draft = {};
    try {
      [ST.unGame, ST.unPlayers, ST.unTaken].forEach(u => u && u());
      ST.unGame = await C().watchGame(g.gameId, s => { ST.game = s; render(); });
      ST.unPlayers = await C().watchPlayers(g.gameId, ps => { ST.players = ps; render(); processActs(); });
      ST.unTaken = await C().watchTaken(g.gameId, t => {
        const before = Object.keys(ST.taken).length; ST.taken = t; render(); redrawGroup();
        const n = players().length, now = Object.keys(t).length;
        if (now >= n && before < n && n) { if (navigator.vibrate) navigator.vibrate([100, 50, 100]); toast(tr("כולם הצטרפו — אפשר להתחיל", "Everyone joined — you can start")); }
      });
    } catch (e) { console.warn(e); }
  }

  // Right after "Deal roles": make the private pages, start listening, and open "send to everyone".
  async function startFlow() {
    try { if (!B().liveGame()) await B().createLiveGame(); } catch (e) { console.warn(e); }
    if (!B().liveGame()) return;
    await attach();
    groupSend();
  }

  const key = seat => { const g = B().liveGame(); return g && g.keys[seat]; };
  const players = () => (B()._state.players || []);
  const seatsFromLocal = () => players().map(p => ({ seat: p.seat, name: p.name, alive: p.isAlive !== false, ghost: p.ghost !== false }));
  const notice = text => ({ id: "n" + Date.now(), text: String(text).slice(0, 300) });
  const names = list => list.map(s => s.name).join(", ");

  function toast(text) {
    let t = document.getElementById("bkStToast");
    if (!t) { t = document.createElement("div"); t.id = "bkStToast"; t.className = "bkp-toast"; document.body.appendChild(t); }
    t.innerHTML = `<b>${esc(text)}</b>`; t.classList.add("on"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 5000);
  }

  // Keep the shared "who is alive" list in step with the board (called after a seat is marked alive/dead).
  async function syncSeats() {
    if (!ST.gid) return;
    try { await C().setState(ST.gid, { seats: seatsFromLocal() }); } catch (e) { console.warn(e); }
  }
  function mirrorLocal(seats) {
    for (const p of players()) { const s = seats.find(x => x.seat === p.seat); if (s) { p.isAlive = s.alive; p.ghost = s.ghost; } }
    B().saveLive && B().saveLive();
    B().renderBoardView && B().renderBoardView();
  }

  // Move to a phase; every phone gets the new phase and a short announcement.
  //   night after a day → the next night;  dawn/day keep the same number (Night 1 → Day 1 → Night 2 …)
  async function setPhase(phase, extra) {
    ST.msg = "";
    const st = ST.game || {}, from = st.phase || "lobby";
    let day = st.day || 1;
    if (phase === "night" && ["day", "nominate", "dawn"].includes(from)) day += 1;
    const isHe = he(), patch = Object.assign({ phase, day }, extra || {});
    if (phase === "night") { patch.nom = null; ST.draft = {}; ST.poisonExtra = []; }
    // the day is talk on a timer; then the evening: nominations, each one opens a new window to nominate
    if (phase === "day") { patch.dayUntil = Date.now() + times().day * 60e3; patch.nomUntil = null; }
    if (phase === "nominate") { patch.dayUntil = null; patch.nomUntil = Date.now() + times().win * 1e3; }
    if (phase === "night" || phase === "dawn") { patch.dayUntil = null; patch.nomUntil = null; }
    // a new day: nobody has accused or been accused yet, nobody is on the block (official rules)
    if ((phase === "day" || phase === "dawn") && !["day", "nominate"].includes(from)) patch.today = { by: {}, on: {}, block: null };
    if (!patch.notice) {
      const say = { night: tr(`לילה ${day} — כולם עוצמים עיניים. מי שמתעורר יקבל הודעה.`, `Night ${day} — everyone close your eyes. Whoever wakes gets a message.`),
        day: tr(`יום ${day} — דיון חופשי. אפשר לדבר עם כולם.`, `Day ${day} — talk freely with everyone.`),
        nominate: tr("ערב — ההאשמות פתוחות. מי שרוצה להאשים, מאשים עכשיו (בטלפון או ליד השולחן).", "Evening — nominations are open. Nominate now (on your phone or at the table)."),
        lobby: "" }[phase];
      if (say) patch.notice = notice(say);
    }
    void isHe;
    await C().setState(ST.gid, patch);
  }

  // ---- timers (the storyteller sets the lengths; every phone shows the countdown) ----
  //  day = minutes of talk, def = seconds for the accusation & defence speeches before the vote, win = seconds to make
  //  the next nomination (restarts after every vote; when it runs out, no more nominations today)
  function times() { let t = {}; try { t = JSON.parse(localStorage.getItem("bk_times") || "{}"); } catch (e) {} return { day: +t.day || 5, def: +t.def || 60, win: +t.win || 60 }; }
  function setTime(k, v) { const t = times(); t[k] = Math.max(k === "day" ? 1 : 10, +v || 0); try { localStorage.setItem("bk_times", JSON.stringify(t)); } catch (e) {} }
  const mmss = ms => { const x = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(x / 60) + ":" + String(x % 60).padStart(2, "0"); };
  const timerTag = (until, label) => until ? `<span class="bk-timer${until < Date.now() ? " over" : ""}" data-until="${until}">⏱ ${label ? esc(label) + " " : ""}<b>${mmss(until - Date.now())}</b></span>` : "";
  // one clock for every countdown on the page
  setInterval(() => { document.querySelectorAll(".bk-timer[data-until]").forEach(el => { const u = +el.dataset.until, b = el.querySelector("b"); if (b) b.textContent = mmss(u - Date.now()); el.classList.toggle("over", u < Date.now()); }); stTick(); }, 1000);
  // the storyteller's page moves the game on when a timer ends
  const fired = {};
  function stTick() {
    const st = ST.game; if (!st || !ST.gid || !B() || !B().liveGame || !B().liveGame()) return;
    const now = Date.now();
    if (st.phase === "day" && st.dayUntil && now > st.dayUntil && !fired["d" + st.dayUntil]) { fired["d" + st.dayUntil] = 1; setPhase("nominate").catch(() => {}); }
    if (st.phase === "nominate" && st.nom && st.nom.open && st.nom.stage === "defense" && st.nom.defUntil && now > st.nom.defUntil && !fired["v" + st.nom.id]) { fired["v" + st.nom.id] = 1; startVote().catch(() => {}); }
  }
  async function startVote() { const n = ST.game && ST.game.nom; if (!n || !n.open || n.stage === "vote") return; await C().setState(ST.gid, { "nom.stage": "vote", notice: notice(tr(`ההצבעה על ${n.onName} נפתחה — הצביעו עכשיו.`, `The vote on ${n.onName} is open — vote now.`)) }); }
  async function addTime(k, sec) { const st = ST.game || {}; if (k === "day") await C().setState(ST.gid, { dayUntil: Math.max(Date.now(), st.dayUntil || 0) + sec * 1e3 });
    if (k === "win") await C().setState(ST.gid, { nomUntil: Math.max(Date.now(), st.nomUntil || 0) + sec * 1e3 });
    if (k === "def" && st.nom) await C().setState(ST.gid, { "nom.defUntil": Math.max(Date.now(), st.nom.defUntil || 0) + sec * 1e3 }); }
  const nomWindowOpen = st => st && st.phase === "nominate" && !(st.nom && st.nom.open) && (!st.nomUntil || Date.now() <= st.nomUntil + 3000);
  function timesHTML() { const t = times();
    return `<details class="bk-lp-sec bk-ie bk-times"><summary><h4>⏱ ${tr("זמנים", "Timers")}</h4><small>${tr(`דיון ${t.day} דק׳ · הגנה ${t.def} שנ׳ · הצעה ${t.win} שנ׳`, `talk ${t.day} min · defence ${t.def}s · nominate ${t.win}s`)}</small></summary>
      <div class="bk-row"><label>${tr("דיון ביום (דקות)", "Day talk (minutes)")}<input type="number" min="1" max="60" value="${t.day}" onchange="window.BKLive.setTime('day', this.value)"></label>
      <label>${tr("נאום האשמה והגנה (שניות)", "Accusation & defence (seconds)")}<input type="number" min="10" max="600" value="${t.def}" onchange="window.BKLive.setTime('def', this.value)"></label>
      <label>${tr("זמן להצעה הבאה (שניות)", "Time for the next nomination (seconds)")}<input type="number" min="10" max="600" value="${t.win}" onchange="window.BKLive.setTime('win', this.value)"></label></div></details>`; }

  // Dawn: the storyteller marks who died in the night, then everyone hears it.
  function toggleDeath(seat) { ST.deaths[seat] = !ST.deaths[seat]; render(); }
  async function announceDawn() {
    const st = ST.game || {}, seats = (st.seats || []).map(s => Object.assign({}, s));
    // for the day: who is poisoned, and whom the Devil's Advocate protects from execution
    const pois = poisonedTonight(), acts = actsTonight();
    ST.dayPoison = pois; ST.daProtect = [];
    for (const [sx, tg] of Object.entries(acts)) { const q = players().find(x => x.seat === +sx); if (q && q.role.id === "devils_advocate" && q.isAlive !== false && !q.isDrunk && !pois.includes(q.seat)) ST.daProtect.push(...tg); }
    const died = seats.filter(s => ST.deaths[s.seat] && s.alive); died.forEach(s => { s.alive = false; });
    ST.deaths = {}; mirrorLocal(seats);
    const text = died.length ? tr(`בוקר, יום ${st.day}. הלילה ${died.length > 1 ? "מתו" : "מת/ה"}: ${names(died)}.`, `Morning, day ${st.day}. Died tonight: ${names(died)}.`)
                             : tr(`בוקר, יום ${st.day}. אף אחד לא מת הלילה.`, `Morning, day ${st.day}. Nobody died tonight.`);
    await setPhase("day", { seats, notice: notice(text) });
    checkWin(seats);
  }

  // End the night in one tap: the deaths come from tonight's choices (+ the storyteller's decisions) and everyone is told
  async function endNightAuto() {
    const st = ST.game || {}; if (window.BKRules) { const res = window.BKRules.resolveNight(players(), actsTonight(), he() ? "he" : "en");
      ST.deaths = {}; res.deaths.forEach(x => ST.deaths[x] = true); (ST.pendingKills || []).forEach(x => ST.deaths[x] = true); ST.pendingKills = []; ST.dawnFor = st.day; ST.dawnRes = res; }
    await announceDawn();
  }
  function presets(st) {
    const d = (st && st.day) || 1;
    return [tr("נשארה דקה להצבעה ⏳", "One minute to the vote ⏳"), tr("עוד 5 דקות לסוף הדיון", "5 minutes left to talk"), tr("כולם לחזור לשולחן 🪑", "Everyone back to the table 🪑"),
      tr(`לילה ${d} — עצמו עיניים 🌙`, `Night ${d} — close your eyes 🌙`), tr("בוקר טוב — פקחו עיניים ☀️", "Good morning — open your eyes ☀️"), tr("ההאשמות נפתחות עכשיו ⚖️", "Nominations open now ⚖️"),
      tr("שקט בבקשה — מספר הסיפורים מדבר", "Quiet please — the storyteller is talking"), tr("הפסקה של 5 דקות ☕", "5-minute break ☕"), tr("מי שמת — עדיין יש לו הצבעה אחת 👻", "The dead still have one vote 👻")];
  }
  async function announcePreset(i) { const x = presets(ST.game)[i]; if (x) { await C().setState(ST.gid, { notice: notice(x) }); toast("📣 " + x); } }
  async function announce() {
    const ta = document.getElementById("bkLiveNotice"); const text = ta && ta.value.trim(); if (!text) return;
    await C().setState(ST.gid, { notice: notice(text) });
    ta.value = "";
  }

  // Open an accusation: by → on. Official rules: only living players accuse; each player accuses at most once a day
  // and can be accused at most once a day; one accusation at a time.
  async function openNom() {
    const by = +document.getElementById("bkNomBy").value, on = +document.getElementById("bkNomOn").value;
    if (!on || !by) return;
    await openNomFor(by, on);
  }
  async function openNomFor(by, on) {
    const st = ST.game || {}, today = st.today || { by: {}, on: {}, block: null };
    const s = (st.seats || []).find(x => x.seat === on), b = (st.seats || []).find(x => x.seat === by);
    const byP = { ...today.by, [by]: true }, onP = { ...today.on, [on]: true };
    const virgin = players().find(p => p.seat === on && p.role.id === "virgin");
    if (virgin) ST.msg = tr("👁 הבתולה הואשמה — אם זו הפעם הראשונה והמאשים הוא תושב (לא שיכור/מורעל), המאשים מוצא להורג מיד.", "👁 The Virgin was nominated — if this is the first time and the nominator is a Townsfolk, the nominator is executed immediately.");
    await C().setState(ST.gid, { phase: "nominate", today: { ...today, by: byP, on: onP }, nomUntil: null, nom: { id: "m" + Date.now(), by, on, byName: b ? b.name : "", onName: s ? s.name : "", open: true, manual: {}, result: null,
      stage: "defense", defUntil: Date.now() + times().def * 1e3, accText: "", defText: "" },
      notice: notice(tr(`${b ? b.name : ""} מאשים את ${s ? s.name : ""}. קודם נאום ההאשמה וההגנה — ההצבעה תיפתח אחריהם.`, `${b ? b.name : ""} nominates ${s ? s.name : ""}. First the accusation and the defence — then the vote opens.`)) });
  }

  // Count of "yes" votes: from players' own pages (only for this accusation) plus hands the storyteller ticked.
  function tally() {
    const st = ST.game || {}, nom = st.nom; if (!nom) return { yes: [], no: [] };
    const yes = new Set(), no = new Set();
    for (const s of st.seats || []) {
      if (!s.alive && !s.ghost) continue;
      const p = ST.players[s.seat], m = (nom.manual || {})[s.seat];
      if (m === "yes") yes.add(s.seat); else if (m === "no") no.add(s.seat);
      else if (p && p.vote && p.vote.nom === nom.id) (p.vote.v === "yes" ? yes : no).add(s.seat);
    }
    return { yes: [...yes], no: [...no] };
  }

  // Storyteller taps a seat in the vote list: none → for → against → none (votes counted by hand at the table).
  async function toggleHand(seat) {
    const nom = ST.game && ST.game.nom; if (!nom) return;
    const cur = (nom.manual || {})[seat], next = !cur ? "yes" : cur === "yes" ? "no" : null;
    const manual = Object.assign({}, nom.manual || {}); if (next) manual[seat] = next; else delete manual[seat];
    await C().setState(ST.gid, { "nom.manual": manual });
  }

  // Count the vote (official rules): with at least half the living players AND more votes than anyone so far today,
  // the accused goes "on the block" (about to die). Equal to the top count = a tie: nobody is on the block.
  // Nobody dies yet — the execution happens when the day ends. Dead players who voted "for" spend their ghost vote.
  async function closeNom() {
    const st = ST.game || {}, nom = st.nom; if (!nom) return;
    const t = tally(), v = t.yes.length, need = needed(st), seats = (st.seats || []).map(s => Object.assign({}, s));
    for (const s of seats) if (!s.alive && t.yes.includes(s.seat)) s.ghost = false;
    const today = st.today || { by: {}, on: {}, block: null }, top = today.block ? today.block.votes : 0;
    let block = today.block || null, result, text;
    if (v >= need && v > top) { block = { seat: nom.on, name: nom.onName, votes: v }; result = "block";
      text = tr(`${nom.onName} על הגרדום עם ${v} קולות. אם אף אחד לא יקבל יותר — יוצא להורג בסוף היום.`, `${nom.onName} is on the block with ${v} votes. Unless someone gets more, they are executed at the end of the day.`); }
    else if (v >= need && v === top) { block = { seat: null, name: "", votes: v, tie: true }; result = "tie";
      text = tr(`תיקו (${v} קולות) — אף אחד לא על הגרדום כרגע.`, `A tie (${v} votes) — nobody is on the block now.`); }
    else { result = "short"; text = tr(`${nom.onName}: ${v} קולות — ${v < need ? `צריך לפחות ${need}` : `צריך יותר מ־${top}`}. לא עולה לגרדום.`, `${nom.onName}: ${v} votes — ${v < need ? `needs at least ${need}` : `needs more than ${top}`}. Not on the block.`); }
    mirrorLocal(seats);
    await C().setState(ST.gid, { seats, today: { ...today, block }, nom: Object.assign({}, nom, { open: false, yes: v, result }), nomUntil: Date.now() + times().win * 1e3,
      notice: notice(text + " " + tr(`יש ${times().win} שניות להאשמה הבאה.`, `${times().win} seconds for the next nomination.`)) });
  }

  // End of the day: execute whoever is on the block (at most one execution a day; the storyteller may also skip it),
  // then the night begins. Everyone is told.
  async function endDay(executeIt) {
    const st = ST.game || {}, today = st.today || {}, b = today.block, seats = (st.seats || []).map(s => Object.assign({}, s));
    let text;
    if (executeIt && b && b.seat && (ST.daProtect || []).includes(b.seat)) { ST.executed = { seat: b.seat, day: st.day || 1 };
      text = tr(`${b.name} הוצא/ה להורג — אבל לא מת/ה!`, `${b.name} was executed — but does not die!`); executeIt = false; }
    else if (executeIt && b && b.seat) { const s = seats.find(x => x.seat === b.seat); if (s) s.alive = false; ST.executed = { seat: b.seat, day: st.day || 1 };
      text = tr(`${b.name} הוצא/ה להורג.`, `${b.name} was executed.`); }
    else text = tr("היום אף אחד לא הוצא להורג.", "Nobody was executed today.");
    mirrorLocal(seats);
    const next = (st.day || 1) + 1;
    await setPhase("night", { seats, notice: notice(text + " " + tr(`לילה ${next} — כולם עוצמים עיניים.`, `Night ${next} — everyone close your eyes.`)) });
    if (executeIt && b && b.seat) checkWin(seats, b.seat);
  }

  // Has a team won? (official: the Demon dies → good wins, unless the Scarlet Woman takes over with 5+ alive;
  // only 2 players alive → evil wins; the Saint executed → evil wins). Returns {team, why} or null.
  function winState(seats, executedSeat) {
    const ps = players(), alive = seats.filter(s => s.alive), aliveP = ps.filter(p => (seats.find(s => s.seat === p.seat) || {}).alive);
    if (executedSeat) { const ex = ps.find(p => p.seat === executedSeat); if (ex && ex.role.id === "saint") return { team: "evil", why: tr("הקדוש הוצא להורג.", "The Saint was executed.") }; }
    const demonAlive = aliveP.some(p => p.role.type === "demon");
    if (!demonAlive) {
      const sw = aliveP.find(p => p.role.id === "scarlet_woman");
      if (sw && alive.length + 1 >= 5) return { team: null, why: tr(`השד מת — אבל ${sw.name} (הגברת בארגמן) הופכת לשד. המשחק ממשיך.`, `The Demon died — but ${sw.name} (Scarlet Woman) becomes the Demon. The game goes on.`) };
      return { team: "good", why: tr("השד מת.", "The Demon is dead.") };
    }
    if (alive.length <= 2) return { team: "evil", why: tr("נשארו רק שני שחקנים חיים.", "Only two players are alive.") };
    return null;
  }
  function checkWin(seats, executedSeat) { ST.win = winState(seats || (ST.game || {}).seats || [], executedSeat); render(); }
  async function declareWin(team) {
    const why = (ST.win && ST.win.why) || "";
    const reveal = players().map(p => ({ seat: p.seat, name: p.name, role: p.role.id, icon: p.role.icon, he: p.role.name_he, en: p.role.name_en, align: p.alignment }));
    await C().setState(ST.gid, { phase: "end", winner: team, reveal, notice: notice((team === "good" ? tr("🏆 הטובים ניצחו! ", "🏆 Good wins! ") : tr("😈 הרעים ניצחו! ", "😈 Evil wins! ")) + why) });
    ST.win = null;
  }

  // Ready answers to tap (assets/bootkeh-rules.js): night 1 = the true info and the prepared false ones; later nights =
  // Empath numbers, Fortune Teller yes/no, Undertaker, Oracle…; plus quick messages ("You died tonight", "You are now evil"…).
  function rulesCtx() {
    const st = B()._state, pool = (st.poolIds || []).map(id => B().getRole(id)).filter(Boolean);
    const ex = ST.executed && ST.executed.day === ((ST.game && ST.game.day) || 1) - 1 ? players().find(p => p.seat === ST.executed.seat) : null;
    return { players: players(), pool, rules: st.rules || {}, lang: he() ? "he" : "en", executedToday: ex };
  }
  function chipsFor(p, target) {
    const R = window.BKRules; if (!R) return "";
    if (!ST.manual && target !== "ie") return "";   // the answer is written by the rules; ✋ shows the true / false options
    const st = ST.game || {}, first = (st.day || 1) === 1 && st.phase === "night", out = [];
    if ((target === "night" || target === "all") && first) {
      if (p.firstNightInfo) out.push({ label: tr("המידע שחושב", "Dealt info") + (p.isDrunk ? " (" + tr("שקרי", "false") + ")" : ""), text: p.firstNightInfo, truth: !p.isDrunk });
      (p.fnAlt || []).slice(0, 3).forEach((t, i) => out.push({ label: (p.isDrunk && i === (p.fnAlt.length - 1) ? tr("אמת", "True") : tr("שקר", "False")) + " " + (i + 1), text: t, truth: false }));
    } else R.laterNight(p, rulesCtx()).forEach(x => out.push(x));
    if (target === "ie") R.quick(he() ? "he" : "en").forEach(q => out.push({ label: q.text.split(" ").slice(0, 3).join(" "), text: q.text, truth: null }));
    if (!out.length) return "";
    ST.chips[target + p.seat] = out.map(x => x.text);
    return `<div class="bk-chips">${out.map((x, i) => `<button type="button" class="${x.truth === true ? "t" : x.truth === false ? "f" : ""}" onclick="window.BKLive.useChip('${target}', ${p.seat}, ${i})" title="${esc(x.text)}">${x.truth === true ? "✓ " : x.truth === false ? "✗ " : ""}${esc(x.label)}</button>`).join("")}</div>`;
  }
  function useChip(target, seat, i) {
    const text = (ST.chips[target + seat] || [])[i]; if (text == null) return;
    if (target === "night" || target === "all") { ST.draft[seat] = text; ["bkNight-", "bkAll-"].forEach(k => { const ta = document.getElementById(k + seat); if (ta) ta.value = text; }); }
    else { ST.edit[seat] = text; render(); }
  }
  // who wakes tonight, in order (first night uses the first-night order)
  function orderedForNight(st) {
    const R = window.BKRules, ps = players();
    if (!R) return ps.slice().sort((a, b) => (b.isAlive !== false) - (a.isAlive !== false) || a.seat - b.seat);
    const order = R.nightOrder(ps, (st.day || 1) === 1), woke = order.map(x => x.p), rest = ps.filter(p => !woke.includes(p)).sort((a, b) => (b.isAlive !== false) - (a.isAlive !== false) || a.seat - b.seat);
    ST.wakeNo = {}; woke.forEach((p, i) => { ST.wakeNo[p.seat] = i + 1; });
    return woke.concat(rest);
  }

  // ---- Night runner: wake the players one by one in the official order ----
  //  wake → their phone asks them to choose (role rules from BKRules.action) → you see the choice → tap / write the
  //  answer and send it to that player → they tap "Got it" (✓) → next. Choices are kept for the dawn helper.
  function runState(st) {
    if (!ST.run || ST.run.night !== st.day) {
      // the wake order is fixed when the night starts (a role change during the night must not reshuffle it)
      const order = orderedForNight(st).filter(p => ST.wakeNo[p.seat]).map(p => p.seat);
      ST.run = { night: st.day, i: 0, woke: {}, sent: {}, order };
    }
    return ST.run;
  }
  function wokeList(st) { const run = runState(st); return run.order.map(seat => players().find(p => p.seat === seat)).filter(Boolean); }
  const nameOfSeat = seat => ((players().find(p => p.seat === seat) || {}).name || String(seat)).split(" / ")[0];
  function actsTonight() {
    const run = ST.run || { woke: {} }, out = {};
    for (const [seat, id] of Object.entries(run.woke)) { const a = ST.players[seat] && ST.players[seat].act; if (a && a.wake === id) out[seat] = a.targets || []; }
    return out;
  }
  function runnerHTML(st) {
    const R = window.BKRules; if (!R) return "";
    const run = runState(st), first = (st.day || 1) === 1;
    const woke = wokeList(st);
    if (!woke.length) return `<p class="bk-hint">${tr("אף אחד לא מתעורר הלילה.", "Nobody wakes tonight.")}</p>`;
    if (run.i >= woke.length) return `<section class="bk-run done"><b>${tr("כל מי שמתעורר סיים ✓", "Everyone who wakes is done ✓")}</b>
      <button type="button" class="bk-btn bk-wide" onclick="window.BKLive.runGo(-1)">${tr("‹ חזרה לשחקן האחרון", "‹ Back to the last player")}</button></section>`;
    const p = woke[run.i], r = p.role, th = p.thinks && B().getRole(p.thinks);
    let a = (run.wakeA && run.wakeA[p.seat]) || R.action(p, first, he() ? "he" : "en");   // as it was when they were woken
    const infoOnly = run.woke[p.seat] ? run.woke[p.seat] === "info" : (!(a.n || a.r) || (a.once && isSpent(p.seat)));
    if (infoOnly && !run.woke[p.seat]) { run.woke[p.seat] = "info"; (run.wakeA = run.wakeA || {})[p.seat] = a; }   // no "you are awake" message — just their info
    const id = run.woke[p.seat];
    const doc = ST.players[p.seat] || {}, act = doc.act && doc.act.wake === id ? doc.act : null, sentAt = run.sent[p.seat];
    const seen = sentAt && doc.seen && doc.seen.at >= sentAt;
    const v = ST.draft[p.seat] != null ? ST.draft[p.seat] : autoText(p);   // the answer by the rules (✋ to choose by hand)
    return `<section class="bk-run">
      <div class="bk-run-top"><em class="bk-wake">${run.i + 1}</em><div><b>${esc(p.name)}</b><small>${r.icon || ""} ${esc(he() ? r.name_he : r.name_en)}${th ? " → " + esc(he() ? th.name_he : th.name_en) : ""}${p.isAlive === false ? " · " + tr("מת", "dead") : ""}</small></div>
        <span class="bk-run-n">${run.i + 1}/${woke.length}</span></div>
      ${p.fnNote && first ? `<i class="bk-st-note">👁 ${esc(p.fnNote)}</i>` : ""}
      <p class="bk-hint">${esc(a.text)}</p>
      <ol class="bk-run-steps">
        ${infoOnly ? "" : `<li class="${id ? "ok" : "now"}">${id ? tr("הוער ✓", "Woken ✓") : `<button type="button" class="bk-btn pri bk-big bk-wide" onclick="window.BKLive.runWake()">${tr(`העיר את ${esc(String(p.name).split(" / ")[0])}`, `Wake ${esc(p.name)}`)}</button>`}</li>`}
        ${id && !infoOnly ? `<li class="${act ? "ok" : "now"}">${act ? (a.n || a.r ? tr("בחר: ", "Chose: ") + ((act.targets || []).map(nameOfSeat).concat((act.roles || []).map(rid => { const x = B().getRole(rid); return x ? (x.icon || "") + " " + (he() ? x.name_he : x.name_en) : rid; })).join(", ") || tr("דילג", "skipped")) : tr("ער ✓", "Awake ✓")) : tr("ממתין שיבחר בטלפון…", "Waiting for their choice…")}</li>
          ${act ? decisionsHTML(p, act) : ""}` : ""}
        ${id ? `<li class="${sentAt ? (seen ? "ok" : "now") : "now"}">
          <textarea id="bkNight-${p.seat}" rows="2" oninput="window.BKLive.draft(${p.seat}, this.value)" placeholder="${tr("התשובה שלו…", "Their answer…")}">${esc(v)}</textarea>
          ${chipsFor(p, "night")}
          <button type="button" class="bk-btn ${sentAt ? "" : "pri"} bk-wide" onclick="window.BKLive.runSend()">${sentAt ? tr("שלח שוב", "Send again") : tr("שלח לו את התשובה", "Send them the answer")}</button>
          ${sentAt ? `<span class="bk-seen">${seen ? tr("ראה ✓", "Seen ✓") : tr("נשלח — ממתין ל”הבנתי”…", "Sent — waiting for “Got it”…")}</span>` : ""}</li>` : ""}
      </ol>
      <div class="bk-row"><button type="button" class="bk-btn" onclick="window.BKLive.runGo(-1)" ${run.i ? "" : "disabled"}>${tr("‹ הקודם", "‹ Previous")}</button>
        <button type="button" class="bk-btn ${seen || (id && !a.n && sentAt) ? "pri" : ""} bk-big" style="flex:2" onclick="window.BKLive.runGo(1)">${tr("הבא — להרדים ולהעיר את הבא ›", "Next — back to sleep, wake the next ›")}</button></div>
    </section>`;
  }
  // Decisions that are the storyteller's to make (BKRules.decide): ready options + "custom" to the relevant players.
  function decisionsHTML(p, act) {
    const R = window.BKRules; if (!R) return "";
    const ctx = Object.assign(rulesCtx(), { poisoned: poisonedTonight() });
    const all = R.decide(p, act, ctx), list = ST.manual ? all : all.filter(d => d.options.some(o => (o.effects || []).length) || !d.options.length && false);
    ST.dec[p.seat] = list;
    if (!list.length && !ST.manual) return "";
    const rel = [p.seat].concat(act.targets || []).filter((x, i, a) => a.indexOf(x) === i);
    const done = ST.decDone[p.seat + ":" + act.at] || {};
    return `<li class="bk-dec-wrap">${list.map((d, i) => `<div class="bk-dec${done[i] != null ? " done" : ""}"><b>⚖️ ${esc(d.title)}</b><p>${esc(d.text)}</p>
        ${d.options.length ? `<div class="bk-dec-opts">${d.options.map((o, j) => `<button type="button" class="bk-btn sm ${o.truth === true ? "t" : o.truth === false ? "f" : ""}${done[i] === j ? " on" : ""}" onclick="window.BKLive.decide(${p.seat}, ${i}, ${j}, ${act.at})">${o.truth === true ? "✓ " : o.truth === false ? "✗ " : ""}${esc(o.label)}</button>`).join("")}</div>` : ""}</div>`).join("")}
      <details class="bk-dec bk-custom"><summary>${tr("✎ החלטה משלך — הודעה לשחקנים הרלוונטיים", "✎ Your own call — message the relevant players")}</summary>
        ${recipientsHTML("c" + p.seat, rel)}
        <textarea id="bkCustom-${p.seat}" rows="2" placeholder="${tr("מה לשלוח…", "What to send…")}"></textarea>
        <button type="button" class="bk-btn sm pri" onclick="window.BKLive.sendCustom('c${p.seat}', 'bkCustom-${p.seat}')">${tr("שלח לנבחרים", "Send to the chosen")}</button></details></li>`;
  }
  // who the Poisoner / Pukka poisoned tonight (from the choices so far) — for "is this player's ability working?"
  function poisonedTonight() {
    const acts = actsTonight(), out = [];
    for (const [seat, t] of Object.entries(acts)) { const q = players().find(x => x.seat === +seat); if (q && ["poisoner", "pukka"].includes(q.role.id)) out.push(...t); }
    return out.concat(ST.poisonExtra || []);
  }
  // pick players to send to (chips); default = the given seats
  function recipientsHTML(id, def) {
    if (!ST.rcpt[id]) ST.rcpt[id] = new Set(def || []);
    const sel = ST.rcpt[id];
    return `<div class="bk-rcpt">${players().map(q => `<button type="button" class="${sel.has(q.seat) ? "on" : ""}" onclick="window.BKLive.toggleRcpt('${id}', ${q.seat})">${q.seat}. ${esc(String(q.name).split(" / ")[0])}</button>`).join("")}</div>`;
  }
  function toggleRcpt(id, seat) { const s0 = ST.rcpt[id] || (ST.rcpt[id] = new Set()); s0.has(seat) ? s0.delete(seat) : s0.add(seat); render(); }
  async function sendCustom(id, taId) {
    const ta = document.getElementById(taId), text = ta && ta.value.trim(), to = [...(ST.rcpt[id] || [])]; if (!text || !to.length) return;
    const st = ST.game || {}, label = tr("הודעה · ", "Message · ") + phaseName(st, he());
    await C().pushInfos(ST.gid, to.map(seat => ({ key: key(seat), text, label })).filter(x => x.key));
    ta.value = ""; toast(tr(`✓ נשלח ל־${to.length}`, `✓ Sent to ${to.length}`));
  }
  // apply a decision option: send its messages and change the game (roles, deaths, drunk/poisoned)
  async function decideOpt(seat, i, j, at) {
    const d = (ST.dec[seat] || [])[i], o = d && d.options[j]; if (!o) return;
    const st = ST.game || {}, label = phaseName(st, he());
    if (o.msgs && o.msgs.length) await C().pushInfos(ST.gid, o.msgs.map(m => ({ key: key(m.seat), text: m.text, label })).filter(x => x.key));
    for (const e of o.effects || []) await applyEffect(e);
    const k = seat + ":" + at; ST.decDone[k] = Object.assign({}, ST.decDone[k], { [i]: j }); render();
  }
  async function applyEffect(e) {
    const p = players().find(x => x.seat === e.seat); if (!p) return;
    const k = key(p.seat);   // read before the deal changes
    if (e.kind === "role") {
      const r = B().getRole(e.role); if (!r) return;
      if (e.keepTrue) p.thinks = r.id;                     // the Philosopher keeps being the Philosopher, with that ability
      else { p.role = r; p.thinks = null; p.alignment = ["minion", "demon"].includes(r.type) ? "evil" : "good"; }
      B().saveLive && B().saveLive();   // the saved game follows the change (so it is still "this game")
      await C().setRole(ST.gid, k, r, ["minion", "demon"].includes(((e.keepTrue ? p.role : r) || {}).type) ? "evil" : "good");
      B().renderBoardView && B().renderBoardView();
    }
    if (e.kind === "kill") { ST.pendingKills = (ST.pendingKills || []).concat(p.seat); }
    if (e.kind === "drunk") { p.isDrunk = true; B().saveLive && B().saveLive(); }
    if (e.kind === "poison") { ST.poisonExtra = (ST.poisonExtra || []).concat(p.seat); }
  }

  async function runWake() {
    const st = ST.game || {}, run = runState(st), first = (st.day || 1) === 1, woke = wokeList(st), p = woke[run.i]; if (!p) return;
    const a = window.BKRules.action(p, first, he() ? "he" : "en"), id = "w" + Date.now();
    run.woke[p.seat] = id; (run.wakeA = run.wakeA || {})[p.seat] = a; render();
    await C().wake(ST.gid, key(p.seat), { id, n: a.n || 0, r: a.r || 0, kinds: a.kinds || null, self: !!a.self, dead: !!a.dead, once: !!a.once, text: a.text, night: st.day || 1 });
  }
  async function runSend() {
    const st = ST.game || {}, run = runState(st), woke = wokeList(st), p = woke[run.i]; if (!p) return;
    const ta = document.getElementById("bkNight-" + p.seat), text = ta ? ta.value.trim() : ""; if (!text) return;
    const at = Date.now(); run.sent[p.seat] = at - 1;
    await C().pushInfos(ST.gid, [{ key: key(p.seat), text, label: phaseName(st, he()) }]);
    p.firstNightInfo = text; render();
  }
  async function runGo(step) {
    const st = ST.game || {}, run = runState(st), woke = wokeList(st), p = woke[run.i];
    if (p && step > 0 && run.woke[p.seat]) C().wake(ST.gid, key(p.seat), null).catch(() => {});   // back to sleep
    run.i = Math.max(0, Math.min(woke.length, run.i + step)); render();
  }

  // Night composer: one text per player (night 1 starts from the dealt first-night info), then send all at once.
  function nightDefault(p) {
    const st = ST.game || {};
    if (p.isAlive === false) return tr(`אתה מת. אתה עדיין משתתף בדיון ויש לך הצבעה אחת אחרונה.`, `You are dead. You still talk, and you have one last vote.`);
    if ((st.day || 1) === 1) return p.firstNightInfo || "";
    return "";
  }
  // ✨ Write tonight's info for everyone by the rules, so the storyteller only checks and sends (and one day: no storyteller).
  //  night 1 = the dealt info (already false for the Drunk); later nights = the true answer from BKRules.laterNight, or a
  //  false one for a drunk / poisoned player; choices made on the phones tonight (Fortune Teller, Seamstress, Ravenkeeper…)
  //  are answered from what they picked.
  function autoText(p) {
    const st = ST.game || {}, R = window.BKRules, first = (st.day || 1) === 1;
    if (p.isAlive === false && !(ST.deaths && ST.deaths[p.seat] && p.role.id === "ravenkeeper")) return nightDefault(p);
    if (!R) return first ? p.firstNightInfo || "" : "";
    const bad = p.isDrunk || poisonedTonight().includes(p.seat), t = actsTonight()[p.seat] || [], tg = t.map(x => players().find(q => q.seat === x)).filter(Boolean);
    const id0 = (p.thinks && B().getRole(p.thinks) ? p.thinks : p.role.id);
    const A0 = R.action(p, first, he() ? "he" : "en");
    if (!first && (A0.n || A0.r) && !tg.length && ["fortune_teller", "seamstress", "ravenkeeper", "dreamer", "chambermaid"].includes(id0)) return "";   // waits for their choice
    // night 1: the dealt info, except for those who chose tonight (Fortune Teller, Seamstress…) — answered from their picks
    if (first && !(tg.length && ["fortune_teller", "seamstress"].includes(id0))) return p.firstNightInfo || "";
    const evil = q => q.alignment === "evil", demon = q => q.role && q.role.type === "demon", rh = (B()._state.rules || {}).redHerring;
    const id = (p.thinks && B().getRole(p.thinks) ? p.thinks : p.role.id);
    let truth = null;
    if (id === "fortune_teller" && tg.length) truth = tg.some(q => demon(q) || q.seat === rh) ? 0 : 1;   // index of yes / no
    if (id === "seamstress" && tg.length === 2) truth = evil(tg[0]) === evil(tg[1]) ? 0 : 1;
    if (id === "ravenkeeper" && tg.length) { const q = tg[0], r = bad ? ((rulesCtx().pool || []).filter(x => x.id !== q.role.id)[0] || q.role) : q.role;
      return tr(`${String(q.name).split(" / ")[0]} הוא ${r.name_he}.`, `${String(q.name).split(" / ")[0]} is the ${r.name_en}.`); }
    const list = R.laterNight(p, rulesCtx());
    if (id === "undertaker" && !rulesCtx().executedToday) return tr("היום אף אחד לא הוצא להורג.", "Nobody was executed today.");
    if (!list.length) return "";
    if (truth != null) { const i = bad ? 1 - truth : truth; return (list[i] || list[0]).text; }
    const want = p.isDrunk ? true : !bad;   // laterNight already flipped "truth" for the Drunk
    const pick = list.filter(x => x.truth === want);
    return (pick[Math.floor(Math.random() * pick.length)] || list.find(x => x.truth == null) || list[0]).text;
  }
  function autoNight(send) {
    let n = 0;
    for (const p of players()) { const t = autoText(p); if (t) { ST.draft[p.seat] = t; n++; } }
    ST.autoOpen = true;
    ST.msg = tr(`✨ נכתב מידע ל־${n} שחקנים לפי החוקים — בדוק ושלח.`, `✨ Wrote info for ${n} players by the rules — check and send.`);
    render();
    if (send) setTimeout(() => sendNight(false), 0);
  }
  // =============================================================================================
  // 🌙 The night for everyone at once: every player whose character chooses tonight gets the choice on their phone
  // (players / characters / skip), all at the same time. When everyone has answered, each player's info is written by
  // the rules from those choices (poisoned → false, Fortune Teller from their picks…) and sent to every phone.
  // Once-per-game abilities are marked "Spent" after use and are not offered again.
  // =============================================================================================
  const shownId = p => (window.BKRules ? window.BKRules.shown(p).id : p.role.id);
  const isSpent = seat => !!((ST.players[seat] && ST.players[seat].spent) || (ST.spentLocal || {})[seat]);
  async function markSpent(seat) {
    if (isSpent(seat)) return; (ST.spentLocal = ST.spentLocal || {})[seat] = true;
    try { await C().setFields(ST.gid, key(seat), { spent: true }); } catch (e) { console.warn(e); }
  }
  function bcastChoosers(st) {
    const R = window.BKRules, first = (st.day || 1) === 1, out = [];
    for (const p of wokeList(st)) {
      if (shownId(p) === "ravenkeeper") continue;   // wakes only if they die tonight (see the night runner)
      const a = R.action(p, first, he() ? "he" : "en");
      if (!(a.n || a.r)) continue;
      if (a.once && isSpent(p.seat)) continue;
      out.push({ p, a });
    }
    return out;
  }
  async function broadcastNight() {
    const st = ST.game || {}, run = runState(st), list = bcastChoosers(st);
    ST.bcast = { night: st.day, ids: {}, done: false };
    for (const { p, a } of list) {
      const id = "w" + Date.now() + "_" + p.seat;
      run.woke[p.seat] = id; (run.wakeA = run.wakeA || {})[p.seat] = a; ST.bcast.ids[p.seat] = id;
    }
    render();
    await Promise.all(list.map(({ p, a }) => C().wake(ST.gid, key(p.seat), { id: ST.bcast.ids[p.seat], n: a.n || 0, r: a.r || 0, kinds: a.kinds || null, self: !!a.self, dead: !!a.dead, once: !!a.once, text: a.text, night: st.day || 1 }).catch(e => console.warn(e))));
    toast(list.length ? tr(`🌙 נשלח ל־${list.length} שחקנים לבחור. כשכולם יבחרו — המידע יישלח לכולם.`, `🌙 ${list.length} players were asked to choose. When all have chosen, everyone gets their info.`) : tr("אף אחד לא בוחר הלילה — שולח מידע.", "Nobody chooses tonight — sending info."));
    checkBcast();
  }
  function bcastWaiting() {
    const b = ST.bcast; if (!b) return [];
    return Object.entries(b.ids).filter(([seat, id]) => { const a = ST.players[seat] && ST.players[seat].act; return !(a && a.wake === id); }).map(([seat]) => +seat);
  }
  // all answered → write and send everyone's info, put the choosers back to sleep
  async function checkBcast(force) {
    const b = ST.bcast, st = ST.game || {}; if (!b || b.done || b.night !== st.day || st.phase !== "night") return;
    if (!force && bcastWaiting().length) return;
    b.done = true;
    autoNight(false);
    await sendNight(false).catch(e => console.warn(e));
    await Promise.all(Object.keys(b.ids).map(seat => C().wake(ST.gid, key(+seat), null).catch(() => {})));
    toast(tr("✓ כולם בחרו — המידע של הלילה נשלח לכל השחקנים.", "✓ Everyone chose — tonight's info was sent to every player."));
  }
  function bcastHTML(st) {
    const b = ST.bcast && ST.bcast.night === st.day ? ST.bcast : null;
    if (!b) return `<div class="bk-lp-sec bk-bcast"><button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.broadcastNight()">🌙 ${tr("שלח את הלילה לכולם", "Send the night to everyone")}</button>
      <small class="bk-hint">${tr("כל מי שבוחר הלילה (שד, מרעיל, נזיר, פרקליט השטן, מגדת עתידות…) מקבל את הבחירה בטלפון — כפתורים, שחקנים או תפקידים — כולם בבת אחת. כשכולם בחרו, המידע של כל שחקן נכתב לפי החוקים ונשלח אוטומטית. יכולת חד־פעמית שנוצלה מסומנת Spent.", "Everyone who chooses tonight (Demon, Poisoner, Monk, Devil's Advocate, Fortune Teller…) gets the choice on their phone — buttons, players or characters — all at once. When all have chosen, each player's info is written by the rules and sent automatically. A used once-per-game ability is marked Spent.")}</small></div>`;
    const waiting = bcastWaiting(), rows = Object.entries(b.ids).map(([seat, id]) => { const p = players().find(x => x.seat === +seat); if (!p) return "";
      const a = ST.players[seat] && ST.players[seat].act, ok = a && a.wake === id, r = p.role;
      const what = ok ? ((a.targets || []).map(nameOfSeat).concat((a.roles || []).map(rid => { const x = B().getRole(rid); return x ? (he() ? x.name_he : x.name_en) : rid; })).join(", ") || tr("דילג", "skipped")) : tr("ממתין…", "waiting…");
      return `<li class="${ok ? "ok" : "now"}"><b>${esc(String(p.name).split(" / ")[0])}</b> <small>${r.icon || ""} ${esc(he() ? r.name_he : r.name_en)}</small> → ${esc(what)}</li>${ok ? decisionsHTML(p, a) : ""}`; }).join("");
    return `<section class="bk-lp-sec bk-bcast"><h4>🌙 ${tr("הלילה נשלח לכולם", "The night was sent to everyone")}</h4>
      <ol class="bk-run-steps">${rows || `<li class="ok">${tr("אף אחד לא בוחר הלילה.", "Nobody chooses tonight.")}</li>`}</ol>
      ${b.done ? `<p class="bk-hint">✓ ${tr("המידע נשלח לכולם.", "Info sent to everyone.")}</p>` : `<button type="button" class="bk-btn bk-wide" onclick="window.BKLive.checkBcast(true)">${waiting.length ? tr(`שלח מידע עכשיו (בלי לחכות ל־${waiting.length})`, `Send info now (without waiting for ${waiting.length})`) : tr("שלח מידע", "Send info")}</button>`}
      <button type="button" class="bk-btn bk-wide" onclick="window.BKLive.broadcastNight()">↺ ${tr("שלח שוב את הבחירות", "Send the choices again")}</button></section>`;
  }

  // ---- what the players do from their phones by day: accuse someone, use a day ability; and the automatic results ----
  const DAY = {
    slayer: { once: true, n: 1, when: ["day", "nominate"], notDuringVote: true, he: "פעם במשחק: בחר שחקן בפומבי — אם הוא השד, הוא מת.", en: "Once per game: publicly choose a player — if they are the Demon, they die." },
    psychopath: { n: 1, when: ["day"], daily: true, he: "כל יום, לפני ההאשמות: בחר שחקן בפומבי — הוא מת.", en: "Each day, before nominations: publicly choose a player — they die." },
    klutz: { once: true, n: 1, deadOnly: true, when: ["dawn", "day", "nominate"], he: "מתת: בחר שחקן חי בפומבי — אם הוא רע, הצוות שלך מפסיד.", en: "You died: publicly choose a living player — if they are evil, your team loses." },
    gossip: { n: 0, when: ["day"], he: "כל יום אתה יכול להצהיר הצהרה פומבית — אם היא נכונה, מישהו ימות הלילה. (אמור אותה בקול)", en: "Each day you may make a public statement — if true, someone dies tonight. (Say it out loud)" },
  };
  const dayAbilityOk = (cfg, st) => !!st && (cfg.when || ["day"]).includes(st.phase) && !(cfg.notDuringVote && st.nom && st.nom.open);
  const doneKey = () => "bk_acts_" + ST.gid;
  function doneActs() { try { return JSON.parse(localStorage.getItem(doneKey()) || "{}"); } catch (e) { return {}; } }
  function processActs() {
    const st = ST.game; if (!st || !ST.gid) return;
    const n = st.nom;
    if (n && n.open) {
      const da = ST.players[n.by] && ST.players[n.by].defense, dd = ST.players[n.on] && ST.players[n.on].defense, patch = {};
      if (da && da.nom === n.id && da.text !== n.accText) patch["nom.accText"] = da.text;
      if (dd && dd.nom === n.id && dd.text !== n.defText) patch["nom.defText"] = dd.text;
      if (Object.keys(patch).length) C().setState(ST.gid, patch).catch(() => {});
    }
    const done = doneActs(); let changed = false;
    for (const [seat, doc] of Object.entries(ST.players)) {
      const a = doc && doc.act; if (!a) continue;
      // night: a once-per-game ability that was used (not skipped) is now spent
      const wa = ST.run && ST.run.wakeA && ST.run.wakeA[seat];
      if (a.wake && wa && wa.once && ST.run.woke[seat] === a.wake && ((a.targets || []).length || (a.roles || []).length)) markSpent(+seat);
      if (!a.kind || a.wake) continue;
      if ((done[seat] || 0) >= a.at) continue;
      done[seat] = a.at; changed = true;
      handleDayAct(+seat, a).catch(e => console.warn(e));
    }
    if (changed) try { localStorage.setItem(doneKey(), JSON.stringify(done)); } catch (e) {}
    checkBcast();
  }
  const tell = (seat, text) => { const k = key(seat); return k ? C().pushInfos(ST.gid, [{ key: k, text, label: phaseName(ST.game || {}, he()) }]) : Promise.resolve(); };
  async function killSeat(seat, text) {
    const st = ST.game || {}, seats = (st.seats || []).map(x => Object.assign({}, x)), s = seats.find(x => x.seat === seat);
    if (s) s.alive = false; mirrorLocal(seats);
    await C().setState(ST.gid, { seats, notice: notice(text) }); checkWin(seats);
  }
  async function handleDayAct(seat, a) {
    const st = ST.game || {}, p = players().find(x => x.seat === seat); if (!p) return;
    const seats = st.seats || [], me = seats.find(x => x.seat === seat), t = (a.targets || [])[0], tp = players().find(x => x.seat === t), ts = seats.find(x => x.seat === t);
    const N = q => String(q && q.name || "?").split(" / ")[0];
    if (a.kind === "nom") {
      const today = st.today || { by: {}, on: {} };
      const why = st.phase !== "nominate" ? tr("אפשר להאשים רק בערב, אחרי הדיון.", "You can only nominate in the evening, after the talk.")
        : st.nom && st.nom.open ? tr("יש כבר האשמה פתוחה — חכה שתיסגר.", "An accusation is already open — wait for it to close.")
        : !nomWindowOpen(st) ? tr("הזמן להאשמות נגמר להיום.", "Time for nominations is over today.")
        : !(me && me.alive) ? tr("רק שחקנים חיים מאשימים.", "Only living players nominate.")
        : today.by[seat] ? tr("כבר האשמת היום.", "You already nominated today.")
        : !ts ? "?" : today.on[t] ? tr(`${N(ts)} כבר הואשם היום.`, `${N(ts)} was already nominated today.`) : "";
      if (why) { await tell(seat, "⚖️ " + why); return; }
      await openNomFor(seat, t);
      return;
    }
    if (a.kind !== "day") return;
    const id = shownId(p), cfg = DAY[id]; if (!cfg) return;
    // only when the rules allow it (e.g. the Psychopath: by day, before nominations; nobody during a vote or at night)
    if (!dayAbilityOk(cfg, st)) { await tell(seat, tr("אי אפשר להשתמש ביכולת עכשיו — רק בזמן שהחוקים מאפשרים.", "You can't use your ability now — only when the rules allow it.")); return; }
    if (cfg.daily) { const k = "used_" + seat + "_" + (st.day || 1); if (ST[k]) { await tell(seat, tr("כבר השתמשת ביכולת היום.", "You already used your ability today.")); return; } ST[k] = 1; }
    const bad = p.isDrunk || (ST.dayPoison || []).includes(seat) || p.thinks;   // drunk / poisoned (or only thinks they are it): no effect
    if (cfg.once) { if (isSpent(seat)) { await tell(seat, tr("כבר השתמשת ביכולת הזו (Spent).", "You already used this ability (Spent).")); return; } await markSpent(seat); }
    if (id === "slayer" && tp) {
      if (!bad && tp.role.type === "demon" && ts && ts.alive) await killSeat(t, tr(`🏹 ${N(p)} (קוטל השדים) ירה ב־${N(tp)} — ${N(tp)} מת!`, `🏹 ${N(p)} (Slayer) shot ${N(tp)} — ${N(tp)} dies!`));
      else await C().setState(ST.gid, { notice: notice(tr(`🏹 ${N(p)} טוען שהוא קוטל השדים וירה ב־${N(tp)}… כלום לא קרה.`, `🏹 ${N(p)} claims Slayer and shoots ${N(tp)}… nothing happens.`)) });
    }
    if (id === "psychopath" && tp) {
      if (!bad && ts && ts.alive) await killSeat(t, tr(`🪓 הפסיכופת בחר ב־${N(tp)} — ${N(tp)} מת.`, `🪓 The Psychopath chose ${N(tp)} — ${N(tp)} dies.`));
      else await tell(seat, tr("היכולת לא עבדה הפעם.", "Your ability didn't work this time."));
    }
    if (id === "klutz" && tp) {
      if (!bad && tp.alignment === "evil") { ST.win = { team: "evil", why: tr(`${N(p)} (המגושם) בחר ב־${N(tp)}, שהוא רע.`, `${N(p)} (Klutz) chose ${N(tp)}, who is evil.`) }; render(); await declareWin("evil"); }
      else await C().setState(ST.gid, { notice: notice(tr(`${N(p)} (המגושם) בחר ב־${N(tp)} — הוא טוב. המשחק ממשיך.`, `${N(p)} (Klutz) chose ${N(tp)} — they are good. The game goes on.`)) });
    }
  }

  async function sendNight(toWhatsapp) {
    const st = ST.game || {}, label = phaseName(st, he());
    const items = [];
    for (const p of players()) {
      const ta = document.getElementById("bkAll-" + p.seat); const text = (ta ? ta.value : (ST.draft[p.seat] || "")).trim();
      if (!text) continue;
      const k = key(p.seat); if (!k) continue;
      items.push({ key: k, text, label }); p.firstNightInfo = text;
    }
    if (!items.length) { alert(tr("אין מה לשלוח — כתוב מידע לפחות לשחקן אחד.", "Nothing to send — write info for at least one player.")); return; }
    await C().pushInfos(ST.gid, items);
    ST.draft = {}; ST.sentNight = st.day;
    ST.msg = tr(`✓ נשלח ל־${items.length} שחקנים · ${label}`, `✓ Sent to ${items.length} players · ${label}`); render();
    if (toWhatsapp && B().sendAllWhatsapp) B().sendAllWhatsapp({ night: label, items: items.map(i => ({ seat: players().find(p => key(p.seat) === i.key).seat, text: i.text })) });
  }

  // Any time during the game: see what each player's card says now, change it and send it to that player (or to all
  // the changed ones at once). It lands on their card right away, and the old text stays in their history.
  function infoEditorHTML(st) {
    const rows = players().slice().sort((a, b) => a.seat - b.seat).map(p => {
      const cur = (ST.players[p.seat] && ST.players[p.seat].info) || "", r = p.role || {};
      const v = ST.edit[p.seat] != null ? ST.edit[p.seat] : cur, changed = ST.edit[p.seat] != null && ST.edit[p.seat] !== cur;
      return `<div class="bk-ie-row${changed ? " changed" : ""}${p.isAlive === false ? " dead" : ""}">
        <span><b>${p.seat} · ${esc(p.name)}</b> <small>${r.icon || ""} ${esc(he() ? r.name_he : r.name_en)}${p.isAlive === false ? " · " + tr("מת", "dead") : ""}</small></span>
        <textarea id="bkIe-${p.seat}" rows="2" oninput="window.BKLive.editInfo(${p.seat}, this.value)" placeholder="${tr("מה כתוב בכרטיס שלו…", "What their card says…")}">${esc(v)}</textarea>
        ${chipsFor(p, "ie")}
        ${(ST.players[p.seat] && (ST.players[p.seat].log || []).length) ? `<details class="bk-ie-log"><summary>📜 ${tr("כל מה שקיבל", "Everything they were told")} (${ST.players[p.seat].log.length})</summary>${ST.players[p.seat].log.slice().reverse().map(x => `<div><small>${esc(x.label || "")}</small> ${esc(x.text)}</div>`).join("")}</details>` : ""}
        <button type="button" class="bk-btn sm${changed ? " pri" : ""}" onclick="window.BKLive.sendInfo([${p.seat}])">${tr("שלח לכרטיס שלו", "Send to their card")}</button></div>`;
    }).join("");
    const n = Object.keys(ST.edit).filter(k => ST.edit[k] !== ((ST.players[k] && ST.players[k].info) || "")).length;
    return `<details class="bk-lp-sec bk-ie" ${ST.ieOpen ? "open" : ""} ontoggle="window.BKLive.ieToggle(this.open)">
      <summary><h4>${tr("עריכת מידע ורמזים לשחקנים", "Edit players' info & hints")}</h4><small>${tr("ישר לכרטיס שלהם", "straight to their card")}</small></summary>
      <p class="bk-hint">${tr("שנה את מה שכתוב לשחקן (רמז חדש, מידע שגוי בכוונה, תיקון) ושלח. זה מופיע מיד בכרטיס שלו עם התראה, והקודם נשמר אצלו בהיסטוריה.", "Change what a player is told (a new hint, deliberately false info, a fix) and send it. It shows on their card at once with an alert; the old text stays in their history.")}</p>
      <div class="bk-ie-list">${rows}</div>
      ${n ? `<button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.sendInfo()">${tr(`שלח את כל השינויים (${n})`, `Send all changes (${n})`)}</button>` : ""}
      <div class="bk-hint">${esc(ST.ieMsg || "")}</div>
    </details>`;
  }
  async function sendInfo(seats) {
    const st = ST.game || {}, label = tr("עדכון · ", "Update · ") + phaseName(st, he());
    const list = (seats || Object.keys(ST.edit).map(Number)).filter(seat => ST.edit[seat] != null && ST.edit[seat].trim() && ST.edit[seat] !== ((ST.players[seat] && ST.players[seat].info) || ""));
    const items = list.map(seat => ({ key: key(seat), text: ST.edit[seat].trim(), label })).filter(i => i.key);
    if (!items.length) return;
    await C().pushInfos(ST.gid, items);
    list.forEach(seat => { const p = players().find(x => x.seat === seat); if (p) p.firstNightInfo = ST.edit[seat].trim(); delete ST.edit[seat]; });
    ST.ieMsg = tr(`✓ נשלח ל־${items.length} שחקנים`, `✓ Sent to ${items.length} players`); render();
  }

  // seats in voting order: clockwise starting after the accused, the accused last
  function clockwise(seats, on) { const i = seats.findIndex(s => s.seat === on); return i < 0 ? seats : seats.slice(i + 1).concat(seats.slice(0, i + 1)); }
  function blockHTML(st) {
    const b = (st.today || {}).block;
    if (!b) return `<p class="bk-hint">${tr("אף אחד לא על הגרדום כרגע.", "Nobody is on the block yet.")}</p>`;
    return b.seat ? `<div class="bk-block">⚖️ ${tr("על הגרדום:", "On the block:")} <b>${esc(b.name)}</b> · ${b.votes} ${tr("קולות", "votes")} <small>${tr("(מי שיקבל יותר יחליף אותו; שוויון = אף אחד)", "(more votes replaces them; a tie = nobody)")}</small></div>`
                  : `<div class="bk-block">⚖️ ${tr(`תיקו על ${b.votes} קולות — אף אחד לא על הגרדום. האשמה הבאה צריכה יותר מ־${b.votes}.`, `Tie at ${b.votes} — nobody on the block. The next one needs more than ${b.votes}.`)}</div>`;
  }
  function endDayHTML(st) {
    const b = (st.today || {}).block;
    return b && b.seat ? `<div class="bk-row"><button type="button" class="bk-btn pri bk-big" style="flex:2" onclick="window.BKLive.endDay(true)">${tr(`סיום היום — ${esc(b.name)} מוצא להורג`, `End the day — execute ${esc(b.name)}`)}</button>
        <button type="button" class="bk-btn" onclick="window.BKLive.endDay(false)">${tr("בלי הוצאה להורג", "No execution")}</button></div>`
      : `<button type="button" class="bk-btn bk-wide" onclick="window.BKLive.endDay(false)">${tr("סיום היום בלי הוצאה להורג — ללילה ›", "End the day, no execution — to the night ›")}</button>`;
  }
  function winHTML() {
    const w = ST.win; if (!w) return "";
    return `<div class="bk-win ${w.team || "info"}"><b>${w.team === "good" ? tr("🏆 נראה שהטובים ניצחו", "🏆 Looks like good wins") : w.team === "evil" ? tr("😈 נראה שהרעים ניצחו", "😈 Looks like evil wins") : tr("שים לב", "Note")}</b><span>${esc(w.why)}</span>
      ${w.team ? `<div class="bk-row"><button type="button" class="bk-btn pri" onclick="window.BKLive.declareWin('${w.team}')">${tr("הכרז וסיים את המשחק", "Announce and end the game")}</button><button type="button" class="bk-btn" onclick="window.BKLive.dismissWin()">${tr("המשחק ממשיך", "Keep playing")}</button></div>` : `<button type="button" class="bk-btn" onclick="window.BKLive.dismissWin()">${tr("הבנתי", "OK")}</button>`}</div>`;
  }

  // The steps bar at the top of the panel.
  function stepsHTML(st) {
    const steps = [["lobby", tr("הצטרפות", "Join")], ["night", tr("לילה", "Night")], ["dawn", tr("בוקר", "Dawn")], ["day", tr("יום · דיון", "Day · talk")], ["nominate", tr("ערב · הצבעות", "Evening · votes")]];
    const at = steps.findIndex(x => x[0] === st.phase);
    return `<ol class="bk-steps">${steps.map(([k, n], i) => `<li class="${i < at ? "done" : i === at ? "on" : ""}"><button type="button" onclick="window.BKLive.setPhase('${k}')" title="${tr("קפוץ לשלב הזה", "Jump to this step")}">${n}</button></li>`).join("")}</ol>`;
  }

  function render() {
    const box = document.getElementById("bkLivePanel"); if (!box) return;
    const a = document.activeElement, keep = a && box.contains(a) && a.id ? { id: a.id, s: a.selectionStart, e: a.selectionEnd } : null;
    draw(box);
    if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
  }
  function draw(box) {
    const g = B() && B().liveGame && B().liveGame();
    if (!g) {
      box.innerHTML = `<div class="bk-lp bk-lp-empty"><b>${tr("הפעלת משחק", "Run the game")}</b>
        <p>${tr("אחרי שמחלקים תפקידים, כל שחקן מקבל דף פרטי בטלפון — ומכאן מנהלים את כל המשחק: לילה, בוקר, האשמות והצבעות, וכולם מקבלים הכול בזמן אמת.", "After dealing, every player gets a private page on their phone — and you run the whole game from here: night, dawn, accusations and votes, live on every phone.")}</p>
        <button type="button" class="bk-btn pri bk-wide" onclick="window.BKLive.startFlow()">${tr("הפעל משחק ושלח לכולם", "Start the game and send to everyone")}</button></div>`;
      return;
    }
    const st = ST.game; if (!st) { box.innerHTML = `<div class="bk-lp">${tr("מתחבר…", "Connecting…")}</div>`; return; }
    const seats = st.seats || [], alive = seats.filter(s => s.alive), nom = st.nom, t = tally();
    const joined = Object.keys(ST.taken).length, total = players().length, all = joined >= total;
    const opt = (list, sel) => list.map(s => `<option value="${s.seat}"${sel === s.seat ? " selected" : ""}>${s.seat} · ${esc(s.name)}</option>`).join("");
    let body = "";

    if (st.phase === "lobby") body = `<section class="bk-lp-sec">
        <h4>${tr("שלב 1 — שליחה לכולם", "Step 1 — send to everyone")}</h4>
        <div class="bk-join ${all ? "all" : ""}"><b>${joined} / ${total}</b> ${tr("הצטרפו", "joined")}${all ? ` · ${tr("כולם בפנים!", "everyone is in!")}` : ""}</div>
        <div class="bk-group-list">${players().map(p => `<span class="${ST.taken[p.seat] ? "on" : ""}">${p.seat}. ${esc(p.name)}${ST.taken[p.seat] ? " ✓" : ""}</span>`).join("")}</div>
        <button type="button" class="bk-btn bk-wide" onclick="window.BKLive.groupSend()">${tr("קישור לקבוצה / ברקוד", "Group link / QR code")}</button>
        ${devMode() ? `<button type="button" class="bk-btn bk-wide" onclick="window.open(window.BKLive.devAllUrl(), '_blank')">🧪 ${tr("פתח את כל השחקנים בטאב אחד ומחובר", "Open all players in one tab, connected")}</button>` : ""}
        <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.setPhase('night')">${all ? tr("התחל — לילה 1", "Start — Night 1") : tr("התחל בכל זאת (בדיקה) — לילה 1", "Start anyway (test) — Night 1")}</button>
      </section>`;

    if (st.phase === "night") body = `<div class="bk-row bk-manual"><button type="button" class="bk-btn sm${ST.manual ? " pri" : ""}" onclick="window.BKLive.toggleManual()">✋ ${ST.manual ? tr("בחירה ידנית פעילה — לחץ לחזור לאוטומטי", "Choosing by hand — tap for automatic") : tr("בחירה ידנית של אמת / שקר", "Choose true / false by hand")}</button>
        <small class="bk-hint">${ST.manual ? tr("✓ = אמת, ✗ = שקר. אתה מחליט מה כל שחקן מקבל.", "✓ = true, ✗ = false. You decide what each player gets.") : tr("המידע נכתב לפי החוקים (אמת, ושקר לשיכור / מורעל) — לא צריך לבחור.", "Info is written by the rules (true; false for drunk / poisoned) — no need to choose.")}</small></div>
      ${bcastHTML(st)}<section class="bk-lp-sec"><h4>${tr("או: הלילה, שחקן אחרי שחקן", "Or: the night, player by player")} — ${esc(phaseName(st, he()))}</h4>
        ${runnerHTML(st)}
        <button type="button" class="bk-btn ${(ST.run && ST.run.i >= Object.keys(ST.wakeNo || {}).length) || (ST.bcast && ST.bcast.done) ? "pri" : ""} bk-wide bk-big" onclick="window.BKLive.endNightAuto()">${tr("סיום הלילה — הכרז מי מת ›", "End the night — announce who died ›")}</button>
        <button type="button" class="bk-btn bk-wide" onclick="window.BKLive.setPhase('dawn')">${tr("סיום הלילה — לבדוק קודם מי מת", "End the night — check who died first")}</button>
      </section>
      <div class="bk-lp-sec bk-auto"><button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.autoNight(false)">✨ ${tr("חולל מידע לכל השחקנים", "Write everyone's info for me")}</button>
        <button type="button" class="bk-btn bk-wide" onclick="window.BKLive.autoNight(true)">✨ ${tr("חולל ושלח ישר לכולם", "Write it and send to everyone")}</button>
        <small class="bk-hint">${tr("לפי החוקים: מידע אמיתי, ושקרי לשיכור / מורעל. בחירות מהטלפונים הלילה (מגדת עתידות, תופרת, שומר העורבים…) נענות לפי מה שבחרו.", "By the rules: true info, false for a drunk / poisoned player. Tonight's choices on the phones (Fortune Teller, Seamstress, Ravenkeeper…) are answered from what they picked.")}</small></div>
      <details class="bk-lp-sec bk-ie"${ST.autoOpen ? " open" : ""} ontoggle="window.BKLive.autoToggle && window.BKLive.autoToggle(this.open)"><summary><h4>${tr("או: מידע לכולם בבת אחת", "Or: info for everyone at once")}</h4></summary>
        <p class="bk-hint">${tr("כתוב לכל שחקן מה הוא לומד הלילה (ריק = לא נשלח). \"שלח לכולם\" שולח לכל הטלפונים בבת אחת, והמידע הקודם נשמר אצלם בהיסטוריה.", "Write what each player learns tonight (empty = not sent). \"Send to all\" sends to every phone at once; older info stays in their history.")}</p>
        <p class="bk-hint">${tr("הסדר הוא סדר ההתעוררות הרשמי (מספר ליד מי שמתעורר). ✓ = מידע אמיתי, ✗ = שקרי (לשיכור או מורעל).", "Rows follow the official wake order (number = wakes). ✓ = true info, ✗ = false (for a drunk or poisoned player).")}</p>
        <div class="bk-night">${orderedForNight(st).map(p => {
          const r = p.role || {}, th = p.thinks && B().getRole(p.thinks), v = ST.draft[p.seat] != null ? ST.draft[p.seat] : nightDefault(p), w = ST.wakeNo && ST.wakeNo[p.seat];
          return `<div class="bk-night-row${p.isAlive === false ? " dead" : ""}${w ? " wakes" : ""}"><span>${w ? `<em class="bk-wake">${w}</em>` : ""}<b>${p.seat} · ${esc(p.name)}</b> <small>${r.icon || ""} ${esc(he() ? r.name_he : r.name_en)}${th ? " → " + esc(he() ? th.name_he : th.name_en) : ""}${p.isAlive === false ? " · " + tr("מת", "dead") : ""}</small></span>
            ${p.fnNote && (st.day || 1) === 1 ? `<i class="bk-st-note">👁 ${esc(p.fnNote)}</i>` : ""}
            <textarea id="bkAll-${p.seat}" rows="2" oninput="window.BKLive.draft(${p.seat}, this.value)" placeholder="${tr("מה הוא לומד הלילה…", "What they learn tonight…")}">${esc(v)}</textarea>
            ${chipsFor(p, "all")}</div>`;
        }).join("")}</div>
        <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.sendNight(false)">${tr("שלח מידע לכולם", "Send info to everyone")}</button>
        <button type="button" class="bk-btn bk-wide" onclick="window.BKLive.sendNight(true)">${tr("שלח וגם ב־WhatsApp", "Send + WhatsApp")}</button>
        <div id="bkNightMsg" class="bk-hint">${esc(ST.msg || "")}</div>
      </details>`;

    let dawnNotes = "";
    if (st.phase === "dawn" && window.BKRules) {
      if (ST.dawnFor !== st.day) { ST.dawnFor = st.day; const res = window.BKRules.resolveNight(players(), actsTonight(), he() ? "he" : "en"); ST.deaths = {}; res.deaths.forEach(x => ST.deaths[x] = true); (ST.pendingKills || []).forEach(x => ST.deaths[x] = true); ST.pendingKills = []; ST.dawnRes = res; }
      const res = ST.dawnRes || { notes: [] }, acts = actsTonight();
      dawnNotes = `<div class="bk-dawn-sum">${Object.keys(acts).length ? `<b>${tr("מה בחרו הלילה:", "Tonight's choices:")}</b><ul>${Object.entries(acts).map(([seat, t]) => { const q = players().find(x => x.seat === +seat), rr = q && q.role; return `<li>${esc(String(q ? q.name : seat).split(" / ")[0])} (${esc(rr ? (he() ? rr.name_he : rr.name_en) : "")}) → ${t.length ? t.map(nameOfSeat).join(", ") : tr("דילג", "skipped")}</li>`; }).join("")}</ul>` : ""}
        ${res.notes.length ? `<ul class="bk-dawn-notes">${res.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        <p class="bk-hint">${tr("סימנתי מראש מי כנראה מת לפי הבחירות — בדוק ושנה אם צריך (יכולות מיוחדות, שיכורים…).", "I pre-marked who probably died from the choices — check and change if needed (special abilities, drunk players…).")}</p></div>`;
    }
    if (st.phase === "dawn") body = `<section class="bk-lp-sec"><h4>${tr("מי מת הלילה?", "Who died tonight?")}</h4>${dawnNotes}
        <p class="bk-hint">${tr("סמן את מי שמת (או אף אחד) ולחץ \"הכרז\" — כולם יקבלו את ההודעה והעיירה תתעדכן.", "Mark who died (or nobody) and tap \"Announce\" — everyone is told and the town updates.")}</p>
        <div class="bk-votes">${alive.map(s => `<button type="button" class="${ST.deaths[s.seat] ? "no" : ""}" onclick="window.BKLive.toggleDeath(${s.seat})">${s.seat} ${esc(s.name)}${ST.deaths[s.seat] ? " ✝" : ""}</button>`).join("")}</div>
        <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.announceDawn()">${Object.values(ST.deaths).some(Boolean) ? tr("הכרז ועבור ליום", "Announce and start the day") : tr("אף אחד לא מת — הכרז ועבור ליום", "Nobody died — announce and start the day")}</button>
      </section>`;

    if (st.phase === "day") body = `<section class="bk-lp-sec"><h4>${esc(phaseName(st, he()))}</h4>
        <p class="bk-hint">${tr("יום = דיבורים. כשהטיימר נגמר עוברים אוטומטית לערב (האשמות והצבעות).", "Day = talking. When the timer ends the evening starts by itself (nominations & votes).")}</p>
        <div class="bk-row">${timerTag(st.dayUntil, tr("לסוף הדיון", "talk left"))}<button type="button" class="bk-btn sm" onclick="window.BKLive.addTime('day', 60)">+1 ${tr("דק׳", "min")}</button></div>
        <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.setPhase('nominate')">${tr("עבור לערב עכשיו — האשמות", "Go to the evening now — nominations")}</button>
        ${endDayHTML(st)}
      </section>`;

    if (st.phase === "nominate") body = `<section class="bk-lp-sec"><h4>${tr("האשמה", "Accusation")}</h4>
        ${nom && nom.open ? `
          <div class="bk-nom"><span>${esc(nom.byName)}</span><i>${tr("מאשים את", "accuses")}</i><b>${esc(nom.onName)}</b></div>
          ${nom.accText ? `<blockquote>⚔️ ${esc(nom.byName)}: “${esc(nom.accText)}”</blockquote>` : ""}
          ${nom.defText ? `<blockquote>🛡️ ${esc(nom.onName)}: “${esc(nom.defText)}”</blockquote>` : ""}
          ${nom.stage === "defense" ? `<p class="bk-hint">${tr("שלב הנאומים: המאשים מסביר והמואשם מתגונן (בקול או בטלפון). ההצבעה נפתחת בסוף הזמן או כשתלחץ.", "Speeches: the accuser explains, the accused defends (out loud or on the phone). The vote opens when time is up or when you tap.")}</p>
            <div class="bk-row">${timerTag(nom.defUntil, tr("לנאומים", "speeches"))}<button type="button" class="bk-btn sm" onclick="window.BKLive.addTime('def', 30)">+30 ${tr("שנ׳", "s")}</button></div>
            <button type="button" class="bk-btn pri bk-big bk-wide" onclick="window.BKLive.startVote()">${tr("פתח את ההצבעה עכשיו", "Open the vote now")}</button>` : `
          <div class="bk-tally"><b>${t.yes.length}</b> ${tr("בעד", "for")} · ${t.no.length} ${tr("נגד", "against")} · ${tr("צריך", "need")} ${needed(st)}</div>
          <p class="bk-hint">${tr("שחקנים מצביעים בדף שלהם. מי שהרים יד ליד השולחן — לחץ עליו (לחיצה: בעד → נגד → כלום).", "Players vote on their page. For hands raised at the table, tap a seat (tap: for → against → clear).")}</p>
          <p class="bk-hint">${tr("סדר ההצבעה: עם כיוון השעון, מתחיל אחרי המואשם — המואשם מצביע אחרון.", "Voting order: clockwise, starting after the accused — the accused votes last.")}</p>
          <div class="bk-votes">${clockwise(seats, nom.on).filter(s => s.alive || s.ghost).map(s => { const y = t.yes.includes(s.seat), n = t.no.includes(s.seat);
            return `<button type="button" class="${y ? "yes" : n ? "no" : ""}${s.alive ? "" : " ghost"}" onclick="window.BKLive.toggleHand(${s.seat})">${s.seat} ${esc(s.name)}${s.alive ? "" : " 👻"}</button>`; }).join("")}</div>
          <button type="button" class="bk-btn pri bk-big bk-wide" onclick="window.BKLive.closeNom()">${tr("סגור הצבעה וספור", "Close the vote and count")}</button>`}
          ${ST.msg ? `<p class="bk-st-note">${esc(ST.msg)}</p>` : ""}`
        : `${blockHTML(st)}
          <div class="bk-row">${timerTag(st.nomUntil, tr("להאשמה הבאה", "to nominate"))}${st.nomUntil ? `<button type="button" class="bk-btn sm" onclick="window.BKLive.addTime('win', 30)">+30 ${tr("שנ׳", "s")}</button>` : ""}</div>
          ${st.nomUntil && Date.now() > st.nomUntil ? `<p class="bk-st-note">${tr("הזמן להאשמות נגמר — אפשר לסיים את היום.", "Nomination time is over — you can end the day.")}</p>` : ""}
          ${(() => { const today = st.today || { by: {}, on: {} }, canBy = alive.filter(s => !today.by[s.seat]), canOn = seats.filter(s => !today.on[s.seat]);
            return canBy.length && canOn.length ? `<div class="bk-row"><label>${tr("מאשים (חיים שעוד לא האשימו)", "Accuser (alive, not yet today)")}<select id="bkNomBy">${opt(canBy)}</select></label>
            <label>${tr("מואשם (מי שעוד לא הואשם)", "Accused (not yet today)")}<select id="bkNomOn">${opt(canOn, (canOn.find(x => x.seat !== (canBy[0] || {}).seat) || {}).seat)}</select></label></div>
          <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.openNom()">${tr("פתח האשמה — כולם יקבלו התראה", "Open accusation — everyone gets an alert")}</button>`
            : `<p class="bk-hint">${tr("אין עוד האשמות אפשריות היום.", "No more accusations are possible today.")}</p>`; })()}
          ${endDayHTML(st)}`}
      </section>`;

    box.innerHTML = `<div class="bk-lp">
      <div class="bk-lp-head"><div><small>${tr("המשחק בשידור חי", "Live game")}</small><b>${esc(phaseName(st, he()))}</b></div>
        <div class="bk-lp-stats"><span>${alive.length}/${seats.length} ${tr("חיים", "alive")}</span><span>${joined}/${total} ${tr("מחוברים", "joined")}</span></div></div>
      ${winHTML()}
      ${st.phase === "end" ? `<div class="bk-win ${st.winner}"><b>${st.winner === "good" ? tr("🏆 הטובים ניצחו", "🏆 Good won") : tr("😈 הרעים ניצחו", "😈 Evil won")}</b><span>${tr("כל התפקידים נחשפו בטלפונים של השחקנים.", "All roles are now revealed on the players' phones.")}</span></div>` : stepsHTML(st)}
      ${st.phase === "end" ? "" : body}
      ${timesHTML()}
      ${st.phase !== "night" ? infoEditorHTML(st) : ""}
      <details class="bk-lp-sec bk-ie"><summary><h4>${tr("הודעה לשחקנים נבחרים", "Message chosen players")}</h4><small>${tr("פרטי — רק להם", "private — only them")}</small></summary>
        ${recipientsHTML("any", [])}
        <textarea id="bkCustomAny" rows="2" placeholder="${tr("למשל: אתם שניכם משרתים — אל תגלו", "e.g. a private note to these players")}"></textarea>
        <button type="button" class="bk-btn pri" onclick="window.BKLive.sendCustom('any', 'bkCustomAny')">${tr("שלח לנבחרים", "Send to the chosen")}</button>
      </details>
      <section class="bk-lp-sec"><h4>${tr("הודעה לכולם", "Announcement")}</h4>
        <div class="bk-chips bk-presets">${presets(st).map((x, i) => `<button type="button" onclick="window.BKLive.announcePreset(${i})">${esc(x)}</button>`).join("")}</div>
        <div class="bk-row"><input id="bkLiveNotice" type="text" maxlength="300" placeholder="${tr("למשל: עוד 2 דקות להצבעה", "e.g. 2 minutes to the vote")}">
          <button type="button" class="bk-btn" onclick="window.BKLive.announce()">${tr("שלח", "Send")}</button></div>
        ${st.notice ? `<p class="bk-hint">${tr("אחרונה:", "Last:")} ${esc(st.notice.text)}</p>` : ""}
      </section>
    </div>`;
  }

  // The pull-out list of the roles that can be in this game (players see it on their phone).
  function rolesSheetHTML(script, isHe) {
    const T = (h, e) => isHe ? h : e;
    if (!script || !script.length) return `<p class="bkp-hint">${T("אין רשימה למשחק הזה.", "No list for this game.")}</p>`;
    return TYPES.map(([k, h, e]) => { const rs = script.filter(r => r.type === k); if (!rs.length) return "";
      return `<h4 class="bkp-sheet-h ${k}">${isHe ? h : e} <small>${rs.length}</small></h4>` + rs.map(r => `<div class="bkp-sheet-r"><span>${r.icon || ""}</span><div><b>${esc(isHe ? r.name_he || r.name_en : r.name_en || r.name_he)}</b><p>${esc(isHe ? r.ability_he || r.ability_en : r.ability_en || r.ability_he)}</p></div></div>`).join("");
    }).join("");
  }
  function openRoles() {
    const s = PL.game || LB.game || {}, isHe = s.lang !== "en";
    let sh = document.getElementById("bkpSheet");
    if (!sh) { sh = document.createElement("div"); sh.id = "bkpSheet"; sh.className = "bkp-sheet"; document.body.appendChild(sh); }
    sh.innerHTML = `<div class="bkp-sheet-bg" onclick="window.BKLive.closeRoles()"></div><div class="bkp-sheet-card" role="dialog" aria-label="${isHe ? "התפקידים במשחק" : "Roles in this game"}">
      <div class="bkp-sheet-grab"></div><div class="bkp-sheet-top"><b>${isHe ? "התפקידים במשחק" : "Roles in this game"}</b><button type="button" onclick="window.BKLive.closeRoles()" aria-label="${isHe ? "סגור" : "Close"}">×</button></div>
      <div class="bk-seg bk-sheet-mode"><button type="button" data-mode="list" onclick="window.BKSheet.setMode('list')">${isHe ? "רשימה נגללת" : "List"}</button><button type="button" data-mode="page" onclick="window.BKSheet.setMode('page')">${isHe ? "דף מלא" : "Full page"}</button></div>
      <div class="bkp-sheet-body">${s.script && s.script.length ? sheetHTML({ title: s.scriptName || s.title, author: s.scriptAuthor, roles: s.script, lang: s.lang }) : rolesSheetHTML(s.script, isHe)}</div></div>`;
    requestAnimationFrame(() => { sh.classList.add("on"); fitSheets(); });
  }
  function closeRoles() { const sh = document.getElementById("bkpSheet"); if (sh) { sh.classList.remove("on"); setTimeout(() => sh.remove(), 250); } }

  // =============================================================================================
  // Player page
  // =============================================================================================
  const PL = { gid: null, key: null, me: null, game: null, lastNom: null, lastNotice: null, lastInfo: null, alerts: false, reveal: false, seenOnce: false };

  function chime() {
    try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.type = "triangle"; o.frequency.value = 660;
      o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(.25, a.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + .7);
      o.start(); o.frequency.setValueAtTime(880, a.currentTime + .18); o.stop(a.currentTime + .75); } catch (e) {}
  }
  // Tell the player something happened: banner + vibration + sound, and a system notification when the page is in the background.
  function alertPlayer(title, body) {
    const isHe = PL.game ? PL.game.lang !== "en" : true;
    const bar = document.getElementById("bkpToast");
    if (bar) { bar.innerHTML = `<b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ""}`; bar.classList.add("on"); clearTimeout(bar._t); bar._t = setTimeout(() => bar.classList.remove("on"), 7000); }
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    // no sound on purpose: at the table only the player feels their phone buzz
    if (PL.alerts && document.hidden && "Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body, tag: "bootkeh", renotify: true, silent: true }); } catch (e) {}
    }
    void isHe;
  }

  async function enableAlerts() {
    PL.alerts = true; if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    if ("Notification" in window && Notification.permission === "default") { try { await Notification.requestPermission(); } catch (e) {} }
    try { localStorage.setItem("bk_alerts", "1"); } catch (e) {}
    renderPlayer();
  }

  // Open the player app for ?g=…&k=…
  async function openPlayer(gid, k) {
    PL.gid = gid; PL.key = k; if (!devMode()) seatMem.set(gid, k);
    try { PL.alerts = localStorage.getItem("bk_alerts") === "1"; } catch (e) {}
    document.body.classList.add("bkp-mode");   // hides the storyteller screens (see bootkeh-live.css)
    if (!document.getElementById("bkpToast")) { const t = document.createElement("div"); t.id = "bkpToast"; t.className = "bkp-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    let root = document.getElementById("bkPlayerApp");
    if (!root) { root = document.createElement("div"); root.id = "bkPlayerApp"; root.className = "bkp"; document.body.appendChild(root); }
    root.innerHTML = `<div class="bkp-load">…</div>`;
    if (!C()) return;
    await C().watchPlayer(gid, k, (d, why) => { PL.me = d; PL.gone = d ? null : why; onPlayerData(); });
    await C().watchGame(gid, s => { PL.game = s; onGameData(); });
  }

  function onPlayerData() {
    const d = PL.me;
    if (d && PL.seenOnce && d.info && d.info !== PL.lastInfo) {
      const isHe = d.lang !== "en";
      alertPlayer(isHe ? "קיבלת מידע חדש" : "You have new info", d.info.slice(0, 90));
    }
    if (d && d.wake && d.wake.id !== PL.lastWake) {
      if (PL.lastWake !== undefined) { const isHe = d.lang !== "en"; alertPlayer(isHe ? "התעוררת!" : "Wake up!", d.wake.text || ""); }
      PL.lastWake = d.wake.id; PL.pick = []; PL.rpick = [];
    } else if (d && !d.wake) PL.lastWake = PL.lastWake === undefined ? null : PL.lastWake;
    if (d) { PL.lastInfo = d.info; PL.seenOnce = true; }
    renderPlayer();
  }
  // the night, on the player's phone: tap players to choose, confirm; "Got it" after reading new info
  function pickSeat(seat) {
    const w = PL.me && PL.me.wake; if (!w) return;
    PL.pick = PL.pick || []; const i = PL.pick.indexOf(seat);
    if (i >= 0) PL.pick.splice(i, 1); else { PL.pick.push(seat); while (PL.pick.length > (w.n || 1)) PL.pick.shift(); }
    renderPlayer();
  }
  function pickRole(id) {
    const w = PL.me && PL.me.wake; if (!w) return;
    PL.rpick = PL.rpick || []; const i = PL.rpick.indexOf(id);
    if (i >= 0) PL.rpick.splice(i, 1); else { PL.rpick.push(id); while (PL.rpick.length > (w.r || 1)) PL.rpick.shift(); }
    renderPlayer();
  }
  async function sendPick() {
    const w = PL.me && PL.me.wake; if (!w) return;
    try { await C().act(PL.gid, PL.key, w.id, PL.pick || [], PL.rpick || []); if (navigator.vibrate) navigator.vibrate(30); } catch (e) { alert(e.message || e); }
  }
  async function gotIt() {
    const d = PL.me; if (!d) return; const last = (d.log || []).slice(-1)[0];
    try { await C().seen(PL.gid, PL.key, last ? last.at : Date.now()); } catch (e) { alert(e.message || e); }
  }
  const isHeG = () => !PL.me || PL.me.lang !== "en";
  function nightCardsHTML(d, s, T) {
    let html = "";
    const w = d.wake, answered = w && d.act && d.act.wake === w.id;
    if (w && !answered) {
      const seats = ((s && s.seats) || []).filter(x => (w.self || x.seat !== d.seat) && (w.dead ? !x.alive : x.alive || x.seat === d.seat));
      const pick = PL.pick || [], rpick = PL.rpick || [], nr = w.r || 0;
      const roleList = ((s && s.script) || []).filter(r => !w.kinds || w.kinds.includes(r.type));
      const done = pick.length === (w.n || 0) && rpick.length === nr, skip = w.once && !pick.length && !rpick.length, any = w.n || nr;
      html += `<section class="bkp-card bkp-wake"><div class="bkp-wake-top">🌙 <b>${T("התעוררת!", "You are awake!")}</b></div>
        <p class="bkp-wake-text">${esc(w.text || "")}</p>
        ${w.n ? `<small class="bkp-lbl">${T(`בחר ${w.n} ${w.n > 1 ? "שחקנים" : "שחקן"}`, `Choose ${w.n} player${w.n > 1 ? "s" : ""}`)}</small><div class="bkp-pickgrid">${seats.map(x => `<button type="button" class="${pick.includes(x.seat) ? "on" : ""}" onclick="window.BKLive.pickSeat(${x.seat})"><i>${x.seat}</i>${av(x, "sm")}${esc(String(x.name).split(" / ")[0])}</button>`).join("")}</div>` : ""}
        ${nr ? `<small class="bkp-lbl">${T("בחר תפקיד", "Choose a character")}</small><div class="bkp-pickgrid bkp-rolegrid">${roleList.map(r => `<button type="button" class="${rpick.includes(r.id) ? "on" : ""} ${esc(r.type)}" onclick="window.BKLive.pickRole('${esc(r.id)}')"><span>${r.icon || ""}</span>${esc(isHeG() ? r.name_he || r.name_en : r.name_en || r.name_he)}</button>`).join("")}</div>` : ""}
        ${any ? `<button type="button" class="bkp-reveal" ${done || skip ? "" : "disabled"} onclick="window.BKLive.sendPick()">${skip ? T("דלג הפעם", "Skip this time") : done ? T("אישור", "Confirm") : T("בחר כדי להמשיך", "Choose to continue")}</button>`
          : `<button type="button" class="bkp-reveal" onclick="window.BKLive.sendPick()">${T("אני ער — מוכן למידע", "I'm awake — ready")}</button>`}
      </section>`;
    } else if (w && answered) {
      html += `<div class="bkp-night">✓ ${T("הבחירה נשלחה למספר הסיפורים. חכה לתשובה.", "Your choice was sent to the storyteller. Wait for the answer.")}</div>`;
    }
    const last = (d.log || []).slice(-1)[0];
    if (last && (!d.seen || d.seen.at < last.at) && (d.log || []).length > 1) {
      html += `<section class="bkp-card bkp-new"><small>${esc(last.label || "")}</small><p>${esc(last.text)}</p>
        <button type="button" class="bkp-reveal" onclick="window.BKLive.gotIt()">${T("הבנתי ✓", "Got it ✓")}</button></section>`;
    }
    return html;
  }
  function onGameData() {
    const s = PL.game; if (!s) { renderPlayer(); return; }
    const isHe = s.lang !== "en";
    // most important last, so it is the alert left on screen: phase < announcement < accusation
    if (s.phase !== PL.lastPhase) { if (PL.lastPhase) alertPlayer(phaseName(s, isHe), s.phase === "night" ? (isHe ? "עצמו עיניים" : "Close your eyes") : ""); PL.lastPhase = s.phase; }
    if (s.notice && s.notice.id !== PL.lastNotice) {
      if (PL.lastNotice !== null) alertPlayer(isHe ? "הודעה ממספר הסיפורים" : "From the storyteller", s.notice.text);
      PL.lastNotice = s.notice.id;
    } else if (PL.lastNotice === null) PL.lastNotice = s.notice ? s.notice.id : "";
    if (s.nom && s.nom.open && s.nom.id !== PL.lastNom) {
      if (PL.lastNom !== null) alertPlayer(isHe ? `${s.nom.byName} מאשים את ${s.nom.onName}` : `${s.nom.byName} accuses ${s.nom.onName}`, isHe ? "פתחו את ההצבעה" : "Voting is open");
      PL.lastNom = s.nom.id;
    } else if (PL.lastNom === null) PL.lastNom = s.nom ? s.nom.id : "";
    renderPlayer();
  }

  async function playerVote(v) {
    const n = PL.game && PL.game.nom; if (!n || !n.open) return;
    try { await C().vote(PL.gid, PL.key, n.id, v); } catch (e) { alert(e.message || e); }
  }
  async function playerDefend(id) {
    const n = PL.game && PL.game.nom, ta = document.getElementById(id || "bkpDefense"); if (!n || !ta || !ta.value.trim()) return;
    try { await C().defend(PL.gid, PL.key, n.id, ta.value.trim()); ta.value = ""; } catch (e) { alert(e.message || e); }
  }
  function toggleReveal() { PL.reveal = !PL.reveal; renderPlayer(); }

  // ---- by day, from the phone: accuse a player, or use a day ability ----
  function pickDay(mode, seat) { PL.day = PL.day && PL.day.mode === mode && seat == null ? null : { mode, sel: seat != null ? seat : (PL.day && PL.day.mode === mode ? PL.day.sel : null) }; renderPlayer(); }
  async function playerNom() {
    const t = PL.day && PL.day.sel; if (!t) return;
    try { await C().dayAct(PL.gid, PL.key, "nom", [t]); PL.day = null; if (navigator.vibrate) navigator.vibrate(30); alertPlayer(isHeG() ? "ההאשמה נשלחה" : "Nomination sent", ""); renderPlayer(); } catch (e) { alert(e.message || e); }
  }
  async function playerDay() {
    const t = PL.day && PL.day.sel; if (!t) return;
    try { await C().dayAct(PL.gid, PL.key, "day", [t]); PL.day = null; PL.usedAt = Date.now(); if (navigator.vibrate) navigator.vibrate(30); renderPlayer(); } catch (e) { alert(e.message || e); }
  }
  // private notes next to each player (only on this phone)
  const noteKey = () => "bk_notes_" + PL.gid + "_" + PL.key;
  function notes() { try { return JSON.parse(localStorage.getItem(noteKey()) || "{}"); } catch (e) { return {}; } }
  function setNote(seat, v) { const n = notes(); if (v && v.trim()) n[seat] = v.slice(0, 300); else delete n[seat]; try { localStorage.setItem(noteKey(), JSON.stringify(n)); } catch (e) {} }
  function dayHTML(d, s, T) {
    if (!s || !["day", "nominate"].includes(s.phase) && !(s.phase === "dawn")) return "";
    const seats = s.seats || [], me = seats.find(x => x.seat === d.seat), alive = me && me.alive, today = s.today || { by: {}, on: {} };
    const pickGrid = (mode, list) => `<div class="bkp-pickgrid">${list.map(x => `<button type="button" class="${PL.day && PL.day.mode === mode && PL.day.sel === x.seat ? "on" : ""}" onclick="window.BKLive.pickDay('${mode}', ${x.seat})"><i>${x.seat}</i>${av(x, "sm")}${esc(String(x.name).split(" / ")[0])}</button>`).join("")}</div>`;
    let html = "";
    // accuse
    if (s.phase === "day" && s.dayUntil) html += `<div class="bkp-notice">🗣️ ${T("יום — דיון חופשי. האשמות בערב.", "Day — free talk. Nominations in the evening.")} ${timerTag(s.dayUntil, "")}</div>`;
    if (alive && s.phase === "nominate" && !(s.nom && s.nom.open) && !nomWindowOpen(s)) html += `<p class="bkp-hint">⚖️ ${T("הזמן להאשמות נגמר להיום.", "Nomination time is over today.")}</p>`;
    if (alive && nomWindowOpen(s)) {
      if (today.by[d.seat]) html += `<p class="bkp-hint">⚖️ ${T("כבר האשמת היום.", "You already nominated today.")}</p>`;
      else { const can = seats.filter(x => x.seat !== d.seat && !today.on[x.seat]), open = PL.day && PL.day.mode === "nom";
        html += `<section class="bkp-card bkp-daycard">${timerTag(s.nomUntil, T("להאשמה", "to nominate"))}<button type="button" class="bkp-reveal" onclick="window.BKLive.pickDay('nom')">⚖️ ${open ? T("ביטול", "Cancel") : T("האשם שחקן", "Nominate a player")}</button>
          ${open ? `<small class="bkp-lbl">${T("את מי אתה מאשים? (כולם יקבלו התראה)", "Whom do you nominate? (everyone is alerted)")}</small>${pickGrid("nom", can)}
            <button type="button" class="bkp-reveal" ${PL.day.sel ? "" : "disabled"} onclick="window.BKLive.playerNom()">${PL.day.sel ? T(`האשם את ${esc(String((seats.find(x => x.seat === PL.day.sel) || {}).name || "").split(" / ")[0])}`, `Nominate ${esc(String((seats.find(x => x.seat === PL.day.sel) || {}).name || "").split(" / ")[0])}`) : T("בחר שחקן", "Choose a player")}</button>` : ""}</section>`; }
    }
    // a day ability
    const cfg = DAY[d.roleId];
    if (cfg && s.phase !== "dawn") {
      const usable = (cfg.deadOnly ? !alive : alive) && dayAbilityOk(cfg, s), spent = cfg.once && d.spent;
      if (spent) html += `<section class="bkp-card bkp-daycard spent"><div><b>${d.icon || ""} ${esc(isHeG() ? d.name_he : d.name_en)}</b> <span class="bkp-spent">Spent</span></div><p class="bkp-hint">${T("השתמשת ביכולת שלך.", "You used your ability.")}</p></section>`;
      else if (usable && cfg.n) { const open = PL.day && PL.day.mode === "day", list = seats.filter(x => x.alive && (x.seat !== d.seat));
        html += `<section class="bkp-card bkp-daycard"><button type="button" class="bkp-reveal" onclick="window.BKLive.pickDay('day')">${d.icon || "✨"} ${open ? T("ביטול", "Cancel") : T("השתמש ביכולת", "Use your ability")}</button>
          <p class="bkp-hint">${esc(isHeG() ? cfg.he : cfg.en)}${PL.usedAt && Date.now() - PL.usedAt < 60000 ? " · " + T("נשלח ✓", "sent ✓") : ""}</p>
          ${open ? `${pickGrid("day", list)}<button type="button" class="bkp-reveal" ${PL.day.sel ? "" : "disabled"} onclick="window.BKLive.playerDay()">${T("אישור — בפומבי", "Confirm — in public")}</button>` : ""}</section>`; }
      else if (usable && !cfg.n) html += `<p class="bkp-hint">${d.icon || ""} ${esc(isHeG() ? cfg.he : cfg.en)}</p>`;
    }
    return html;
  }
  // the table as everyone sits — names and faces only, no roles; you in gold, your neighbours marked
  function circleHTML(d, s, T) {
    const seats = (s && s.seats) || [], N = seats.length; if (N < 2) return "";
    const i = seats.findIndex(x => x.seat === d.seat), nb = i < 0 ? [] : [seats[(i - 1 + N) % N].seat, seats[(i + 1) % N].seat];
    const R = 40, start = i < 0 ? 0 : i;   // you at the bottom
    return `<section class="bkp-card bkp-circle-card"><h3>${T("מעגל הישיבה", "The table")}</h3>
      <div class="bkp-circle">${seats.map((x, k) => { const a = ((k - start) / N) * 2 * Math.PI + Math.PI / 2, cx = 50 + R * Math.cos(a), cy = 50 + R * Math.sin(a);
        return `<div class="bkp-cseat${x.alive ? "" : " dead"}${x.seat === d.seat ? " me" : ""}${nb.includes(x.seat) ? " nb" : ""}" style="left:${cx.toFixed(2)}%;top:${cy.toFixed(2)}%">${av(x)}<b>${esc(String(x.name).split(" / ")[0])}</b><i>${x.seat}</i></div>`; }).join("")}
        <div class="bkp-circle-mid">${T("עם כיוון השעון ←", "clockwise →")}<br><small>${T(`${seats.filter(x => x.alive).length} חיים`, `${seats.filter(x => x.alive).length} alive`)}</small></div></div>
      ${nb.length ? `<p class="bkp-hint">${T("השכנים שלך", "Your neighbours")}: <b>${nb.map(n => esc(String((seats.find(x => x.seat === n) || {}).name || "").split(" / ")[0])).join(T(" ו־", " and "))}</b></p>` : ""}</section>`;
  }
  // everything this player was told, newest first (kept for the whole game)
  function historyHTML(d, T) {
    const log = (d.log || []).slice().reverse(); if (!log.length) return "";
    return `<details class="bkp-card bkp-log"><summary>📜 ${T("כל המידע שקיבלת", "Everything you were told")} (${log.length})</summary>${log.map(x => `<div><small>${esc(x.label)}${x.at ? " · " + new Date(x.at).toLocaleTimeString(isHeG() ? "he-IL" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}</small><p>${esc(x.text)}</p></div>`).join("")}</details>`;
  }
  function townHTML(d, s, T) {
    if (!s || !s.seats) return "";
    const n = notes(), row = x => `<div class="bkp-trow${x.alive ? "" : " dead"}${x.seat === d.seat ? " me" : ""}"><i>${x.seat}</i>${av(x, "sm")}<b>${esc(String(x.name).split(" / ")[0])}</b>${x.alive ? "" : `<small>${x.ghost ? T("👻 יש הצבעה", "👻 has a vote") : "✝"}</small>`}
      ${x.seat === d.seat ? `<small>${T("אתה", "you")}</small>` : `<input type="text" id="bkpNote-${x.seat}" maxlength="300" value="${esc(n[x.seat] || "")}" placeholder="${T("הערה (רק אצלך)…", "Note (only you)…")}" oninput="window.BKLive.setNote(${x.seat}, this.value)">`}</div>`;
    const al = s.seats.filter(x => x.alive), dd = s.seats.filter(x => !x.alive);
    return `<section class="bkp-card bkp-townlist"><h3>${T("השחקנים", "The players")}</h3>
      <small class="bkp-lbl">${T(`חיים · ${al.length}`, `Alive · ${al.length}`)}</small>${al.map(row).join("")}
      ${dd.length ? `<small class="bkp-lbl">${T(`מתים · ${dd.length}`, `Dead · ${dd.length}`)}</small>${dd.map(row).join("")}` : ""}
      <p class="bkp-hint">📝 ${T("ההערות נשמרות רק בטלפון שלך — אף אחד אחר לא רואה אותן.", "Notes are kept only on your phone — nobody else sees them.")}</p></section>`;
  }

  function renderPlayer() {
    const root = document.getElementById("bkPlayerApp"); if (!root) return;
    // keep the cursor where it was (typing a note or a defence while the game updates)
    const a = document.activeElement, keep = a && root.contains(a) && a.id ? { id: a.id, s: a.selectionStart, e: a.selectionEnd, v: a.value } : null;
    drawPlayer(root);
    if (keep) { const el = document.getElementById(keep.id); if (el) { if (el.value !== keep.v) el.value = keep.v; el.focus({ preventScroll: true }); try { el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
  }
  function drawPlayer(root) {
    const d = PL.me, s = PL.game, isHe = d ? d.lang !== "en" : true, T = (h, e) => isHe ? h : e;
    document.documentElement.setAttribute("dir", isHe ? "rtl" : "ltr");
    if (!d) {
      root.innerHTML = `<div class="bkp-end"><div class="bkp-candle">🕯️</div><h2>${PL.gone === "offline" ? T("אין חיבור", "Offline") : T("המשחק הסתיים", "This game has ended")}</h2>
        <p>${T("הדף הזה היה זמני ונמחק. תודה ששיחקת!", "This page was temporary and has been removed. Thanks for playing!")}</p></div>`;
      return;
    }
    document.title = `${String(d.name || "").split(" / ")[0]} · ${s && s.title ? s.title : "Bootkeh"}`;   // the player's name in the tab
    const mine = s && (s.seats || []).find(x => x.seat === d.seat), alive = !mine || mine.alive, canVote = alive || (mine && mine.ghost);
    const nom = s && s.nom, myVote = d.vote && nom && d.vote.nom === nom.id ? d.vote.v : null, amAccused = nom && nom.open && nom.on === d.seat;
    const name = isHe ? (d.name_he || d.name_en) : (d.name_en || d.name_he), ability = isHe ? (d.ability_he || d.ability_en) : (d.ability_en || d.ability_he);
    const exp = d.expiresAt && d.expiresAt.toMillis ? new Date(d.expiresAt.toMillis()).toLocaleTimeString(isHe ? "he-IL" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
    const log = (d.log || []).slice().reverse();
    root.innerHTML = `
      <header class="bkp-top">
        <div><small>${esc(s ? s.title || "" : d.title || "")}</small><b>${esc(s ? phaseName(s, isHe) : "")}</b></div>
        <span class="bkp-top-btns"><button type="button" class="bkp-bell" onclick="window.BKLive.openRoles()" aria-label="${T("התפקידים במשחק", "Roles in this game")}" title="${T("התפקידים במשחק", "Roles in this game")}">📜</button>
        <button type="button" class="bkp-bell${PL.alerts ? " on" : ""}" onclick="window.BKLive.enableAlerts()" aria-label="${T("התראות", "Alerts")}">${PL.alerts ? "🔔" : "🔕"}</button></span>
      </header>
      ${stLine(s, T)}
      ${!PL.alerts ? `<button type="button" class="bkp-enable" onclick="window.BKLive.enableAlerts()">${T("הפעל התראות — תדע מיד כשמישהו מואשם", "Turn on alerts — know at once when someone is accused")}</button>` : ""}
      ${s && s.phase === "lobby" ? `<div class="bkp-notice">⏳ ${T("ממתינים שכולם יצטרפו. בינתיים אפשר להציץ בתפקיד שלך ובתפקידים שבמשחק (📜).", "Waiting for everyone to join. Meanwhile, peek at your role and the roles in this game (📜).")}</div>` : ""}
      ${s && s.phase === "night" ? `<div class="bkp-night">🌙 ${T("לילה — עצמו עיניים. המידע שלך יופיע כאן.", "Night — eyes closed. Your info will appear here.")}</div>` : ""}
      ${s && s.notice ? `<div class="bkp-notice">📣 ${esc(s.notice.text)}</div>` : ""}
      ${s && s.today && s.today.block && ["day", "nominate"].includes(s.phase) ? `<div class="bkp-block">⚖️ ${s.today.block.seat ? T(`על הגרדום: <b>${esc(s.today.block.name)}</b> · ${s.today.block.votes} קולות`, `On the block: <b>${esc(s.today.block.name)}</b> · ${s.today.block.votes} votes`) : T(`תיקו על ${s.today.block.votes} — אף אחד לא על הגרדום`, `Tie at ${s.today.block.votes} — nobody on the block`)}</div>` : ""}
      ${s && s.phase === "end" ? `<section class="bkp-card bkp-end-card ${esc(s.winner || "")}"><h2>${s.winner === "good" ? T("🏆 הטובים ניצחו!", "🏆 Good wins!") : T("😈 הרעים ניצחו!", "😈 Evil wins!")}</h2>
        <h3>${T("מי היה מי", "Who was who")}</h3><div class="bkp-reveal-list">${(s.reveal || []).map(x => `<div class="${esc(x.align)}"><i>${x.seat}</i><span>${x.icon || ""}</span><b>${esc(String(x.name).split(" / ")[0])}</b><small>${esc(isHe ? x.he : x.en)}</small></div>`).join("")}</div></section>` : ""}

      ${nom && (nom.open || nom.result) ? `<section class="bkp-card bkp-nom${nom.open ? " open" : ""}">
        <div class="bkp-nom-who"><span>${esc(nom.byName)}</span><i>${T("מאשים את", "accuses")}</i><b>${esc(nom.onName)}</b></div>
        ${nom.open ? `
          ${nom.accText ? `<blockquote class="bkp-speech">⚔️ ${esc(nom.byName)}: “${esc(nom.accText)}”</blockquote>` : ""}
          ${nom.defText ? `<blockquote class="bkp-speech">🛡️ ${esc(nom.onName)}: “${esc(nom.defText)}”</blockquote>` : ""}
          ${nom.stage === "defense" && nom.by === d.seat ? `<label class="bkp-lbl">${T("למה אתה מאשים? — כולם יראו", "Why do you nominate? — everyone sees it")}</label>
            <div class="bkp-row"><input id="bkpAccuse" type="text" maxlength="600" placeholder="${T("כי…", "Because…")}"><button type="button" class="bkp-btn" onclick="window.BKLive.playerDefend('bkpAccuse')">${T("שלח", "Send")}</button></div>` : ""}
          ${nom.stage === "defense" ? `<div class="bkp-notice">🗣️ ${T("נאום ההאשמה וההגנה — ההצבעה תיפתח אחריהם.", "The accusation and the defence — the vote opens after them.")} ${timerTag(nom.defUntil, "")}</div>` : ""}
          ${amAccused ? `<label class="bkp-lbl">${T("ההגנה שלך — כולם יראו אותה", "Your defence — everyone sees it")}</label>
            <div class="bkp-row"><input id="bkpDefense" type="text" maxlength="600" placeholder="${T("למה זה לא אני…", "Why it isn't me…")}"><button type="button" class="bkp-btn" onclick="window.BKLive.playerDefend()">${T("שלח", "Send")}</button></div>` : ""}
          ${nom.stage === "defense" ? "" : canVote ? `<div class="bkp-vote">
              <button type="button" class="yes${myVote === "yes" ? " on" : ""}" onclick="window.BKLive.playerVote('yes')">✋ ${T("בעד הוצאה להורג", "Execute")}</button>
              <button type="button" class="no${myVote === "no" ? " on" : ""}" onclick="window.BKLive.playerVote('no')">${T("נגד", "Against")}</button></div>
            ${!alive ? `<p class="bkp-hint">${T("אתה מת — נשארה לך הצבעה אחת. הצבעה \"בעד\" משתמשת בה.", "You are dead — you have one vote left. Voting \"for\" uses it.")}</p>` : ""}`
          : `<p class="bkp-hint">${T("אין לך הצבעות שנשארו.", "You have no votes left.")}</p>`}
          <p class="bkp-hint">${T("אפשר גם להרים יד ליד השולחן — מספר הסיפורים יסמן.", "You can also raise your hand at the table — the storyteller will mark it.")}</p>`
        : `<p class="bkp-result">${nom.result === "block" ? T("עלה לגרדום", "On the block") : nom.result === "tie" ? T("תיקו", "Tie") : nom.result === "short" ? T("לא מספיק קולות", "Not enough votes") : nom.result === "executed" ? T("הוצא להורג", "Executed") : T("ניצל", "Spared")} · ${nom.yes || 0} ${T("קולות", "votes")}</p>`}
      </section>` : ""}

      ${nightCardsHTML(d, s, T)}
      ${dayHTML(d, s, T)}
      <section class="bkp-card bkp-role${PL.reveal ? " open" : ""}">
        <button type="button" class="bkp-reveal" onclick="window.BKLive.toggleReveal()">${PL.reveal ? T("הסתר את התפקיד שלי", "Hide my role") : T("הצג את התפקיד שלי", "Show my role")}</button>
        ${PL.reveal ? `<div class="bkp-role-body">
          <div class="bkp-seat">${av(((s && s.seats) || []).find(x => x.seat === d.seat) || d, "sm")} ${T("מושב", "Seat")} ${d.seat} · ${esc(d.name)}${alive ? "" : " · " + T("מת", "dead")}</div>
          <div class="bkp-icon">${d.icon || "🎭"}</div>
          <h2>${esc(name)}${d.spent ? ` <span class="bkp-spent">Spent</span>` : ""}</h2>
          <div class="bkp-pills"><span class="${esc(d.type)}">${esc(String(d.type || "").toUpperCase())}</span><span class="${esc(d.alignment)}">${d.alignment === "evil" ? T("רעים", "Evil") : T("טובים", "Good")}</span></div>
          <p class="bkp-ability">${esc(ability)}</p>
          ${d.info ? `<div class="bkp-info"><small>${T("המידע האחרון שלך", "Your latest info")}</small><p>${esc(d.info)}</p></div>` : ""}

        </div>` : `<p class="bkp-hint">${T("מוסתר — כדי ששכנים לא יראו.", "Hidden — so your neighbours can't see.")}</p>`}
      </section>

      ${historyHTML(d, T)}
      ${circleHTML(d, s, T)}
      ${townHTML(d, s, T)}

      <footer class="bkp-foot">⌛ ${T("הדף נמחק ב־", "This page is deleted at ")}${exp}</footer>`;
  }

  // =============================================================================================
  // One link for everyone: the storyteller sends a single message (to the WhatsApp group, or shows a QR code at
  // the table); each player opens it, taps their own name, and lands on their private page. A seat can be taken
  // once (it locks to that phone); the storyteller sees who joined and can free a seat taken by mistake.
  // =============================================================================================
  const GS = { draw: null };

  async function groupSend() {
    const isHe = he();
    let g = B().liveGame();
    if (!g) { await B().createLiveGame(); g = B().liveGame(); }
    if (!g) return;
    if (!g.join) g.join = g.links[Object.keys(g.links)[0]].replace(/&k=.*$/, "&join=1");
    let ov = document.getElementById("bkGroup");
    if (!ov) { ov = document.createElement("div"); ov.id = "bkGroup"; ov.className = "bk-sendall"; document.body.appendChild(ov); }
    const title = (B().getThemeTitle && B().getThemeTitle()) || g.title || "Bootkeh";
    const msg = isHe ? `🕰️ ${title}\nכל אחד לוחץ על הקישור, בוחר את השם שלו ומקבל את התפקיד שלו:\n${g.join}`
                     : `🕰️ ${title}\nTap the link, pick your name and get your role:\n${g.join}`;
    const draw = () => {
      const ps = players(), taken = ps.filter(p => ST.taken[p.seat]).length, all = taken >= ps.length && ps.length;
      ov.innerHTML = `<div class="bk-sendall-card bk-group" role="dialog" aria-label="${tr("שליחה לכולם", "Send to everyone")}">
        <div class="bk-sendall-top"><b>${tr("שליחה לכולם בבת אחת", "Send to everyone at once")}</b><button type="button" class="bk-sendall-x" aria-label="${tr("סגור", "Close")}">×</button></div>
        <p class="bk-hint">${tr("הודעה אחת לקבוצה (או סריקה של הקוד מהמסך שלך). כל שחקן בוחר את השם שלו ומקבל רק את התפקיד שלו — המושב ננעל לטלפון שלו.", "One message to the group (or scan the code on your screen). Each player taps their name and sees only their own role — the seat locks to their phone.")}</p>
        <a class="bk-btn pri whatsapp bk-wide" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${tr("שלח לקבוצה ב־WhatsApp", "Send to the WhatsApp group")}</a>
        <div class="bk-row">
          <button type="button" class="bk-btn" data-act="copy">${tr("העתק קישור", "Copy link")}</button>
          ${navigator.share ? `<button type="button" class="bk-btn" data-act="share">${tr("שתף…", "Share…")}</button>` : ""}
        </div>
        <div class="bk-qr" id="bkQr" aria-label="QR"></div>
        <div class="bk-sendall-bar"><i style="width:${Math.round(taken / Math.max(1, ps.length) * 100)}%"></i></div>
        <div class="bk-sendall-count">${taken} / ${ps.length} ${tr("הצטרפו", "joined")}</div>
        <div class="bk-group-list">${ps.map(p => `<span class="${ST.taken[p.seat] ? "on" : ""}">${p.seat}. ${av((ST.game && (ST.game.seats || []).find(x => x.seat === p.seat)) || { name: p.name, photo: B().photoFor ? B().photoFor(p.name) : "" }, "sm")}${esc(p.name)}${ST.taken[p.seat] ? " ✓" : ""}
          <button type="button" data-link="${p.seat}" title="${tr("הקישור האישי שלו — להעתקה / שליחה מחדש", "Their personal link — copy / resend")}">🔗</button>${devMode() ? `<button type="button" data-tab="${p.seat}" title="${tr("פתח כשחקן בטאב חדש (מצב מפתח)", "Open as this player in a new tab (developer mode)")}">🧪</button>` : ""}${ST.taken[p.seat] ? `<button type="button" data-free="${p.seat}" title="${tr("שחרר מושב", "Free seat")}">↺</button>` : ""}</span>`).join("")}</div>
        ${devMode() ? `<button type="button" class="bk-btn bk-wide" data-act="alltabs">🧪 ${tr("מצב מפתח: פתח את כל השחקנים בטאב אחד ומחובר", "Developer mode: open all players in one tab, connected")}</button>` : ""}
        <p class="bk-hint">${tr("🔗 = הקישור האישי של השחקן (אם החליף טלפון או לא מצליח להיכנס). ↺ = שחרור מושב שנלקח בטעות.", "🔗 = the player's personal link (if they changed phone or can't get in). ↺ = free a seat taken by mistake.")}</p>
        <div class="bk-join ${all ? "all" : ""}">${all ? tr("כולם הצטרפו — אפשר להתחיל!", "Everyone joined — you can start!") : tr(`ממתינים ל־${ps.length - taken} שחקנים…`, `Waiting for ${ps.length - taken} players…`)}</div>
        <button type="button" class="bk-btn pri bk-wide bk-big" data-act="start">${all ? tr("התחל — לילה 1", "Start — Night 1") : tr("התחל בכל זאת (בדיקה)", "Start anyway (test)")}</button>
        <details class="bk-hint"><summary>${tr("לשלוח לכל אחד בפרטי במקום?", "Send privately to each one instead?")}</summary>
          <p>${tr("WhatsApp לא מאפשר לאתר לשלוח הודעות בשמך, אז בפרטי צריך ללחוץ “שלח” בכל צ'אט.", "WhatsApp doesn't let a website send messages for you, so private chats need one tap each.")}</p>
          <button type="button" class="bk-btn sm" data-act="each">${tr("שליחה בפרטי, אחד אחד", "Private, one by one")}</button></details>
      </div>`;
      ov.querySelector(".bk-sendall-x").onclick = () => { ov.remove(); };
      ov.querySelector('[data-act="copy"]').onclick = e => { navigator.clipboard && navigator.clipboard.writeText(g.join); e.target.textContent = "✓"; };
      const sh = ov.querySelector('[data-act="share"]'); if (sh) sh.onclick = () => navigator.share({ title, text: msg }).catch(() => {});
      ov.querySelector('[data-act="start"]').onclick = async () => { ov.remove(); B().setTab("board"); await attach(); if (!ST.game || ST.game.phase === "lobby") await setPhase("night"); };
      ov.querySelector('[data-act="each"]').onclick = () => { ov.remove(); B().sendEachWhatsapp(); };
      ov.querySelectorAll("[data-free]").forEach(b => b.onclick = () => C().releaseSeat(g.gameId, +b.dataset.free).catch(e => alert(e.message || e)));
      ov.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { const seat = +b.dataset.tab; window.open(g.links[seat], "_blank"); C().claimSeat(g.gameId, seat).catch(() => {}); });
      // browsers let a click open only one new tab, so all the players open together in ONE tab (a grid of phones)
      const allTabs = ov.querySelector('[data-act="alltabs"]'); if (allTabs) allTabs.onclick = () => window.open(devAllUrl(), "_blank");
      ov.querySelectorAll("[data-link]").forEach(b => b.onclick = () => {
        const seat = +b.dataset.link, url = g.links[seat], who = (ps.find(p => p.seat === seat) || {}).name || "";
        if (navigator.share) navigator.share({ title: who, text: tr(`${who} — הדף האישי שלך במשחק:`, `${who} — your personal page:`), url }).catch(() => {});
        else { navigator.clipboard && navigator.clipboard.writeText(url); b.textContent = "✓"; setTimeout(() => b.textContent = "🔗", 1200); }
      });
      drawQr(g.join);
    };
    GS.draw = draw; draw();
    await attach();   // also starts watching who joined
  }
  function redrawGroup() { if (document.getElementById("bkGroup") && GS.draw) GS.draw(); }

  // QR code (qrcodejs from cdnjs, loaded the first time it's needed)
  let qrLib = null;
  function drawQr(text, id) {
    const box = document.getElementById(id || "bkQr"); if (!box) return;
    qrLib = qrLib || new Promise((ok, bad) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
    if (box.dataset.for === text && box.firstChild) return;
    box.dataset.for = text;
    qrLib.then(() => { box.innerHTML = ""; new window.QRCode(box, { text, width: 180, height: 180, colorDark: "#1a0f08", colorLight: "#f3e7cb", correctLevel: window.QRCode.CorrectLevel.M }); }).catch(() => { box.remove(); });
  }

  // A player's personal key for a game, kept on this phone in two places (some in-app browsers clear one of them).
  // Not by IP: everyone at the table shares the same Wi-Fi IP, and on mobile data it keeps changing.
  // developer mode (Settings ⚙): several players in separate tabs of one computer, start without everyone
  // 🧪 developer mode: every player of this game, side by side in one tab, each seat taken ("joined") and live
  function devAllUrl() { return location.origin + location.pathname.replace(/\/Bootkeh(\.html|\/index\.html|\/)?$/i, "/").replace(/[^/]*$/, "") + "Bootkeh/?devall=1"; }
  async function openDevAll() {
    const isHe = he(), T = tr;
    document.documentElement.classList.add("bk-tv-mode", "bk-devall");
    const root = document.createElement("div"); root.id = "bkTV"; root.className = "bk-devall-root"; document.body.appendChild(root);
    const g = C() && C().saved();
    if (!g) { root.innerHTML = `<div class="bk-tv-msg"><b>🧪</b><p>${T("אין משחק חי במכשיר הזה. צור משחק בטאב של מספר הסיפורים ואז פתח שוב.", "No live game on this device. Create one in the storyteller tab, then open this again.")}</p></div>`; return; }
    document.title = "🧪 " + T("כל השחקנים", "All players") + " · " + (g.title || "Bootkeh");
    const ps = (B()._state.players && B()._state.players.length ? B()._state.players : Object.keys(g.links).map(seat => ({ seat: +seat, name: T("שחקן ", "Player ") + seat })));
    let cols = +(localStorage.getItem("bk_devall_cols") || 0) || 0;
    const draw = () => {
      root.innerHTML = `<div class="bk-devall-top"><b>🧪 ${T("כל השחקנים", "All players")} · ${esc(g.title || "")}</b><span id="bkDevAllMsg">${T("מחבר את כולם…", "Connecting everyone…")}</span>
        <span class="bk-seg">${[0, 3, 4, 5].map(c => `<button type="button" data-cols="${c}" class="${cols === c ? "on" : ""}">${c || T("אוטו", "auto")}</button>`).join("")}</span></div>
        <div class="bk-devall-grid" style="${cols ? `grid-template-columns:repeat(${cols},minmax(0,1fr))` : ""}"><figure class="bk-devall-st"><figcaption>👑 ${T("מספר הסיפורים", "Storyteller")}${g.st && g.st.name ? " · " + esc(g.st.name) : ""}</figcaption>
          <iframe id="bkDevAllSt" src="${esc(devAllUrl().replace(/\?devall=1$/, ""))}" title="Storyteller" loading="eager"></iframe></figure>${ps.map(p => `<figure><figcaption>${p.seat} · ${esc(String(p.name).split(" / ")[0])}${p.role ? ` <small>${p.role.icon || ""} ${esc(isHe ? p.role.name_he : p.role.name_en)}</small>` : ""}</figcaption>
          <iframe src="${esc(g.links[p.seat])}" title="${esc(p.name)}" loading="eager"></iframe></figure>`).join("")}</div>`;
      const stf = root.querySelector("#bkDevAllSt"); if (stf) stf.onload = () => { try { const w = stf.contentWindow; w.Bootkeh.setTab("board"); w.BKLive.attach(); } catch (e) {} };
      root.querySelectorAll("[data-cols]").forEach(b => b.onclick = () => { cols = +b.dataset.cols; try { localStorage.setItem("bk_devall_cols", cols); } catch (e) {} draw(); claimAll(); });
    };
    const claimAll = async () => {
      let ok = 0;
      for (const p of ps) { try { await C().claimSeat(g.gameId, p.seat); ok++; } catch (e) {} }
      const m = document.getElementById("bkDevAllMsg"); if (m) m.textContent = T(`✓ ${ok}/${ps.length} מחוברים`, `✓ ${ok}/${ps.length} connected`);
    };
    draw(); claimAll();
  }
  function devMode() { try { return localStorage.getItem("bk_dev") === "1"; } catch (e) { return false; } }
  const seatMem = {
    get(gid) {
      try { const k = localStorage.getItem("bk_seat_" + gid); if (k) return k; } catch (e) {}
      const m = new RegExp("(?:^|; )bk_seat_" + gid.replace(/[^\w-]/g, "") + "=([^;]+)").exec(document.cookie); return m ? decodeURIComponent(m[1]) : null;
    },
    set(gid, k) {
      try { localStorage.setItem("bk_seat_" + gid, k); } catch (e) {}
      try { document.cookie = "bk_seat_" + gid.replace(/[^\w-]/g, "") + "=" + encodeURIComponent(k) + "; max-age=" + 13 * 3600 + "; path=/; SameSite=Lax; Secure"; } catch (e) {}
    }
  };

  // Player side of the group link: …/Bootkeh/?g=<game>&join=1
  const LB = { gid: null, sel: null, taken: {}, busy: false, game: null };
  async function openLobby(gid) {
    LB.gid = gid;
    if (!devMode()) { const k = seatMem.get(gid); if (k) { location.replace(location.pathname + `?g=${gid}&k=${k}`); return; } }
    document.body.classList.add("bkp-mode");
    let root = document.getElementById("bkPlayerApp");
    if (!root) { root = document.createElement("div"); root.id = "bkPlayerApp"; root.className = "bkp"; document.body.appendChild(root); }
    root.innerHTML = `<div class="bkp-load">…</div>`;
    if (!C()) return;
    await C().watchGame(gid, st => { LB.game = st; drawLobby(); });
    await C().watchTaken(gid, t => { LB.taken = Object.assign({}, t); drawLobby(); });
  }
  function drawLobby() {
    const root = document.getElementById("bkPlayerApp"); if (!root) return;
    const s = LB.game, isHe = s ? s.lang !== "en" : true, T = (h, e) => isHe ? h : e;
    document.documentElement.setAttribute("dir", isHe ? "rtl" : "ltr");
    if (!s) { root.innerHTML = `<div class="bkp-end"><div class="bkp-candle">🕯️</div><h2>${T("המשחק הסתיים", "This game has ended")}</h2><p>${T("הקישור כבר לא פעיל.", "This link is no longer active.")}</p></div>`; return; }
    const free = (s.seats || []).filter(x => !LB.taken[x.seat]).length;
    document.title = `${T("מי אתה?", "Who are you?")} · ${s.title || "Bootkeh"}`;
    root.innerHTML = `<header class="bkp-top"><div><small>${esc(s.title || "")}</small><b>${T("מי אתה?", "Who are you?")}</b></div>
        <button type="button" class="bkp-bell" onclick="window.BKLive.openRoles()" aria-label="${T("התפקידים במשחק", "Roles in this game")}" title="${T("התפקידים במשחק", "Roles in this game")}">📜</button></header>
      ${stLine(s, T)}
      <div class="bkp-notice">${T(`${free} מקומות פנויים · השמות שנלקחו מתעדכנים בזמן אמת`, `${free} seats free · taken names update live`)}</div>
      <p class="bkp-hint">${T("לחץ על השם שלך. אחרי זה המושב ננעל לטלפון הזה ותקבל רק את התפקיד שלך.", "Tap your name. The seat then locks to this phone and you'll see only your own role.")}</p>
      <div class="bkp-pick">${(s.seats || []).map(x => `<button type="button" class="${LB.sel === x.seat ? "sel" : ""}${LB.taken[x.seat] ? " taken" : ""}" data-seat="${x.seat}">
        <i>${x.seat}</i>${av(x)}<span>${esc(x.name)}</span>${LB.taken[x.seat] ? `<small>${T("תפוס", "taken")}</small>` : ""}</button>`).join("")}</div>
      <p class="bkp-hint">${T("יצאת או רעננת? לחץ שוב על השם שלך — מאותו טלפון תחזור ישר לדף שלך.", "Left or refreshed? Tap your name again — from the same phone you go straight back to your page.")}</p>
      ${LB.sel ? `<button type="button" class="bkp-reveal" id="bkpClaim"${LB.busy ? " disabled" : ""}>${LB.busy ? "…" : (LB.taken[LB.sel] ? T("זה אני — חזור לדף שלי · ", "That's me — back to my page · ") : T("כן, זה אני — ", "Yes, that's me — ")) + esc(((s.seats || []).find(x => x.seat === LB.sel) || {}).name || "")}</button>` : ""}
      <p class="bkp-hint" id="bkpLobbyMsg">${esc(LB.msg || "")}</p>`;
    root.querySelectorAll("[data-seat]").forEach(b => b.onclick = () => { LB.sel = +b.dataset.seat; LB.msg = ""; drawLobby(); });
    const go = document.getElementById("bkpClaim");
    if (go) go.onclick = async () => {
      LB.busy = true; drawLobby();
      try {
        const k = await C().claimSeat(LB.gid, LB.sel);
        if (!devMode()) seatMem.set(LB.gid, k);
        location.replace(location.pathname + `?g=${LB.gid}&k=${k}`);
      } catch (e) {
        LB.taken[LB.sel] = true; LB.sel = null; LB.busy = false;
        LB.msg = T("המושב הזה נלקח מטלפון אחר. אם זה אתה — בקש ממספר הסיפורים לשלוח לך שוב את הקישור האישי שלך (או לשחרר את המושב).", "That seat was taken from another phone. If it's yours, ask the storyteller to resend your personal link (or free the seat).");
        drawLobby();
      }
    };
  }

  window.BKLive = { devMode, decide: decideOpt, toggleRcpt, sendCustom, pickRole, endDay, declareWin, dismissWin: () => { ST.win = null; render(); }, runWake, runSend, runGo, pickSeat, sendPick, gotIt, useChip, sendInfo, editInfo: (seat, v) => { ST.edit[seat] = v; }, ieToggle: o => { ST.ieOpen = o; },
    groupSend, openLobby, startFlow, toggleDeath, announceDawn, openRoles, closeRoles, attach, render, syncSeats, setPhase, announce, openNom, toggleHand, closeNom, sendNight, draft: (seat, v) => { ST.draft[seat] = v; },
    toggleManual: () => { ST.manual = !ST.manual; render(); }, openDevAll, devAllUrl, startVote, addTime, setTime, autoNight, autoText, broadcastNight, checkBcast, endNightAuto, announcePreset, playerNom, playerDay, pickDay, setNote, autoToggle: o => { ST.autoOpen = o; }, openPlayer, enableAlerts, playerVote, playerDefend, toggleReveal };
})();
