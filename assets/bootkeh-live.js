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
    if (st.phase === "night") return (H ? "לילה " : "Night ") + st.day;
    if (st.phase === "nominate") return (H ? "יום " : "Day ") + st.day + (H ? " · האשמות" : " · Accusations");
    return (H ? "יום " : "Day ") + st.day + (H ? " · דיון" : " · Discussion");
  };
  const needed = st => Math.ceil(((st && st.seats) || []).filter(s => s.alive).length / 2);

  // =============================================================================================
  // Storyteller
  // =============================================================================================
  const ST = { game: null, players: {}, unGame: null, unPlayers: null, gid: null, draft: {} };

  // Start listening to the live game made on this device (called when the Game tab is shown).
  async function attach() {
    const g = B() && B().liveGame && B().liveGame();
    if (!g) { ST.gid = null; render(); return; }
    if (ST.gid === g.gameId) { render(); return; }
    ST.gid = g.gameId;
    try {
      if (ST.unGame) ST.unGame(); if (ST.unPlayers) ST.unPlayers();
      ST.unGame = await C().watchGame(g.gameId, s => { ST.game = s; render(); });
      ST.unPlayers = await C().watchPlayers(g.gameId, ps => { ST.players = ps; render(); });
    } catch (e) { console.warn(e); }
  }

  const key = seat => { const g = B().liveGame(); return g && g.keys[seat]; };
  const players = () => (B()._state.players || []);
  const seatsFromLocal = () => players().map(p => ({ seat: p.seat, name: p.name, alive: p.isAlive !== false, ghost: p.ghost !== false }));

  // Keep the shared "who is alive" list in step with the board (called after a seat is marked alive/dead).
  async function syncSeats() {
    if (!ST.gid) return;
    try { await C().setState(ST.gid, { seats: seatsFromLocal() }); } catch (e) { console.warn(e); }
  }

  // Night 1 → Day 1 → (accusations) → Night 2 → Day 2 … ; going back to night from a day moves to the next night.
  async function setPhase(phase) {
    ST.msg = "";
    const st = ST.game || {}, from = st.phase || "night";
    let day = st.day || 1;
    if (phase === "night" && from !== "night") day += 1;
    const patch = { phase, day };
    if (phase === "night") patch.nom = null;
    await C().setState(ST.gid, patch);
  }

  async function announce() {
    const ta = document.getElementById("bkLiveNotice"); const text = ta && ta.value.trim(); if (!text) return;
    await C().setState(ST.gid, { notice: { id: "n" + Date.now(), text: text.slice(0, 300) } });
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

  // Close the vote. execute=true kills the accused (and spends ghost votes of dead "for" voters).
  async function closeNom(execute) {
    const st = ST.game || {}, nom = st.nom; if (!nom) return;
    const t = tally(), seats = (st.seats || []).map(s => Object.assign({}, s));
    for (const s of seats) if (!s.alive && t.yes.includes(s.seat)) s.ghost = false;
    if (execute) { const s = seats.find(x => x.seat === nom.on); if (s) s.alive = false; }
    // mirror on the local board
    for (const p of players()) { const s = seats.find(x => x.seat === p.seat); if (s) { p.isAlive = s.alive; p.ghost = s.ghost; } }
    B().renderBoardView && B().renderBoardView();
    await C().setState(ST.gid, { seats, nom: Object.assign({}, nom, { open: false, yes: t.yes.length, result: execute ? "executed" : "spared" }) });
  }

  // Night composer: one text per player, then send all at once.
  function nightDefault(p) {
    const st = ST.game || {};
    if (p.isAlive === false) return tr(`אתה מת. אתה עדיין משתתף בדיון ויש לך הצבעה אחת אחרונה.`, `You are dead. You still talk, and you have one last vote.`);
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
    ST.draft = {};
    ST.msg = tr(`✓ נשלח ל־${items.length} שחקנים · ${label}`, `✓ Sent to ${items.length} players · ${label}`); render();
    if (toWhatsapp && B().sendAllWhatsapp) B().sendAllWhatsapp({ night: label, items: items.map(i => ({ seat: players().find(p => key(p.seat) === i.key).seat, text: i.text })) });
  }

  function render() {
    const box = document.getElementById("bkLivePanel"); if (!box) return;
    const g = B() && B().liveGame && B().liveGame();
    if (!g) {
      box.innerHTML = `<div class="bk-lp bk-lp-empty"><b>${tr("משחק חי בטלפונים", "Live game on everyone's phone")}</b>
        <p>${tr("צור דפים פרטיים לשחקנים (בלשונית השליחה) — ומכאן תנהל את השלבים, ההאשמות, ההצבעות ומידע הלילה, וכל השחקנים יקבלו הכול בזמן אמת.", "Create the private player pages (in the Send tab) — then run phases, accusations, votes and night info from here, live on every phone.")}</p>
        <button type="button" class="bk-btn pri" onclick="window.Bootkeh.setTab('cards')">${tr("ליצירת דפים פרטיים", "Create private pages")}</button></div>`;
      return;
    }
    const st = ST.game; if (!st) { box.innerHTML = `<div class="bk-lp">${tr("מתחבר…", "Connecting…")}</div>`; return; }
    const seats = st.seats || [], alive = seats.filter(s => s.alive), nom = st.nom, t = tally();
    const online = Object.values(ST.players).filter(p => p.vote || p.defense).length;
    const opt = (list, sel) => list.map(s => `<option value="${s.seat}"${sel === s.seat ? " selected" : ""}>${s.seat} · ${esc(s.name)}</option>`).join("");
    const phases = [["night", tr("לילה", "Night")], ["day", tr("יום", "Day")], ["nominate", tr("האשמות", "Accuse")]];
    box.innerHTML = `<div class="bk-lp">
      <div class="bk-lp-head"><div><small>${tr("משחק חי", "Live game")}</small><b>${esc(phaseName(st, he()))}</b></div>
        <div class="bk-seg">${phases.map(([k, n]) => `<button type="button" class="${st.phase === k ? "on" : ""}" onclick="window.BKLive.setPhase('${k}')">${n}</button>`).join("")}</div></div>
      <div class="bk-lp-stats"><span>${alive.length}/${seats.length} ${tr("חיים", "alive")}</span><span>${tr("נדרשים להוצאה להורג:", "Votes to execute:")} ${needed(st)}</span></div>

      ${st.phase === "nominate" ? `<section class="bk-lp-sec"><h4>${tr("האשמה", "Accusation")}</h4>
        ${nom && nom.open ? `
          <div class="bk-nom"><span>${esc(nom.byName)}</span><i>${tr("מאשים את", "accuses")}</i><b>${esc(nom.onName)}</b></div>
          ${ST.players[nom.on] && ST.players[nom.on].defense && ST.players[nom.on].defense.nom === nom.id ? `<blockquote>“${esc(ST.players[nom.on].defense.text)}”</blockquote>` : ""}
          <div class="bk-tally"><b>${t.yes.length}</b> ${tr("בעד", "for")} · ${t.no.length} ${tr("נגד", "against")} · ${tr("צריך", "need")} ${needed(st)}</div>
          <p class="bk-hint">${tr("שחקנים מצביעים בדף שלהם. מי שהרים יד ליד השולחן — לחץ עליו (לחיצה: בעד → נגד → כלום).", "Players vote on their page. For hands raised at the table, tap a seat (tap: for → against → clear).")}</p>
          <div class="bk-votes">${seats.filter(s => s.alive || s.ghost).map(s => { const y = t.yes.includes(s.seat), n = t.no.includes(s.seat);
            return `<button type="button" class="${y ? "yes" : n ? "no" : ""}${s.alive ? "" : " ghost"}" onclick="window.BKLive.toggleHand(${s.seat})">${s.seat} ${esc(s.name)}${s.alive ? "" : " 👻"}</button>`; }).join("")}</div>
          <div class="bk-row"><button type="button" class="bk-btn pri" onclick="window.BKLive.closeNom(true)">${tr("הוצא להורג", "Execute")}</button>
            <button type="button" class="bk-btn" onclick="window.BKLive.closeNom(false)">${tr("לא הוצא להורג", "Spare")}</button></div>`
        : `${nom && nom.result ? `<p class="bk-hint">${esc(nom.onName)}: ${nom.result === "executed" ? tr("הוצא להורג", "executed") : tr("ניצל", "spared")} (${nom.yes} ${tr("קולות", "votes")})</p>` : ""}
          <div class="bk-row"><label>${tr("מאשים", "By")}<select id="bkNomBy">${opt(alive)}</select></label>
            <label>${tr("מואשם", "Accused")}<select id="bkNomOn">${opt(seats)}</select></label></div>
          <button type="button" class="bk-btn pri bk-wide" onclick="window.BKLive.openNom()">${tr("פתח האשמה — כולם יקבלו התראה", "Open accusation — everyone gets an alert")}</button>`}
      </section>` : ""}

      ${st.phase === "night" ? `<section class="bk-lp-sec"><h4>${tr("מידע ללילה", "Night info")} — ${esc(phaseName(st, he()))}</h4>
        <p class="bk-hint">${tr("כתוב לכל שחקן מה הוא לומד הלילה. ריק = לא נשלח. אחרי \"שלח לכולם\" זה מופיע אצלם מיד (והישן נשמר בהיסטוריה שלהם).", "Write what each player learns tonight. Empty = not sent. After \"Send to all\" it appears on their page at once (older info stays in their history).")}</p>
        <div class="bk-night">${players().slice().sort((a, b) => (b.isAlive !== false) - (a.isAlive !== false) || a.seat - b.seat).map(p => {
          const r = p.role || {}; const v = ST.draft[p.seat] != null ? ST.draft[p.seat] : nightDefault(p);
          return `<label class="${p.isAlive === false ? "dead" : ""}"><span><b>${p.seat} · ${esc(p.name)}</b> <small>${r.icon || ""} ${esc(he() ? r.name_he : r.name_en)}${p.isAlive === false ? " · " + tr("מת", "dead") : ""}</small></span>
            <textarea id="bkNight-${p.seat}" rows="2" oninput="window.BKLive.draft(${p.seat}, this.value)" placeholder="${tr("מה הוא לומד הלילה…", "What they learn tonight…")}">${esc(v)}</textarea></label>`;
        }).join("")}</div>
        <div class="bk-row"><button type="button" class="bk-btn pri" onclick="window.BKLive.sendNight(false)">${tr("שלח לכולם לדף שלהם", "Send to everyone's page")}</button>
          <button type="button" class="bk-btn" onclick="window.BKLive.sendNight(true)">${tr("שלח וגם ב־WhatsApp", "Send + WhatsApp")}</button></div>
        <div id="bkNightMsg" class="bk-hint">${esc(ST.msg || "")}</div>
      </section>` : ""}

      <section class="bk-lp-sec"><h4>${tr("הודעה לכולם", "Announcement")}</h4>
        <div class="bk-row"><input id="bkLiveNotice" type="text" maxlength="300" placeholder="${tr("למשל: עוד 2 דקות להצבעה", "e.g. 2 minutes to the vote")}">
          <button type="button" class="bk-btn" onclick="window.BKLive.announce()">${tr("שלח", "Send")}</button></div>
        ${st.notice ? `<p class="bk-hint">${tr("אחרונה:", "Last:")} ${esc(st.notice.text)}</p>` : ""}
      </section>
    </div>`;
  }

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
        <button type="button" class="bkp-bell${PL.alerts ? " on" : ""}" onclick="window.BKLive.enableAlerts()" aria-label="${T("התראות", "Alerts")}">${PL.alerts ? "🔔" : "🔕"}</button>
      </header>
      ${!PL.alerts ? `<button type="button" class="bkp-enable" onclick="window.BKLive.enableAlerts()">${T("הפעל התראות — תדע מיד כשמישהו מואשם", "Turn on alerts — know at once when someone is accused")}</button>` : ""}
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

  window.BKLive = { attach, render, syncSeats, setPhase, announce, openNom, toggleHand, closeNom, sendNight, draft: (seat, v) => { ST.draft[seat] = v; },
    openPlayer, enableAlerts, playerVote, playerDefend, toggleReveal };
})();
