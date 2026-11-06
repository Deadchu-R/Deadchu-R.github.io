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
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const B = () => window.Bootkeh, C = () => window.BKCloud;
  const he = () => (B() && B()._state ? B()._state.lang : "he") !== "en";
  const tr = (h, e) => he() ? h : e;
  const phaseName = (st, isHe) => {
    const H = isHe !== false;
    if (!st) return "";
    if (st.phase === "lobby") return H ? "מתכוננים" : "Getting ready";
    if (st.phase === "night") return (H ? "לילה " : "Night ") + st.day;
    if (st.phase === "dawn") return (H ? "בוקר יום " : "Dawn, day ") + st.day;
    if (st.phase === "nominate") return (H ? "יום " : "Day ") + st.day + (H ? " · האשמות" : " · Accusations");
    return (H ? "יום " : "Day ") + st.day + (H ? " · דיון" : " · Discussion");
  };
  const needed = st => Math.ceil(((st && st.seats) || []).filter(s => s.alive).length / 2);
  const TYPES = [["townsfolk", "תושבי העיירה", "Townsfolk"], ["outsider", "אאוטסיידרים", "Outsiders"], ["minion", "משרתים", "Minions"], ["demon", "שדים", "Demons"]];

  // =============================================================================================
  // Storyteller — the game flow:  send to everyone → night 1 → dawn (who died) → day → accusations → night 2 → …
  // Every step updates every phone at once (phase + an announcement), and everything can still be changed by hand.
  // =============================================================================================
  const ST = { game: null, players: {}, taken: {}, unGame: null, unPlayers: null, unTaken: null, gid: null, draft: {}, deaths: {} };

  // Start listening to the live game made on this device (called when the Game tab is shown).
  async function attach() {
    const g = B() && B().liveGame && B().liveGame();
    if (!g) { ST.gid = null; render(); return; }
    if (ST.gid === g.gameId) { render(); return; }
    ST.gid = g.gameId; ST.game = null; ST.players = {}; ST.taken = {}; ST.draft = {};
    try {
      [ST.unGame, ST.unPlayers, ST.unTaken].forEach(u => u && u());
      ST.unGame = await C().watchGame(g.gameId, s => { ST.game = s; render(); });
      ST.unPlayers = await C().watchPlayers(g.gameId, ps => { ST.players = ps; render(); });
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
    if (phase === "night") { patch.nom = null; ST.draft = {}; }
    if (!patch.notice) {
      const say = { night: tr(`לילה ${day} — כולם עוצמים עיניים. מי שמתעורר יקבל הודעה.`, `Night ${day} — everyone close your eyes. Whoever wakes gets a message.`),
        day: tr(`יום ${day} — דיון חופשי. אפשר לדבר עם כולם.`, `Day ${day} — talk freely with everyone.`),
        nominate: tr("ההאשמות פתוחות — מי רוצה להאשים, מצביע עכשיו.", "Accusations are open."),
        lobby: "" }[phase];
      if (say) patch.notice = notice(say);
    }
    void isHe;
    await C().setState(ST.gid, patch);
  }

  // Dawn: the storyteller marks who died in the night, then everyone hears it.
  function toggleDeath(seat) { ST.deaths[seat] = !ST.deaths[seat]; render(); }
  async function announceDawn() {
    const st = ST.game || {}, seats = (st.seats || []).map(s => Object.assign({}, s));
    const died = seats.filter(s => ST.deaths[s.seat] && s.alive); died.forEach(s => { s.alive = false; });
    ST.deaths = {}; mirrorLocal(seats);
    const text = died.length ? tr(`בוקר, יום ${st.day}. הלילה ${died.length > 1 ? "מתו" : "מת/ה"}: ${names(died)}.`, `Morning, day ${st.day}. Died tonight: ${names(died)}.`)
                             : tr(`בוקר, יום ${st.day}. אף אחד לא מת הלילה.`, `Morning, day ${st.day}. Nobody died tonight.`);
    await setPhase("day", { seats, notice: notice(text) });
  }

  async function announce() {
    const ta = document.getElementById("bkLiveNotice"); const text = ta && ta.value.trim(); if (!text) return;
    await C().setState(ST.gid, { notice: notice(text) });
    ta.value = "";
  }

  // Open an accusation: by → on.
  async function openNom() {
    const by = +document.getElementById("bkNomBy").value, on = +document.getElementById("bkNomOn").value;
    if (!on) return;
    const st = ST.game || {};
    const s = (st.seats || []).find(x => x.seat === on), b = (st.seats || []).find(x => x.seat === by);
    await C().setState(ST.gid, { phase: "nominate", nom: { id: "m" + Date.now(), by, on, byName: b ? b.name : "", onName: s ? s.name : "", open: true, manual: {}, result: null } });
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

  // Close the vote. execute=true kills the accused (and spends ghost votes of dead "for" voters). Everyone is told.
  async function closeNom(execute) {
    const st = ST.game || {}, nom = st.nom; if (!nom) return;
    const t = tally(), seats = (st.seats || []).map(s => Object.assign({}, s));
    for (const s of seats) if (!s.alive && t.yes.includes(s.seat)) s.ghost = false;
    if (execute) { const s = seats.find(x => x.seat === nom.on); if (s) s.alive = false; }
    mirrorLocal(seats);
    const text = execute ? tr(`${nom.onName} הוצא/ה להורג (${t.yes.length} קולות).`, `${nom.onName} was executed (${t.yes.length} votes).`)
                         : tr(`${nom.onName} ניצל/ה (${t.yes.length} קולות, צריך ${needed(st)}).`, `${nom.onName} was spared (${t.yes.length} votes, needed ${needed(st)}).`);
    await C().setState(ST.gid, { seats, nom: Object.assign({}, nom, { open: false, yes: t.yes.length, result: execute ? "executed" : "spared" }), notice: notice(text) });
  }

  // Night composer: one text per player (night 1 starts from the dealt first-night info), then send all at once.
  function nightDefault(p) {
    const st = ST.game || {};
    if (p.isAlive === false) return tr(`אתה מת. אתה עדיין משתתף בדיון ויש לך הצבעה אחת אחרונה.`, `You are dead. You still talk, and you have one last vote.`);
    if ((st.day || 1) === 1) return p.firstNightInfo || "";
    return "";
  }
  async function sendNight(toWhatsapp) {
    const st = ST.game || {}, label = phaseName(st, he());
    const items = [];
    for (const p of players()) {
      const ta = document.getElementById("bkNight-" + p.seat); const text = ta ? ta.value.trim() : "";
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

  // The steps bar at the top of the panel.
  function stepsHTML(st) {
    const steps = [["lobby", tr("הצטרפות", "Join")], ["night", tr("לילה", "Night")], ["dawn", tr("בוקר", "Dawn")], ["day", tr("יום", "Day")], ["nominate", tr("האשמות", "Accuse")]];
    const at = steps.findIndex(x => x[0] === st.phase);
    return `<ol class="bk-steps">${steps.map(([k, n], i) => `<li class="${i < at ? "done" : i === at ? "on" : ""}"><button type="button" onclick="window.BKLive.setPhase('${k}')" title="${tr("קפוץ לשלב הזה", "Jump to this step")}">${n}</button></li>`).join("")}</ol>`;
  }

  function render() {
    const box = document.getElementById("bkLivePanel"); if (!box) return;
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
        <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.setPhase('night')">${all ? tr("התחל — לילה 1", "Start — Night 1") : tr("התחל בכל זאת (בדיקה) — לילה 1", "Start anyway (test) — Night 1")}</button>
      </section>`;

    if (st.phase === "night") body = `<section class="bk-lp-sec"><h4>${tr("מידע ללילה", "Night info")} — ${esc(phaseName(st, he()))}</h4>
        <p class="bk-hint">${tr("כתוב לכל שחקן מה הוא לומד הלילה (ריק = לא נשלח). \"שלח לכולם\" שולח לכל הטלפונים בבת אחת, והמידע הקודם נשמר אצלם בהיסטוריה.", "Write what each player learns tonight (empty = not sent). \"Send to all\" sends to every phone at once; older info stays in their history.")}</p>
        <div class="bk-night">${players().slice().sort((a, b) => (b.isAlive !== false) - (a.isAlive !== false) || a.seat - b.seat).map(p => {
          const r = p.role || {}; const v = ST.draft[p.seat] != null ? ST.draft[p.seat] : nightDefault(p);
          return `<label class="${p.isAlive === false ? "dead" : ""}"><span><b>${p.seat} · ${esc(p.name)}</b> <small>${r.icon || ""} ${esc(he() ? r.name_he : r.name_en)}${p.isAlive === false ? " · " + tr("מת", "dead") : ""}</small></span>
            <textarea id="bkNight-${p.seat}" rows="2" oninput="window.BKLive.draft(${p.seat}, this.value)" placeholder="${tr("מה הוא לומד הלילה…", "What they learn tonight…")}">${esc(v)}</textarea></label>`;
        }).join("")}</div>
        <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.sendNight(false)">${tr("שלח מידע לכולם", "Send info to everyone")}</button>
        <button type="button" class="bk-btn bk-wide" onclick="window.BKLive.sendNight(true)">${tr("שלח וגם ב־WhatsApp", "Send + WhatsApp")}</button>
        <div id="bkNightMsg" class="bk-hint">${esc(ST.msg || "")}</div>
        <button type="button" class="bk-btn ${ST.sentNight === st.day ? "pri" : ""} bk-wide bk-big" onclick="window.BKLive.setPhase('dawn')">${tr("סיום הלילה — עלות השחר ›", "End the night — dawn ›")}</button>
      </section>`;

    if (st.phase === "dawn") body = `<section class="bk-lp-sec"><h4>${tr("מי מת הלילה?", "Who died tonight?")}</h4>
        <p class="bk-hint">${tr("סמן את מי שמת (או אף אחד) ולחץ \"הכרז\" — כולם יקבלו את ההודעה והעיירה תתעדכן.", "Mark who died (or nobody) and tap \"Announce\" — everyone is told and the town updates.")}</p>
        <div class="bk-votes">${alive.map(s => `<button type="button" class="${ST.deaths[s.seat] ? "no" : ""}" onclick="window.BKLive.toggleDeath(${s.seat})">${s.seat} ${esc(s.name)}${ST.deaths[s.seat] ? " ✝" : ""}</button>`).join("")}</div>
        <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.announceDawn()">${Object.values(ST.deaths).some(Boolean) ? tr("הכרז ועבור ליום", "Announce and start the day") : tr("אף אחד לא מת — הכרז ועבור ליום", "Nobody died — announce and start the day")}</button>
      </section>`;

    if (st.phase === "day") body = `<section class="bk-lp-sec"><h4>${esc(phaseName(st, he()))}</h4>
        <p class="bk-hint">${tr("הדיון פתוח. כשמוכנים — פותחים האשמות. אפשר גם לדלג ישר ללילה.", "Discussion is open. When ready, open accusations — or skip to the night.")}</p>
        <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.setPhase('nominate')">${tr("פתח האשמות", "Open accusations")}</button>
        <button type="button" class="bk-btn bk-wide" onclick="window.BKLive.setPhase('night')">${tr("ללילה הבא ›", "To the next night ›")}</button>
      </section>`;

    if (st.phase === "nominate") body = `<section class="bk-lp-sec"><h4>${tr("האשמה", "Accusation")}</h4>
        ${nom && nom.open ? `
          <div class="bk-nom"><span>${esc(nom.byName)}</span><i>${tr("מאשים את", "accuses")}</i><b>${esc(nom.onName)}</b></div>
          ${ST.players[nom.on] && ST.players[nom.on].defense && ST.players[nom.on].defense.nom === nom.id ? `<blockquote>“${esc(ST.players[nom.on].defense.text)}”</blockquote>` : ""}
          <div class="bk-tally"><b>${t.yes.length}</b> ${tr("בעד", "for")} · ${t.no.length} ${tr("נגד", "against")} · ${tr("צריך", "need")} ${needed(st)}</div>
          <p class="bk-hint">${tr("שחקנים מצביעים בדף שלהם. מי שהרים יד ליד השולחן — לחץ עליו (לחיצה: בעד → נגד → כלום).", "Players vote on their page. For hands raised at the table, tap a seat (tap: for → against → clear).")}</p>
          <div class="bk-votes">${seats.filter(s => s.alive || s.ghost).map(s => { const y = t.yes.includes(s.seat), n = t.no.includes(s.seat);
            return `<button type="button" class="${y ? "yes" : n ? "no" : ""}${s.alive ? "" : " ghost"}" onclick="window.BKLive.toggleHand(${s.seat})">${s.seat} ${esc(s.name)}${s.alive ? "" : " 👻"}</button>`; }).join("")}</div>
          <div class="bk-row"><button type="button" class="bk-btn pri bk-big" onclick="window.BKLive.closeNom(true)">${tr("הוצא להורג", "Execute")}</button>
            <button type="button" class="bk-btn bk-big" onclick="window.BKLive.closeNom(false)">${tr("לא הוצא להורג", "Spare")}</button></div>`
        : `${nom && nom.result ? `<p class="bk-hint">${esc(nom.onName)}: ${nom.result === "executed" ? tr("הוצא להורג", "executed") : tr("ניצל", "spared")} (${nom.yes} ${tr("קולות", "votes")})</p>` : ""}
          <div class="bk-row"><label>${tr("מאשים", "By")}<select id="bkNomBy">${opt(alive)}</select></label>
            <label>${tr("מואשם", "Accused")}<select id="bkNomOn">${opt(seats, (alive[1] || alive[0] || {}).seat)}</select></label></div>
          <button type="button" class="bk-btn pri bk-wide bk-big" onclick="window.BKLive.openNom()">${tr("פתח האשמה — כולם יקבלו התראה", "Open accusation — everyone gets an alert")}</button>
          <button type="button" class="bk-btn bk-wide" onclick="window.BKLive.setPhase('night')">${tr("סיום היום — ללילה הבא ›", "End the day — next night ›")}</button>`}
      </section>`;

    box.innerHTML = `<div class="bk-lp">
      <div class="bk-lp-head"><div><small>${tr("המשחק בשידור חי", "Live game")}</small><b>${esc(phaseName(st, he()))}</b></div>
        <div class="bk-lp-stats"><span>${alive.length}/${seats.length} ${tr("חיים", "alive")}</span><span>${joined}/${total} ${tr("מחוברים", "joined")}</span></div></div>
      ${stepsHTML(st)}
      ${body}
      <section class="bk-lp-sec"><h4>${tr("הודעה לכולם", "Announcement")}</h4>
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
      <div class="bkp-sheet-grab"></div><div class="bkp-sheet-top"><b>${isHe ? "התפקידים שיכולים להיות במשחק" : "Roles that can be in this game"}</b><button type="button" onclick="window.BKLive.closeRoles()" aria-label="${isHe ? "סגור" : "Close"}">×</button></div>
      <div class="bkp-sheet-body">${rolesSheetHTML(s.script, isHe)}</div></div>`;
    requestAnimationFrame(() => sh.classList.add("on"));
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
    if (PL.alerts) chime();
    if (PL.alerts && document.hidden && "Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body, tag: "bootkeh", renotify: true }); } catch (e) {}
    }
    void isHe;
  }

  async function enableAlerts() {
    PL.alerts = true; chime();
    if ("Notification" in window && Notification.permission === "default") { try { await Notification.requestPermission(); } catch (e) {} }
    try { localStorage.setItem("bk_alerts", "1"); } catch (e) {}
    renderPlayer();
  }

  // Open the player app for ?g=…&k=…
  async function openPlayer(gid, k) {
    PL.gid = gid; PL.key = k;
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
    if (d) { PL.lastInfo = d.info; PL.seenOnce = true; }
    renderPlayer();
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
  async function playerDefend() {
    const n = PL.game && PL.game.nom, ta = document.getElementById("bkpDefense"); if (!n || !ta || !ta.value.trim()) return;
    try { await C().defend(PL.gid, PL.key, n.id, ta.value.trim()); ta.value = ""; } catch (e) { alert(e.message || e); }
  }
  function toggleReveal() { PL.reveal = !PL.reveal; renderPlayer(); }

  function renderPlayer() {
    const root = document.getElementById("bkPlayerApp"); if (!root) return;
    const d = PL.me, s = PL.game, isHe = d ? d.lang !== "en" : true, T = (h, e) => isHe ? h : e;
    document.documentElement.setAttribute("dir", isHe ? "rtl" : "ltr");
    if (!d) {
      root.innerHTML = `<div class="bkp-end"><div class="bkp-candle">🕯️</div><h2>${PL.gone === "offline" ? T("אין חיבור", "Offline") : T("המשחק הסתיים", "This game has ended")}</h2>
        <p>${T("הדף הזה היה זמני ונמחק. תודה ששיחקת!", "This page was temporary and has been removed. Thanks for playing!")}</p></div>`;
      return;
    }
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
      ${!PL.alerts ? `<button type="button" class="bkp-enable" onclick="window.BKLive.enableAlerts()">${T("הפעל התראות — תדע מיד כשמישהו מואשם", "Turn on alerts — know at once when someone is accused")}</button>` : ""}
      ${s && s.phase === "lobby" ? `<div class="bkp-notice">⏳ ${T("ממתינים שכולם יצטרפו. בינתיים אפשר להציץ בתפקיד שלך ובתפקידים שבמשחק (📜).", "Waiting for everyone to join. Meanwhile, peek at your role and the roles in this game (📜).")}</div>` : ""}
      ${s && s.phase === "night" ? `<div class="bkp-night">🌙 ${T("לילה — עצמו עיניים. המידע שלך יופיע כאן.", "Night — eyes closed. Your info will appear here.")}</div>` : ""}
      ${s && s.notice ? `<div class="bkp-notice">📣 ${esc(s.notice.text)}</div>` : ""}

      ${nom && (nom.open || nom.result) ? `<section class="bkp-card bkp-nom${nom.open ? " open" : ""}">
        <div class="bkp-nom-who"><span>${esc(nom.byName)}</span><i>${T("מאשים את", "accuses")}</i><b>${esc(nom.onName)}</b></div>
        ${nom.open ? `
          ${amAccused ? `<label class="bkp-lbl">${T("ההגנה שלך — כולם יראו אותה", "Your defence — everyone sees it")}</label>
            <div class="bkp-row"><input id="bkpDefense" type="text" maxlength="600" placeholder="${T("למה זה לא אני…", "Why it isn't me…")}"><button type="button" class="bkp-btn" onclick="window.BKLive.playerDefend()">${T("שלח", "Send")}</button></div>` : ""}
          ${canVote ? `<div class="bkp-vote">
              <button type="button" class="yes${myVote === "yes" ? " on" : ""}" onclick="window.BKLive.playerVote('yes')">✋ ${T("בעד הוצאה להורג", "Execute")}</button>
              <button type="button" class="no${myVote === "no" ? " on" : ""}" onclick="window.BKLive.playerVote('no')">${T("נגד", "Against")}</button></div>
            ${!alive ? `<p class="bkp-hint">${T("אתה מת — נשארה לך הצבעה אחת. הצבעה \"בעד\" משתמשת בה.", "You are dead — you have one vote left. Voting \"for\" uses it.")}</p>` : ""}`
          : `<p class="bkp-hint">${T("אין לך הצבעות שנשארו.", "You have no votes left.")}</p>`}
          <p class="bkp-hint">${T("אפשר גם להרים יד ליד השולחן — מספר הסיפורים יסמן.", "You can also raise your hand at the table — the storyteller will mark it.")}</p>`
        : `<p class="bkp-result">${nom.result === "executed" ? T("הוצא להורג", "Executed") : T("ניצל", "Spared")} · ${nom.yes || 0} ${T("קולות", "votes")}</p>`}
      </section>` : ""}

      <section class="bkp-card bkp-role${PL.reveal ? " open" : ""}">
        <button type="button" class="bkp-reveal" onclick="window.BKLive.toggleReveal()">${PL.reveal ? T("הסתר את התפקיד שלי", "Hide my role") : T("הצג את התפקיד שלי", "Show my role")}</button>
        ${PL.reveal ? `<div class="bkp-role-body">
          <div class="bkp-seat">${T("מושב", "Seat")} ${d.seat} · ${esc(d.name)}${alive ? "" : " · " + T("מת", "dead")}</div>
          <div class="bkp-icon">${d.icon || "🎭"}</div>
          <h2>${esc(name)}</h2>
          <div class="bkp-pills"><span class="${esc(d.type)}">${esc(String(d.type || "").toUpperCase())}</span><span class="${esc(d.alignment)}">${d.alignment === "evil" ? T("רעים", "Evil") : T("טובים", "Good")}</span></div>
          <p class="bkp-ability">${esc(ability)}</p>
          ${d.info ? `<div class="bkp-info"><small>${T("המידע האחרון שלך", "Your latest info")}</small><p>${esc(d.info)}</p></div>` : ""}
          ${log.length > 1 ? `<details class="bkp-log"><summary>${T("כל המידע שקיבלת", "Everything you were told")} (${log.length})</summary>${log.map(x => `<div><small>${esc(x.label)}</small><p>${esc(x.text)}</p></div>`).join("")}</details>` : ""}
        </div>` : `<p class="bkp-hint">${T("מוסתר — כדי ששכנים לא יראו.", "Hidden — so your neighbours can't see.")}</p>`}
      </section>

      ${s && s.seats ? `<section class="bkp-card"><h3>${T("העיירה", "The town")}</h3>
        <div class="bkp-town">${s.seats.map(x => `<span class="${x.alive ? "" : "dead"}${x.seat === d.seat ? " me" : ""}"><i>${x.seat}</i>${esc(x.name)}${x.alive ? "" : (x.ghost ? " 👻" : " ✝")}</span>`).join("")}</div></section>` : ""}

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
        <div class="bk-group-list">${ps.map(p => `<span class="${ST.taken[p.seat] ? "on" : ""}">${p.seat}. ${esc(p.name)}${ST.taken[p.seat] ? ` ✓ <button type="button" data-free="${p.seat}" title="${tr("שחרר מושב", "Free seat")}">↺</button>` : ""}</span>`).join("")}</div>
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
      drawQr(g.join);
    };
    GS.draw = draw; draw();
    await attach();   // also starts watching who joined
  }
  function redrawGroup() { if (document.getElementById("bkGroup") && GS.draw) GS.draw(); }

  // QR code (qrcodejs from cdnjs, loaded the first time it's needed)
  let qrLib = null;
  function drawQr(text) {
    const box = document.getElementById("bkQr"); if (!box) return;
    qrLib = qrLib || new Promise((ok, bad) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
    if (box.dataset.for === text && box.firstChild) return;
    box.dataset.for = text;
    qrLib.then(() => { box.innerHTML = ""; new window.QRCode(box, { text, width: 180, height: 180, colorDark: "#1a0f08", colorLight: "#f3e7cb", correctLevel: window.QRCode.CorrectLevel.M }); }).catch(() => { box.remove(); });
  }

  // Player side of the group link: …/Bootkeh/?g=<game>&join=1
  const LB = { gid: null, sel: null, taken: {}, busy: false, game: null };
  async function openLobby(gid) {
    LB.gid = gid;
    try { const k = localStorage.getItem("bk_seat_" + gid); if (k) { location.replace(location.pathname + `?g=${gid}&k=${k}`); return; } } catch (e) {}
    document.body.classList.add("bkp-mode");
    let root = document.getElementById("bkPlayerApp");
    if (!root) { root = document.createElement("div"); root.id = "bkPlayerApp"; root.className = "bkp"; document.body.appendChild(root); }
    root.innerHTML = `<div class="bkp-load">…</div>`;
    if (!C()) return;
    await C().watchGame(gid, st => { LB.game = st; drawLobby(); });
    await C().watchTaken(gid, t => { LB.taken = Object.assign({}, t); if (LB.sel && t[LB.sel] && !LB.busy) LB.sel = null; drawLobby(); });
  }
  function drawLobby() {
    const root = document.getElementById("bkPlayerApp"); if (!root) return;
    const s = LB.game, isHe = s ? s.lang !== "en" : true, T = (h, e) => isHe ? h : e;
    document.documentElement.setAttribute("dir", isHe ? "rtl" : "ltr");
    if (!s) { root.innerHTML = `<div class="bkp-end"><div class="bkp-candle">🕯️</div><h2>${T("המשחק הסתיים", "This game has ended")}</h2><p>${T("הקישור כבר לא פעיל.", "This link is no longer active.")}</p></div>`; return; }
    const free = (s.seats || []).filter(x => !LB.taken[x.seat]).length;
    root.innerHTML = `<header class="bkp-top"><div><small>${esc(s.title || "")}</small><b>${T("מי אתה?", "Who are you?")}</b></div>
        <button type="button" class="bkp-bell" onclick="window.BKLive.openRoles()" aria-label="${T("התפקידים במשחק", "Roles in this game")}" title="${T("התפקידים במשחק", "Roles in this game")}">📜</button></header>
      <div class="bkp-notice">${T(`${free} מקומות פנויים · השמות שנלקחו מתעדכנים בזמן אמת`, `${free} seats free · taken names update live`)}</div>
      <p class="bkp-hint">${T("לחץ על השם שלך. אחרי זה המושב ננעל לטלפון הזה ותקבל רק את התפקיד שלך.", "Tap your name. The seat then locks to this phone and you'll see only your own role.")}</p>
      <div class="bkp-pick">${(s.seats || []).map(x => `<button type="button" class="${LB.sel === x.seat ? "sel" : ""}${LB.taken[x.seat] ? " taken" : ""}" data-seat="${x.seat}"${LB.taken[x.seat] ? " disabled" : ""}>
        <i>${x.seat}</i><span>${esc(x.name)}</span>${LB.taken[x.seat] ? `<small>${T("תפוס", "taken")}</small>` : ""}</button>`).join("")}</div>
      ${LB.sel ? `<button type="button" class="bkp-reveal" id="bkpClaim"${LB.busy ? " disabled" : ""}>${LB.busy ? "…" : T("כן, זה אני — ", "Yes, that's me — ") + esc(((s.seats || []).find(x => x.seat === LB.sel) || {}).name || "")}</button>` : ""}
      <p class="bkp-hint" id="bkpLobbyMsg">${esc(LB.msg || "")}</p>`;
    root.querySelectorAll("[data-seat]").forEach(b => b.onclick = () => { LB.sel = +b.dataset.seat; LB.msg = ""; drawLobby(); });
    const go = document.getElementById("bkpClaim");
    if (go) go.onclick = async () => {
      LB.busy = true; drawLobby();
      try {
        const k = await C().claimSeat(LB.gid, LB.sel);
        try { localStorage.setItem("bk_seat_" + LB.gid, k); } catch (e) {}
        location.replace(location.pathname + `?g=${LB.gid}&k=${k}`);
      } catch (e) {
        LB.taken[LB.sel] = true; LB.sel = null; LB.busy = false;
        LB.msg = T("המושב הזה כבר נלקח. אם זה אתה — בקש ממספר הסיפורים לשחרר אותו.", "That seat is already taken. If it's yours, ask the storyteller to free it.");
        drawLobby();
      }
    };
  }

  window.BKLive = { groupSend, openLobby, startFlow, toggleDeath, announceDawn, openRoles, closeRoles, attach, render, syncSeats, setPhase, announce, openNom, toggleHand, closeNom, sendNight, draft: (seat, v) => { ST.draft[seat] = v; },
    openPlayer, enableAlerts, playerVote, playerDefend, toggleReveal };
})();
