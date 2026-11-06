// assets/bootkeh.js — Blood on the Clocktower Game Generator & Assistant
// Bilingual (Hebrew & English) for roeetal.com/Bootkeh

(function () {
  "use strict";

  // State
  const state = {
    lang: localStorage.getItem("bootkeh_lang") || "he",
    activeTab: "setup", // "setup" | "board" | "sheet" | "cards"
    playerCount: 8,
    scriptId: "crimson_guard",
    themeId: "victorian_1800",
    customThemeTitle: "",
    customThemeDesc: "",
    storytellerName: "רועי / Sit",
    customRoles: [],
    roleSearchQuery: "",
    roleFilterCat: "all",
    curtainOpen: false,
    players: [],
    savedPlayers: [],
    roster: Array(15).fill(null).map((_, i) => ({ name: "", phone: "" })),
    isStorytellerView: true,
    timer: {
      mode: "auto", // "auto" | "manual"
      phase: "day", // "day" | "nomination" | "night"
      secondsLeft: 300,
      isRunning: false,
      dayNumber: 1,
      intervalId: null
    }
  };

  // Translations dictionary
  const T = {
    he: {
      siteTitle: "בוטקה — דם על מגדל השעון",
      tabSetup: "הכנת משחק",
      tabBoard: "מעגל הישיבה",
      tabSheet: "דף תפקידים",
      tabCards: "שליחה לשחקנים",
      savedPlayersBtn: "שחקנים שמורים",
      langToggle: "English",
      setupTitle: "הגדרות משחק חדש",
      playerCountLabel: "מספר שחקנים:",
      distribution: "חלוקת תפקידים:",
      townsfolk: "תושבי העיירה",
      outsiders: "אאוטסיידרים",
      minions: "משרתים",
      demons: "שדים",
      scriptPresetLabel: "סט תפקידים (Script):",
      themeLabel: "תמה ועולם המשחק (Thematic Flavor):",
      customThemeLabel: "או תמה חופשית משלך:",
      storytellerLabel: "שם מספר הסיפורים (Storyteller):",
      advancedSettings: "הגדרות מתקדמות — בחירת תפקידים ידנית",
      playerRosterLabel: "שמות השחקנים וטלפון (להודעות WhatsApp):",
      generateBtn: "חלק תפקידים",
      seatToggleStoryteller: "הצג תפקידים",
      seatToggleSpectator: "הסתר תפקידים",
      timerDay: "דיון",
      timerNomination: "מינויים והוצאה להורג",
      timerNight: "לילה",
      timerStart: "▶ הפעל טיימר",
      timerPause: "⏸ השהה",
      timerReset: "↺ איפוס",
      timerAddMin: "＋ 1 דקה",
      nextPhase: "השלב הבא",
      printSheet: "הדפסה / PDF",
      shareWhatsapp: "שלח ב־WhatsApp",
      copySecret: "העתק",
      secretRevealed: "לחץ להסתרת התפקיד",
      secretHidden: "לחץ לחשיפת התפקיד",
      firstNightTitle: "מידע התחלתי ללילה ראשון:",
      abilityTitle: "יכולת הדמות:",
      alive: "חי",
      dead: "מת",
      ghostVote: "קול רפאים זמין",
      savePlayerSuccess: "השחקן נשמר",
      whatsappSent: "WhatsApp נפתח",
      copySuccess: "הועתק",
      addSavedPlayer: "＋ הוסף שחקן שמור",
      savedPlayersTitle: "ספר השחקנים השמורים (לשליחה מהירה ב-WhatsApp)",
      namePlaceholder: "שם שחקן",
      phonePlaceholder: "טלפון (למשל: 054-1234567)"
    },
    en: {
      siteTitle: "Bootkeh — Blood on the Clocktower",
      tabSetup: "Setup",
      tabBoard: "Seating",
      tabSheet: "Character sheet",
      tabCards: "Send to players",
      savedPlayersBtn: "Saved players",
      langToggle: "עברית",
      setupTitle: "New Game Setup",
      playerCountLabel: "Player Count:",
      distribution: "Character Distribution:",
      townsfolk: "Townsfolk",
      outsiders: "Outsiders",
      minions: "Minions",
      demons: "Demons",
      scriptPresetLabel: "Script / Edition:",
      themeLabel: "Thematic Flavor / Setting:",
      customThemeLabel: "Or Enter Custom Setting:",
      storytellerLabel: "Storyteller Name:",
      advancedSettings: "Advanced — pick roles by hand",
      playerRosterLabel: "Player Names & Phone (for WhatsApp sharing):",
      generateBtn: "Deal roles",
      seatToggleStoryteller: "Show roles",
      seatToggleSpectator: "Hide roles",
      timerDay: "Discussion",
      timerNomination: "Nominations",
      timerNight: "Night",
      timerStart: "▶ Start Timer",
      timerPause: "⏸ Pause",
      timerReset: "↺ Reset",
      timerAddMin: "＋ 1 Min",
      nextPhase: "Next phase",
      printSheet: "Print / PDF",
      shareWhatsapp: "Send on WhatsApp",
      copySecret: "Copy",
      secretRevealed: "Click to hide secret role",
      secretHidden: "Click to reveal the role",
      firstNightTitle: "First Night Starting Info:",
      abilityTitle: "Character Ability:",
      alive: "Alive",
      dead: "Dead",
      ghostVote: "Ghost vote available",
      savePlayerSuccess: "Player saved",
      whatsappSent: "WhatsApp opened",
      copySuccess: "Copied",
      addSavedPlayer: "＋ Add Saved Player",
      savedPlayersTitle: "Saved Players Directory (Fast WhatsApp Sharing)",
      namePlaceholder: "Player Name",
      phonePlaceholder: "Phone (e.g. +972 54 123 4567)"
    }
  };

  // Helper selectors
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Web Audio Synthesizer for Gongs and Bells
  const SoundFX = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
    },
    playGong() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 1.8);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 2.5);
      } catch (_) {}
    },
    playDayBell() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0.4, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.2);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 1.2);
        });
      } catch (_) {}
    },
    playTick() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } catch (_) {}
    }
  };

  // --- Personal Player Secret View (הדף הסודי של השחקן שנפתח מה-WhatsApp) ---
  function openPlayerPortal(playerId) {
    // Hide main app navigation and views
    const topbar = $(".bootkeh-topbar");
    const nav = $(".bootkeh-nav-tabs");
    const main = $(".bootkeh-main");
    if (topbar) topbar.style.display = "none";
    if (nav) nav.style.display = "none";
    if (main) main.style.display = "none";

    const portal = $("#playerPortalView");
    if (!portal) return;
    portal.style.display = "flex";

    // Decode session from hash if available
    let player = state.players.find(p => p.id === playerId);
    if (!player && window.location.hash) {
      try {
        const hashStr = window.location.hash.substring(1);
        const match = hashStr.match(/s=([A-Za-z0-9+/=]+)/);
        if (match) {
          const decoded = JSON.parse(atob(match[1]));
          const role = getRole(decoded.roleId) || getRole("empath");
          player = {
            id: playerId,
            seat: decoded.seat,
            name: decoded.name,
            roleId: decoded.roleId,
            role,
            alignment: decoded.alignment,
            firstNightInfo: decoded.info
          };
        }
      } catch (_) {}
    }

    if (!player) {
      player = state.players[0] || {
        seat: 1,
        name: "שחקן 1",
        role: getRole("empath"),
        alignment: "good",
        firstNightInfo: "אין מידע התחלתי מיוחד הלילה."
      };
    }

    const r = player.role || getRole("empath");
    const roleName = state.lang === "he" ? r.name_he : r.name_en;
    const ability = state.lang === "he" ? r.ability_he : r.ability_en;
    const team = player.alignment === "evil" ? (state.lang === "he" ? "רעים 😈" : "Evil 😈") : (state.lang === "he" ? "טובים 🛡️" : "Good 🛡️");

    const badgeEl = $("#portalPlayerBadge");
    if (badgeEl) badgeEl.textContent = `${state.lang === "he" ? "מושב" : "Seat"} #${player.seat} · ${player.name}`;

    const iconEl = $("#portalRoleIcon");
    if (iconEl) iconEl.textContent = r.icon;

    const nameEl = $("#portalRoleName");
    if (nameEl) nameEl.textContent = roleName;

    const pillEl = $("#portalCategoryPill");
    if (pillEl) {
      pillEl.innerHTML = `
        <span class="bk-dist-pill ${r.type}">${r.type.toUpperCase()}</span>
        <span class="bk-dist-pill ${player.alignment}">${team}</span>
      `;
    }

    const abilityEl = $("#portalRoleAbility");
    if (abilityEl) abilityEl.textContent = ability;

    const fnEl = $("#portalFirstNight");
    if (fnEl) fnEl.textContent = player.firstNightInfo || (state.lang === "he" ? "אין מידע מיוחד בלילה הראשון. בהצלחה!" : "No special first-night info. Good luck!");

    // Initially show curtain overlay for privacy
    const curtain = $("#portalCurtain");
    if (curtain) curtain.style.display = "flex";
  }

  function toggleCurtain() {
    const curtain = $("#portalCurtain");
    if (!curtain) return;
    curtain.style.display = curtain.style.display === "none" ? "flex" : "none";
  }


  // --- Initialization ---
  // Phones: drag the page left / right to move between the main screens (Setup ↔ Board ↔ Roles ↔ Send), like the
  // Android home screen: the page follows the finger with the next screen sliding in beside it, and on release it
  // glides to the next screen (a long enough or quick enough drag) or springs back.
  function attachSwipe() {
    const order = ["setup", "board", "sheet", "cards"], main = document.querySelector(".bootkeh-main"); if (!main) return;
    const NO = 'input[type="range"], textarea, .bk-role-filter-chips, .bk-themegen-cats, .bk-picked-group, .bk-no-swipe, .bootkeh-circle-container, .bk-votes';
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let g = null;   // the drag in progress
    const rtl = () => getComputedStyle(main).direction === "rtl";
    const viewOf = tab => document.getElementById("view-" + tab);
    // which screen comes in for a drag of dx (in RTL the next screen is on the left, so a drag to the right brings it)
    const targetFor = dx => { const i = order.indexOf(state.activeTab || "setup"), step = (dx < 0) !== rtl() ? 1 : -1; return order[i + step] || null; };
    const prep = tab => { if (tab === "board") renderBoardView(); if (tab === "sheet") renderSheetView(); };
    const setX = (el, x, anim) => { el.style.transition = anim ? "transform .32s cubic-bezier(.2,.8,.2,1)" : "none"; el.style.transform = `translate3d(${x}px,0,0)`; };

    function showPeek(tab) {
      if (g.peekTab === tab) return;
      if (g.peek) clearPeek(g.peek);
      g.peekTab = tab; g.peek = tab ? viewOf(tab) : null;
      if (!g.peek) return;
      prep(tab);
      const top = Math.max(0, window.scrollY - g.mainTop);   // show the top of the incoming screen where you are looking
      Object.assign(g.peek.style, { display: "block", position: "absolute", top: top + "px", left: g.padL + "px", right: g.padR + "px" });
      g.peek.classList.add("bk-peek"); g.peekTop = top;
    }
    function clearPeek(el) { el.classList.remove("bk-peek"); ["display", "position", "top", "left", "right", "transform", "transition"].forEach(k => el.style[k] = ""); }

    main.addEventListener("touchstart", e => {
      if (e.touches.length !== 1 || e.target.closest(NO) || document.body.classList.contains("bkp-mode")) { g = null; return; }
      const t = e.touches[0], cs = getComputedStyle(main);
      g = { x0: t.clientX, y0: t.clientY, dx: 0, lock: null, cur: viewOf(state.activeTab || "setup"), w: main.clientWidth, hist: [[Date.now(), t.clientX]],
            mainTop: main.getBoundingClientRect().top + window.scrollY, padL: parseFloat(cs.paddingLeft) || 0, padR: parseFloat(cs.paddingRight) || 0 };
    }, { passive: true });

    main.addEventListener("touchmove", e => {
      if (!g || !g.cur) return;
      const t = e.touches[0], dx = t.clientX - g.x0, dy = t.clientY - g.y0;
      if (!g.lock) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; g.lock = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y"; }
      if (g.lock !== "x") return;
      e.preventDefault();   // a sideways drag: don't scroll the page up/down meanwhile
      const tab = targetFor(dx);
      g.dx = tab ? dx : dx * 0.28;   // rubber band at the first / last screen
      g.hist.push([Date.now(), t.clientX]); if (g.hist.length > 6) g.hist.shift();
      showPeek(tab);
      setX(g.cur, g.dx, false);
      if (g.peek) setX(g.peek, g.dx - Math.sign(dx) * g.w, false);
    }, { passive: false });

    const end = () => {
      if (!g || g.lock !== "x") { g = null; return; }
      const d = g; g = null;
      const [t0, x0] = d.hist[0], [t1, x1] = d.hist[d.hist.length - 1], v = (x1 - x0) / Math.max(1, t1 - t0);   // px per ms
      const go = d.peek && ((Math.abs(d.dx) > d.w * 0.28 && Math.sign(v) !== -Math.sign(d.dx)) || (Math.abs(v) > 0.45 && Math.sign(v) === Math.sign(d.dx)));
      const done = () => {
        d.cur.style.transform = ""; d.cur.style.transition = "";
        if (go) {
          const peekTop = d.peekTop; clearPeek(d.peek);
          setTab(d.peekTab);
          // keep the incoming screen exactly where it was on the screen
          window.scrollTo({ top: peekTop > 0 ? d.mainTop : window.scrollY, behavior: "instant" });
          if (navigator.vibrate) navigator.vibrate(8);
        } else if (d.peek) clearPeek(d.peek);
      };
      if (reduce) { done(); return; }
      const dir = Math.sign(d.dx) || 1;
      setX(d.cur, go ? dir * d.w : 0, true);
      if (d.peek) setX(d.peek, go ? 0 : -dir * d.w, true);
      let fired = false; const fin = () => { if (fired) return; fired = true; done(); };
      d.cur.addEventListener("transitionend", fin, { once: true }); setTimeout(fin, 380);
    };
    main.addEventListener("touchend", end, { passive: true });
    main.addEventListener("touchcancel", end, { passive: true });
  }

  function init() {
    loadSavedPlayers();
    const slider = $("#playerCountSlider");
    if (slider) state.playerCount = parseInt(slider.value, 10) || state.playerCount;
    initThemeSelection();
    initCustomRolesMatrix();
    updateLanguage();
    renderSetupView();
    renderRosterInputs();
    renderThemeGen();
    renderPresets();
    attachEventListeners();
    attachSwipe();
    if (window.matchMedia && matchMedia("(max-width: 760px)").matches) { const rb = document.getElementById("bkRolesBox"); if (rb) rb.open = true; }
    generateGame(false); // prepare initial game data silently
    // a live game made on this device is still running: bring back that exact deal (same seats, roles and links)
    const liveSaved = window.BKCloud && window.BKCloud.saved();
    if (liveSaved && Array.isArray(liveSaved.players) && liveSaved.players.length) {
      state.players = liveSaved.players.map(x => Object.assign({}, x, { role: getRole(x.roleId) || getRole("empath") }));
      state.playerCount = state.players.length;
    }

    // Check if opening as player from WhatsApp link (?player=seat_1 or #p=seat_1)
    const urlParams = new URLSearchParams(window.location.search);
    const playerParam = urlParams.get("player") || urlParams.get("p");
    showVersion();
    if (urlParams.get("g") && urlParams.get("join") && window.BKLive) {
      window.BKLive.openLobby(urlParams.get("g"));   // the one link for the whole group
    } else if (urlParams.get("g") && urlParams.get("k")) {
      openLivePortal(urlParams.get("g"), urlParams.get("k"));
    } else if (playerParam) {
      openPlayerPortal(playerParam);
    } else {
      setTab("setup");     // start on Setup view as requested
      if (window.BKCloud && window.BKCloud.saved()) window.BKCloud.cleanup();   // delete this storyteller's expired games
    }
  }

  function loadSavedPlayers() {
    try {
      const s = localStorage.getItem("bootkeh_saved_players");
      state.savedPlayers = s ? JSON.parse(s) : [
        { id: "p1", name: "רועי / Roee", phone: "053-337-4350", notes: "Storyteller / Player" },
        { id: "p2", name: "דני / Dan", phone: "", notes: "Likes Minions" },
        { id: "p3", name: "שרה / Sarah", phone: "", notes: "Good investigator" },
        { id: "p4", name: "מיכאל / Mike", phone: "", notes: "Always bluffing" },
        { id: "p5", name: "עומר / Omer", phone: "", notes: "" },
        { id: "p6", name: "טל / Tal", phone: "", notes: "" },
        { id: "p7", name: "נועה / Noa", phone: "", notes: "" },
        { id: "p8", name: "יוסי / Yossi", phone: "", notes: "" },
        { id: "p9", name: "איתי / Itay", phone: "", notes: "" },
        { id: "p10", name: "יעל / Yael", phone: "", notes: "" },
        { id: "p11", name: "מאיה / Maya", phone: "", notes: "" },
        { id: "p12", name: "אור / Or", phone: "", notes: "" },
        { id: "p13", name: "גיא / Guy", phone: "", notes: "" },
        { id: "p14", name: "שירה / Shira", phone: "", notes: "" },
        { id: "p15", name: "עדי / Adi", phone: "", notes: "" }
      ];
    } catch (_) {
      state.savedPlayers = [];
    }

    // Initialize roster up to 15 items
    for (let i = 0; i < 15; i++) {
      if (state.savedPlayers[i]) {
        state.roster[i] = {
          name: state.savedPlayers[i].name,
          phone: state.savedPlayers[i].phone || ""
        };
      } else {
        state.roster[i] = {
          name: `${state.lang === "he" ? "שחקן" : "Player"} ${i + 1}`,
          phone: ""
        };
      }
    }
  }

  function saveSavedPlayers() {
    try {
      localStorage.setItem("bootkeh_saved_players", JSON.stringify(state.savedPlayers));
    } catch (_) {}
  }

  function updateLanguage() {
    document.documentElement.setAttribute("dir", state.lang === "he" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", state.lang);
    localStorage.setItem("bootkeh_lang", state.lang);
    renderSetupView();
    renderBoardView();
    renderSheetView();
    renderCardsView();
    renderThemeGen();
  }

  function toggleLanguage() {
    state.lang = state.lang === "he" ? "en" : "he";
    updateLanguage();
  }

  function setTab(tab) {
    state.activeTab = tab;
    $$(".bootkeh-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tab);
    });
    $$(".bootkeh-view").forEach(v => {
      v.classList.toggle("active", v.id === `view-${tab}`);
    });
    if (tab === "board") { renderBoardView(); if (window.BKLive) window.BKLive.attach(); }
    if (tab === "sheet") renderSheetView();
    if (tab === "cards") renderCardsView();
  }

  // --- Role Lookup Helper ---
  function getRole(id) {
    return (window.BOOTKEH_ROLES || []).find(r => r.id === id) || null;
  }

  function getScript(id) {
    return (window.BOOTKEH_SCRIPTS || {})[id] || null;
  }

  function getTheme(id) {
    return (window.BOOTKEH_THEMES || []).find(t => t.id === id) || null;
  }

  // --- Dynamic Player Roster (Up to 15 Players) ---
  function renderRosterInputs() {
    const container = $("#playerRosterInputs");
    if (!container) return;

    const count = parseInt(state.playerCount, 10) || 8;

    const valEl = $("#rosterCountVal");
    if (valEl) valEl.textContent = `${count}`;

    const summaryEl = $("#rosterCountSummary");
    if (summaryEl) {
      if (state.lang === "he") {
        summaryEl.innerHTML = `<b style="color:var(--bk-gold-light);">${count}</b> מושבים. הטלפון משמש לשליחת התפקיד ב־WhatsApp.`;
      } else {
        summaryEl.innerHTML = `<b style="color:var(--bk-gold-light);">${count}</b> seats. The phone is used to send the role on WhatsApp.`;
      }
    }

    let html = "";
    for (let i = 0; i < count; i++) {
      const item = state.roster[i] || { name: "", phone: "" };
      const placeholderName = state.lang === "he" ? `שחקן ${i + 1}` : `Player ${i + 1}`;
      const placeholderPhone = state.lang === "he" ? "טלפון לווצאפ (05...)" : "Phone (05...)";

      const savedOptions = state.savedPlayers.map(sp => 
        `<option value="${sp.id}">${esc(sp.name)}</option>`
      ).join("");

      html += `
        <div class="bk-roster-row">
          <div class="bk-roster-seat">#${i + 1}</div>
          <input type="text" class="bk-input bk-roster-name-input" value="${esc(item.name)}" placeholder="${placeholderName}" oninput="window.Bootkeh.updateRosterItem(${i}, 'name', this.value)">
          <input type="text" class="bk-input bk-roster-phone-input" value="${esc(item.phone)}" placeholder="${placeholderPhone}" oninput="window.Bootkeh.updateRosterItem(${i}, 'phone', this.value)">
          <select class="bk-roster-quick-pick" onchange="window.Bootkeh.quickAssignRosterSeat(${i}, this.value)">
            <option value="">👤 ${state.lang === "he" ? "שמור..." : "Saved..."}</option>
            ${savedOptions}
          </select>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  function updateRosterItem(index, key, value) {
    if (!state.roster[index]) {
      state.roster[index] = { name: "", phone: "" };
    }
    state.roster[index][key] = value;
  }

  function quickAssignRosterSeat(index, savedPlayerId) {
    if (!savedPlayerId) return;
    const sp = state.savedPlayers.find(x => x.id === savedPlayerId);
    if (!sp) return;
    if (!state.roster[index]) {
      state.roster[index] = { name: "", phone: "" };
    }
    state.roster[index].name = sp.name;
    state.roster[index].phone = sp.phone || "";
    renderRosterInputs();
  }

  function autoFillRosterFromSaved() {
    const count = parseInt(state.playerCount, 10) || 8;
    for (let i = 0; i < count; i++) {
      if (state.savedPlayers[i]) {
        state.roster[i] = {
          name: state.savedPlayers[i].name,
          phone: state.savedPlayers[i].phone || ""
        };
      }
    }
    renderRosterInputs();
  }

  function clearRoster() {
    const count = parseInt(state.playerCount, 10) || 8;
    for (let i = 0; i < count; i++) {
      state.roster[i] = { name: "", phone: "" };
    }
    renderRosterInputs();
  }


  // --- Setup View Rendering ---
  function renderSetupView() {
    const t = T[state.lang];
    const dist = (window.BOOTKEH_PLAYER_DISTRIBUTION || {})[String(state.playerCount)] || { townsfolk: 5, outsiders: 1, minions: 1, demons: 1 };

    // Update player slider count
    const badge = $("#playerCountBadge");
    if (badge) badge.textContent = `${state.playerCount}`;

    // Update distribution badges
    const distBox = $("#distributionPills");
    if (distBox) {
      distBox.innerHTML = `
        <span class="bk-dist-pill townsfolk">💙 ${dist.townsfolk} ${t.townsfolk}</span>
        <span class="bk-dist-pill outsider">🏮 ${dist.outsiders} ${t.outsiders}</span>
        <span class="bk-dist-pill minion">👺 ${dist.minions} ${t.minions}</span>
        <span class="bk-dist-pill demon">😈 ${dist.demons} ${t.demons}</span>
      `;
    }

    renderRosterInputs();

    // Populate theme cards
    const themeGrid = $("#themeGrid");
    if (themeGrid) {
      themeGrid.innerHTML = (window.BOOTKEH_THEMES || []).map(th => `
        <div class="bk-theme-card ${state.themeId === th.id ? "active" : ""}" onclick="window.Bootkeh.setTheme('${th.id}')">
          <div class="bk-theme-title">${th.icon} ${state.lang === "he" ? th.title_he : th.title_en}</div>
          <div class="bk-theme-desc">${state.lang === "he" ? th.desc_he : th.desc_en}</div>
        </div>
      `).join("");
    }
  }

  function initThemeSelection() {
    state.themeId = "victorian_1800";
  }

  function initCustomRolesMatrix() {
    const matrix = $("#customRolesMatrix");
    if (!matrix) return;
    const allRoles = window.BOOTKEH_ROLES || [];
    const query = (state.roleSearchQuery || "").toLowerCase().trim();
    const filterCat = state.roleFilterCat || "all";

    const catMap = {
      townsfolk: { title_en: "Townsfolk", title_he: "תושבי העיירה", color: "#38bdf8" },
      outsider: { title_en: "Outsiders", title_he: "אאוטסיידרים", color: "#2dd4bf" },
      minion: { title_en: "Minions", title_he: "משרתים", color: "#fb923c" },
      demon: { title_en: "Demons", title_he: "שדים", color: "#ef4444" },
      traveller: { title_en: "Travellers (added by hand, not dealt)", title_he: "נוסעים (מוסיפים ידנית, לא מחולקים)", color: "#c084fc" },
      fabled: { title_en: "Fabled (Storyteller rules)", title_he: "אגדיים (חוקים למספר הסיפור)", color: "#facc15" }
    };

    const categories = filterCat === "all" ? ["townsfolk", "outsider", "minion", "demon", "traveller", "fabled"] : [filterCat];

    let html = "";
    let totalShown = 0;

    categories.forEach(cat => {
      let rolesInCat = allRoles.filter(r => r.type === cat);

      if (query) {
        rolesInCat = rolesInCat.filter(r => {
          const matchName = (r.name_he && r.name_he.toLowerCase().includes(query)) ||
                            (r.name_en && r.name_en.toLowerCase().includes(query)) ||
                            (r.id && r.id.toLowerCase().includes(query));
          const matchAbility = (r.ability_he && r.ability_he.toLowerCase().includes(query)) ||
                               (r.ability_en && r.ability_en.toLowerCase().includes(query));
          return matchName || matchAbility;
        });
      }

      totalShown += rolesInCat.length;

      if (rolesInCat.length > 0) {
        html += `
          <div class="bk-role-matrix-category">
            <div class="bk-role-matrix-title" style="color:${catMap[cat].color};">
              <span>${state.lang === "he" ? catMap[cat].title_he : catMap[cat].title_en}</span>
              <span style="font-size:11px;opacity:0.75;">(${rolesInCat.length})</span>
            </div>
            <div class="bk-role-chips">
              ${rolesInCat.map(r => {
                const isSelected = state.customRoles.includes(r.id);
                return `
                  <div class="bk-role-chip ${cat} ${isSelected ? 'selected' : ''}" id="chip-${r.id}" onclick="window.Bootkeh.toggleRoleSelection('${r.id}')" title="${esc(state.lang === 'he' ? r.ability_he : r.ability_en)}">
                    <span>${r.icon}</span>
                    <span>${esc(state.lang === "he" ? r.name_he : r.name_en)}</span>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }
    });

    if (totalShown === 0) {
      html = `<div style="text-align:center;padding:24px;color:var(--bk-text-muted);font-size:13px;">לא נמצאו תפקידים התואמים לחיפוש "${esc(query)}"</div>`;
    }

    matrix.innerHTML = html;
    renderPicked();
    const allChip = document.getElementById("chip-filter-all");
    if (allChip) allChip.textContent = (state.lang === "he" ? "הכל" : "All") + ` (${allRoles.length})`;
  }

  function onRoleSearch(val) {
    state.roleSearchQuery = val;
    initCustomRolesMatrix();
  }

  function setRoleFilterCat(cat) {
    state.roleFilterCat = cat;
    $$(".bk-role-filter-chip").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("id") === `chip-filter-${cat}`);
    });
    initCustomRolesMatrix();
  }

  function selectAllRoles() {
    const allRoles = window.BOOTKEH_ROLES || [];
    state.customRoles = allRoles.map(r => r.id);
    state.scriptId = "custom";
    const scriptSelect = $("#scriptSelect");
    if (scriptSelect) scriptSelect.value = "custom";
    initCustomRolesMatrix();
  }

  function deselectAllRoles() {
    state.customRoles = [];
    state.scriptId = "custom";
    const scriptSelect = $("#scriptSelect");
    if (scriptSelect) scriptSelect.value = "custom";
    initCustomRolesMatrix();
  }

  // The "picked roles" column: what is chosen so far, per kind, against what this player count needs.
  function renderPicked() {
    const box = document.getElementById("bkPicked"), cnt = document.getElementById("bkPickedCount"); if (!box) return;
    const he = state.lang === "he", n = parseInt(state.playerCount, 10) || 8;
    const d = (window.BOOTKEH_PLAYER_DISTRIBUTION || {})[String(n)] || { townsfolk: 5, outsiders: 1, minions: 1, demons: 1 };
    const picked = state.customRoles.map(getRole).filter(Boolean);
    const kinds = [["townsfolk", d.townsfolk, "תושבים", "Townsfolk"], ["outsider", d.outsiders, "אאוטסיידרים", "Outsiders"], ["minion", d.minions, "משרתים", "Minions"], ["demon", d.demons, "שדים", "Demons"]];
    const dealt = picked.filter(r => kinds.some(k => k[0] === r.type)).length;
    const short = kinds.filter(([k, need]) => picked.filter(r => r.type === k).length < need);
    if (cnt) cnt.textContent = picked.length ? `· ${he ? "נבחרו" : "picked"} ${picked.length}` : "";
    box.innerHTML = `<div class="bk-picked-top"><b>${he ? "נבחרו" : "Picked"} ${picked.length}</b>
        <span class="${short.length ? "warn" : "ok"}">${short.length ? (he ? "חסרים: " : "Missing: ") + short.map(k => he ? k[2] : k[3]).join(", ") : (he ? `מספיק ל־${n} שחקנים ✓` : `Enough for ${n} players ✓`)}</span></div>
      ${picked.length ? kinds.concat([["traveller", 0, "נוסעים", "Travellers"], ["fabled", 0, "אגדיים", "Fabled"]]).map(([k, need, h, e]) => {
        const rs = picked.filter(r => r.type === k); if (!rs.length) return "";
        return `<div class="bk-picked-group"><small class="${k}">${he ? h : e} ${rs.length}${need ? "/" + need : ""}</small>
          <div>${rs.map(r => `<button type="button" class="bk-picked-chip ${k}" onclick="window.Bootkeh.toggleRoleSelection('${r.id}')" title="${he ? "הסר" : "Remove"}">${r.icon} ${esc(he ? r.name_he : r.name_en)} <i>×</i></button>`).join("")}</div></div>`;
      }).join("") : `<p class="bk-picked-empty">${he ? "עוד לא נבחרו תפקידים. חפש ולחץ על תפקיד כדי להוסיף אותו — או “תפקידים אקראיים”." : "No roles picked yet. Search and tap a role to add it — or use Random roles."}</p>`}
      ${dealt && dealt < n ? `<p class="bk-picked-empty">${he ? `לחלוקה צריך לפחות ${n} תפקידים (חסרים ${n - dealt}).` : `Dealing needs at least ${n} roles (${n - dealt} more).`}</p>` : ""}`;
  }

  function updateCustomRoleChips() {
    renderPicked();
    const allRoles = window.BOOTKEH_ROLES || [];
    allRoles.forEach(r => {
      const chip = $(`#chip-${r.id}`);
      if (chip) {
        chip.classList.toggle("selected", state.customRoles.includes(r.id));
      }
    });
  }

  function toggleRoleSelection(roleId) {
    if (state.customRoles.includes(roleId)) {
      state.customRoles = state.customRoles.filter(id => id !== roleId);
    } else {
      state.customRoles.push(roleId);
    }
    state.scriptId = "custom";
    const scriptSelect = $("#scriptSelect");
    if (scriptSelect) scriptSelect.value = "custom";
    updateCustomRoleChips();
  }

  function setScript(scriptId) {
    state.scriptId = scriptId;
    if (scriptId !== "custom") {
      const script = getScript(scriptId);
      if (script && script.roles) {
        state.customRoles = [...script.roles];
      }
    }
    updateCustomRoleChips();
  }

  function setTheme(themeId) {
    state.themeId = themeId;
    renderSetupView();
  }

  // --- Thematic Scenario Generator ---
  function generateRandomTheme() {
    const gen = window.BOOTKEH_THEME_GENERATOR;
    if (!gen || !gen.eras || !gen.demon_threats) return;

    const randomEra = gen.eras[Math.floor(Math.random() * gen.eras.length)];
    const randomThreat = gen.demon_threats[Math.floor(Math.random() * gen.demon_threats.length)];

    state.themeId = "custom_random";
    state.customThemeTitle = state.lang === "he" ? `${randomEra.icon} ${randomEra.he}` : `${randomEra.icon} ${randomEra.en}`;
    state.customThemeDesc = state.lang === "he" ? `עולם המשחק: ${randomEra.he}. איום השד: ${randomThreat.he}.` : `Setting: ${randomEra.en}. Demon threat: ${randomThreat.en}.`;

    const input = $("#customThemeInput");
    if (input) input.value = state.customThemeTitle;

    renderSetupView();
    renderBoardView();
  }

  // ---- Theme generator (history / movies / RPG): shows a parchment with the world, the Demon, and an opening to read aloud
  function renderThemeGen() {
    const box = document.getElementById("bkThemeGen"); if (!box || !window.BKThemes) return;
    const he = state.lang === "he", fam = state.themeFam || "any", g = state.genTheme, L = g ? (he ? g.he : g.en) : null;
    const cats = [["any", he ? "הכול" : "Any"], ["history", he ? "היסטוריה" : "History"], ["movies", he ? "סרטים" : "Movies"], ["rpg", he ? "משחקי תפקידים" : "RPG"]];
    box.innerHTML = `
      <div class="bk-themegen-cats">${cats.map(([k, t]) => `<button type="button" class="bk-themegen-cat${fam === k ? " on" : ""}" onclick="window.Bootkeh.setThemeFam('${k}')">${t}</button>`).join("")}
        <button type="button" class="bk-btn sm pri" onclick="window.Bootkeh.genTheme()">${he ? "צור עולם" : "Create world"}</button></div>
      ${L ? `<div class="bk-scroll">
        <div class="bk-scroll-sub">${esc(he ? g.familyLabel.he : g.familyLabel.en)}</div>
        <h3>${g.icon} ${esc(L.title)}</h3>
        <p>${esc(L.setting)} ${esc(L.twist)}</p>
        <dl><dt>${he ? "העיירה" : "The town"}</dt><dd>${esc(L.town)}</dd><dt>${he ? "השד" : "The Demon"}</dt><dd>${esc(L.demon)}</dd><dt>${he ? "המשרתים" : "Minions"}</dt><dd>${esc(L.minions)}</dd></dl>
        <p><i>“${esc(L.opening)}”</i></p>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button type="button" class="bk-btn sm pri" onclick="window.Bootkeh.useGenTheme()">${he ? "השתמש בעולם הזה" : "Use this world"}</button>
          <button type="button" class="bk-btn sm" onclick="window.Bootkeh.genTheme()">${he ? "אחר" : "Another"}</button>
          ${"speechSynthesis" in window ? `<button type="button" class="bk-btn sm" onclick="window.Bootkeh.readOpening()">${he ? "הקרא פתיחה" : "Read aloud"}</button>` : ""}
        </div></div>` : `<div style="font-size:12.5px;color:var(--bk-text-muted);">${he ? `${window.BKThemes.count} עולמות: אירועים היסטוריים, ז'אנרים של סרטים ומשחקי תפקידים — עם פתיחה להקראה.` : `${window.BKThemes.count} worlds from history, film genres and RPGs — with an opening to read aloud.`}</div>`}`;
  }
  function setThemeFam(f) { state.themeFam = f; renderThemeGen(); }
  function genTheme() { state.genTheme = window.BKThemes.generate(state.themeFam || "any", state.genTheme && state.genTheme.en.title); renderThemeGen(); }
  // Use the generated theme for this game (title on the board, the sheet and the players' messages).
  function useGenTheme() {
    const g = state.genTheme; if (!g) return;
    const L = state.lang === "he" ? g.he : g.en;
    state.themeId = "custom_random";
    state.customThemeTitle = `${g.icon} ${L.title}`;
    state.customThemeDesc = `${L.setting} ${L.twist} — ${state.lang === "he" ? "השד" : "Demon"}: ${L.demon}.`;
    const input = $("#customThemeInput"); if (input) input.value = state.customThemeTitle;
    renderSetupView(); renderBoardView(); renderThemeGen();
  }
  function readOpening() {
    const g = state.genTheme; if (!g || !("speechSynthesis" in window)) return;
    const he = state.lang === "he", L = he ? g.he : g.en, u = new SpeechSynthesisUtterance(`${L.title}. ${L.setting} ${L.twist} ${L.opening}`);
    u.lang = he ? "he-IL" : "en-GB"; u.rate = .92; speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  function setCustomTheme(val) {
    if (!val) {
      state.customThemeTitle = "";
      state.customThemeDesc = "";
      return;
    }
    state.themeId = "custom_user";
    state.customThemeTitle = val;
    state.customThemeDesc = state.lang === "he" ? `עולם מותאם אישית: ${val}` : `Custom lore: ${val}`;
    renderBoardView();
  }


  // --- Game Generation Core Logic ---
  function generateGame(autoSwitch = true) {
    const count = parseInt(state.playerCount, 10) || 8;
    const baseDist = (window.BOOTKEH_PLAYER_DISTRIBUTION || {})[String(count)] || { townsfolk: 5, outsiders: 1, minions: 1, demons: 1 };
    let townsfolkNeeded = baseDist.townsfolk;
    let outsidersNeeded = baseDist.outsiders;
    let minionsNeeded = baseDist.minions;
    let demonsNeeded = baseDist.demons;

    // Determine role pool
    let poolRoles = [];
    if (state.scriptId === "custom" && state.customRoles.length > 0) {
      poolRoles = state.customRoles.map(id => getRole(id)).filter(Boolean);
    } else {
      const script = getScript(state.scriptId) || getScript("crimson_guard");
      poolRoles = (script ? script.roles : []).map(id => getRole(id)).filter(Boolean);
    }

    // Fallback if pool is too small
    if (poolRoles.length < count) {
      poolRoles = (window.BOOTKEH_ROLES || []);
    }

    // Separate pool by category
    const townsfolkPool = poolRoles.filter(r => r.type === "townsfolk");
    const outsiderPool = poolRoles.filter(r => r.type === "outsider");
    const minionPool = poolRoles.filter(r => r.type === "minion");
    const demonPool = poolRoles.filter(r => r.type === "demon");

    // Shuffle helper
    const shuffle = fairShuffle;

    // Pick Minions & Demons first to check setup modifiers (e.g. Baron +2 outsiders, Fang Gu +1 outsider)
    const pickedMinions = shuffle(minionPool).slice(0, minionsNeeded);
    const pickedDemons = shuffle(demonPool).slice(0, demonsNeeded);

    // Check Baron
    if (pickedMinions.some(m => m.id === "baron")) {
      outsidersNeeded += 2;
      townsfolkNeeded = Math.max(1, townsfolkNeeded - 2);
    }
    // Check Fang Gu
    if (pickedDemons.some(d => d.id === "fang_gu")) {
      outsidersNeeded += 1;
      townsfolkNeeded = Math.max(1, townsfolkNeeded - 1);
    }

    const pickedOutsiders = shuffle(outsiderPool).slice(0, outsidersNeeded);
    const pickedTownsfolk = shuffle(townsfolkPool).slice(0, townsfolkNeeded);

    // Combine game roles in play
    const rolesInPlay = shuffle([...pickedTownsfolk, ...pickedOutsiders, ...pickedMinions, ...pickedDemons]);

    // Prepare player names from state.roster for all `count` seats (up to 15)
    const players = [];
    for (let i = 0; i < count; i++) {
      const item = state.roster[i] || {};
      const name = (item.name && item.name.trim()) || 
                   `${state.lang === "he" ? "שחקן" : "Player"} ${i + 1}`;
      const phone = (item.phone && item.phone.trim()) || "";

      const role = rolesInPlay[i] || pickedTownsfolk[0] || getRole("empath");
      const alignment = (role.type === "minion" || role.type === "demon") ? "evil" : "good";

      players.push({
        id: `seat_${i + 1}`,
        seat: i + 1,
        name,
        phone,
        roleId: role.id,
        role,
        alignment,
        isAlive: true,
        hasGhostVote: true,
        isRevealed: false,
        isSent: false,
        firstNightInfo: ""
      });
    }

    state.players = players;
    state.poolIds = poolRoles.filter(r => ["townsfolk", "outsider", "minion", "demon"].includes(r.type)).map(r => r.id);

    // Generate dynamic First Night Info for each player
    computeFirstNightInfo(players, rolesInPlay, poolRoles);

    // Render updated views
    renderBoardView();
    renderSheetView();
    renderCardsView();
    if (autoSwitch) {
      setTab("board");
      SoundFX.playGong();
      // straight into the game: make the private pages and open "send to everyone" (one group link)
      if (window.BKLive && window.BKCloud && window.BKCloud.ok !== false) window.BKLive.startFlow();
    }
  }

  // --- Dynamic First Night Information Calculator ---
  function computeFirstNightInfo(players, rolesInPlay, allScriptRoles) {
    const evilPlayers = players.filter(p => p.alignment === "evil");
    const demonPlayers = players.filter(p => p.role.type === "demon");
    const minionPlayers = players.filter(p => p.role.type === "minion");
    const goodInPlayRoles = rolesInPlay.filter(r => r.type === "townsfolk" || r.type === "outsider");
    const notInPlayGood = allScriptRoles.filter(r => (r.type === "townsfolk" || r.type === "outsider") && !rolesInPlay.some(ip => ip.id === r.id));

    players.forEach(p => {
      let infoHe = "";
      let infoEn = "";
      const r = p.role;

      if (r.type === "demon") {
        // Demon learns minions and 3 bluffs
        const minionNames = minionPlayers.map(m => m.name).join(", ") || (state.lang === "he" ? "אין משרתים" : "None");
        const bluffs = notInPlayGood.slice(0, 3);
        const bluffNamesHe = bluffs.map(b => b.name_he).join(", ");
        const bluffNamesEn = bluffs.map(b => b.name_en).join(", ");

        infoHe = `המשרתים שלך: ${minionNames}. 3 תפקידים שלא במשחק (בלופים בטוחים): ${bluffNamesHe}.`;
        infoEn = `Your Minions: ${minionNames}. 3 Not-in-play Good Roles (safe bluffs): ${bluffNamesEn}.`;
      } else if (r.type === "minion") {
        // Minion learns Demon and fellow minions
        const demonNames = demonPlayers.map(d => d.name).join(", ");
        const fellowMinions = minionPlayers.filter(m => m.id !== p.id).map(m => m.name).join(", ");
        infoHe = `השד שלך הוא: ${demonNames || "לא ידוע"}.${fellowMinions ? ` משרת נוסף: ${fellowMinions}.` : ""}`;
        infoEn = `Your Demon is: ${demonNames || "Unknown"}.${fellowMinions ? ` Fellow Minion: ${fellowMinions}.` : ""}`;
      } else if (r.id === "empath") {
        // Empath counts evil alive neighbors
        const nIdx = p.seat - 1;
        const leftNeighbor = players[(nIdx - 1 + players.length) % players.length];
        const rightNeighbor = players[(nIdx + 1) % players.length];
        let evilCount = 0;
        if (leftNeighbor && leftNeighbor.alignment === "evil") evilCount++;
        if (rightNeighbor && rightNeighbor.alignment === "evil") evilCount++;
        infoHe = `מספר השכנים הרעים שלך במעגל כרגע: ${evilCount}.`;
        infoEn = `Number of alive evil neighbors right now: ${evilCount}.`;
      } else if (r.id === "chef") {
        // Chef counts adjacent evil pairs
        let pairs = 0;
        for (let i = 0; i < players.length; i++) {
          const cur = players[i];
          const next = players[(i + 1) % players.length];
          if (cur.alignment === "evil" && next.alignment === "evil") pairs++;
        }
        infoHe = `מספר זוגות השחקנים הרעים היושבים זה לצד זה: ${pairs}.`;
        infoEn = `Number of adjacent pairs of evil players: ${pairs}.`;
      } else if (r.id === "librarian") {
        const outsidersInPlay = players.filter(pl => pl.role.type === "outsider");
        if (outsidersInPlay.length > 0) {
          const target = outsidersInPlay[0];
          const otherGood = players.find(pl => pl.id !== target.id && pl.id !== p.id) || players[0];
          infoHe = `אחד משני שחקנים אלו הוא ${target.role.name_he}: ${target.name} או ${otherGood.name}.`;
          infoEn = `One of these 2 players is the ${target.role.name_en}: ${target.name} or ${otherGood.name}.`;
        } else {
          infoHe = "אפס אאוטסיידרים נמצאים במשחק כרגע.";
          infoEn = "Zero Outsiders are currently in play.";
        }
      } else if (r.id === "washerwoman") {
        const townsfolkInPlay = players.filter(pl => pl.role.type === "townsfolk" && pl.id !== p.id);
        if (townsfolkInPlay.length > 0) {
          const target = townsfolkInPlay[0];
          const other = players.find(pl => pl.id !== target.id && pl.id !== p.id) || players[0];
          infoHe = `אחד משני שחקנים אלו הוא ${target.role.name_he}: ${target.name} או ${other.name}.`;
          infoEn = `One of these 2 players is the ${target.role.name_en}: ${target.name} or ${other.name}.`;
        }
      } else if (r.id === "investigator") {
        if (minionPlayers.length > 0) {
          const target = minionPlayers[0];
          const otherGood = players.find(pl => pl.id !== target.id && pl.alignment === "good" && pl.id !== p.id) || players[0];
          infoHe = `אחד משני שחקנים אלו הוא ${target.role.name_he}: ${target.name} או ${otherGood.name}.`;
          infoEn = `One of these 2 players is the ${target.role.name_en}: ${target.name} or ${otherGood.name}.`;
        }
      } else if (r.id === "clockmaker") {
        // Steps from demon to nearest minion
        let steps = 1;
        if (demonPlayers.length > 0 && minionPlayers.length > 0) {
          const dSeat = demonPlayers[0].seat;
          const distances = minionPlayers.map(m => {
            const diff = Math.abs(dSeat - m.seat);
            return Math.min(diff, players.length - diff);
          });
          steps = Math.min(...distances);
        }
        infoHe = `מרחק הצעדים בין השד למשרת הקרוב אליו ביותר: ${steps}.`;
        infoEn = `Number of steps from Demon to nearest Minion: ${steps}.`;
      } else {
        infoHe = state.lang === "he" ? "אין מידע פעיל בלילה הראשון. הקשב לרמזים ביום!" : "No wake-up info on Night 1. Listen closely during the day!";
        infoEn = "No wake-up info on Night 1. Listen closely during the day!";
      }

      p.firstNightInfo = state.lang === "he" ? infoHe : infoEn;
    });
  }

  // --- Seating Circle (Grimoire Board View) Rendering ---
  // A throne drawn in SVG (gothic back with three finials, velvet panel, arms, seat). The velvet takes the seat's
  // colour from CSS (--velvet): gold for unknown, blue for good, red for evil, grey when dead.
  const THRONE_SVG = `<svg class="bk-throne" viewBox="0 0 100 124" aria-hidden="true">
    <defs><linearGradient id="bkWood" x1="0" x2="1"><stop offset="0" stop-color="#3a2410"/><stop offset=".5" stop-color="#6b4420"/><stop offset="1" stop-color="#3a2410"/></linearGradient></defs>
    <path d="M50 2 L56 12 L54 14 L62 22 L72 14 L74 24 L84 30 L84 92 L16 92 L16 30 L26 24 L28 14 L38 22 L46 14 L44 12Z" fill="url(#bkWood)" stroke="var(--trim)" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="50" cy="5" r="3.4" fill="var(--trim)"/><circle cx="27" cy="16" r="2.6" fill="var(--trim)"/><circle cx="73" cy="16" r="2.6" fill="var(--trim)"/>
    <path d="M24 88 V40 Q24 28 50 24 Q76 28 76 40 V88Z" fill="var(--velvet)" stroke="var(--trim)" stroke-width="1.4"/>
    <path d="M30 86 V44 Q30 34 50 31 Q70 34 70 44 V86" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
    <rect x="6" y="76" width="18" height="12" rx="4" fill="url(#bkWood)" stroke="var(--trim)" stroke-width="1.6"/>
    <rect x="76" y="76" width="18" height="12" rx="4" fill="url(#bkWood)" stroke="var(--trim)" stroke-width="1.6"/>
    <path d="M12 88 H88 L84 102 H16Z" fill="var(--velvet)" stroke="var(--trim)" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M18 102 V120 M82 102 V120 M30 102 V114 M70 102 V114" stroke="#3a2410" stroke-width="5" stroke-linecap="round"/>
  </svg>`;

  function renderBoardView() {
    const container = $("#seatingCircle");
    if (!container) return;

    const N = state.players.length;
    if (N === 0) return;

    // Seats around the table, in % of the table size so it scales on phones
    const R = N > 12 ? 41 : 39;

    let html = `
      <div class="bootkeh-circle-center">
        <div class="bootkeh-circle-center-logo">🕰️</div>
        <div class="bootkeh-circle-center-title">${getThemeTitle()}</div>
        <div class="bootkeh-circle-center-sub">${N} ${T[state.lang].playerCountLabel} · ${getScriptTitle()}</div>
      </div>
    `;

    state.players.forEach((p, idx) => {
      // Angle around circle (starts at top -PI/2)
      const angle = (idx / N) * 2 * Math.PI - (Math.PI / 2);
      const x = (50 + R * Math.cos(angle)).toFixed(2);
      const y = (50 + R * Math.sin(angle)).toFixed(2);

      const isRevealed = state.isStorytellerView;
      const roleName = isRevealed ? (state.lang === "he" ? p.role.name_he : p.role.name_en) : (state.lang === "he" ? "מושב" : "Seat");
      const icon = isRevealed ? p.role.icon : "👤";
      const alignClass = isRevealed ? p.alignment : "";
      const statusClass = p.isAlive ? "" : "dead";

      html += `
        <div class="bootkeh-seat-node bk-throne-seat ${alignClass} ${statusClass}" 
             style="left:${x}%;top:${y}%;" 
             onclick="window.Bootkeh.openPlayerDetailsModal('${p.id}')"
             title="${esc(p.name)} (${esc(roleName)})">
          ${THRONE_SVG}
          <span class="bootkeh-seat-num">#${p.seat}</span>
          <span class="bootkeh-seat-icon">${icon}</span>
          <span class="bootkeh-seat-name">${esc(p.name)}</span>
          <span class="bootkeh-seat-role-title">${esc(roleName)}</span>
        </div>
      `;
    });

    container.innerHTML = html;

    // Update Storyteller Toggle Button label
    const toggleBtn = $("#toggleViewBtn");
    if (toggleBtn) {
      toggleBtn.textContent = state.isStorytellerView ? T[state.lang].seatToggleSpectator : T[state.lang].seatToggleStoryteller;
    }
  }

  function getThemeTitle() {
    if (String(state.themeId || "").startsWith("custom") && state.customThemeTitle) return state.customThemeTitle;
    const th = getTheme(state.themeId);
    if (!th) return "Ravenswood Bluff";
    return state.lang === "he" ? th.title_he : th.title_en;
  }

  function getScriptTitle() {
    const sc = getScript(state.scriptId);
    if (!sc) return "Custom Script";
    return state.lang === "he" ? sc.name_he : sc.name_en;
  }

  function toggleStorytellerView() {
    state.isStorytellerView = !state.isStorytellerView;
    renderBoardView();
  }

  // --- Character Script Sheet (דף תפקידים — מעוצב בדיוק לפי התמונה) ---
  function renderSheetView() {
    const wrap = $("#characterSheetWrap");
    if (!wrap) return;

    const script = getScript(state.scriptId) || getScript("crimson_guard");
    const scriptRoles = (state.scriptId === "custom" && state.customRoles.length > 0)
      ? state.customRoles.map(id => getRole(id)).filter(Boolean)
      : (script ? script.roles.map(id => getRole(id)).filter(Boolean) : []);

    const townsfolk = scriptRoles.filter(r => r.type === "townsfolk");
    const outsiders = scriptRoles.filter(r => r.type === "outsider");
    const minions = scriptRoles.filter(r => r.type === "minion");
    const demons = scriptRoles.filter(r => r.type === "demon");

    const author = script ? script.author : "Storyteller";
    const sheetTitle = script ? (state.lang === "he" ? script.name_he : script.name_en) : getThemeTitle();

    function renderCategory(catKey, catBadgeTitle, rolesList, badgeClass = "") {
      if (rolesList.length === 0) return "";
      return `
        <div class="bootkeh-sheet-category">
          <div class="bootkeh-sheet-cat-divider">
            <span class="bootkeh-sheet-cat-badge ${badgeClass}">${catBadgeTitle}</span>
          </div>
          <div class="bootkeh-sheet-grid">
            ${rolesList.map(r => `
              <div class="bootkeh-sheet-item ${r.type}">
                <div class="bootkeh-sheet-icon">${r.icon}</div>
                <div>
                  <div class="bootkeh-sheet-role-name">${state.lang === "he" ? r.name_he : r.name_en}</div>
                  <div class="bootkeh-sheet-ability">${state.lang === "he" ? r.ability_he : r.ability_en}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    if (window.BKSheet) {   // same layout as the official script sheet (and as the players' 📜 list)
      wrap.innerHTML = window.BKSheet.html({ title: sheetTitle, author, roles: [...townsfolk, ...outsiders, ...minions, ...demons], lang: state.lang });
      return;
    }
    wrap.innerHTML = `
      <div class="bootkeh-sheet-preview-wrap">
        <div class="bootkeh-sheet-header">
          <div>
            <span class="bootkeh-sheet-main-title">${esc(sheetTitle)}</span>
            <span class="bootkeh-sheet-author">by ${esc(author)}</span>
          </div>
        </div>

        ${renderCategory("townsfolk", state.lang === "he" ? "תושבי העיירה · TOWNSFOLK" : "TOWNSFOLK", townsfolk)}
        ${renderCategory("outsider", state.lang === "he" ? "אאוטסיידרים · OUTSIDERS" : "OUTSIDERS", outsiders)}
        ${renderCategory("minion", state.lang === "he" ? "משרתים · MINIONS" : "MINIONS", minions, "minion")}
        ${renderCategory("demon", state.lang === "he" ? "שדים · DEMONS" : "DEMONS", demons, "demon")}

        <div class="bootkeh-sheet-footer">
          <span>© Steven Medway, bloodontheclocktower.com · Generator by roeetal.com/Bootkeh</span>
          <span>* Not the first night</span>
        </div>
      </div>
    `;
  }

  // --- Player Secret Cards & WhatsApp Sharing ---
  function renderCardsView() {
    const grid = $("#playerCardsGrid");
    if (!grid) return;
    const t = T[state.lang];

    const total = state.players.length;
    const sentCount = state.players.filter(p => p.isSent).length;

    const dispatchedCountEl = $("#dispatchedCount");
    if (dispatchedCountEl) dispatchedCountEl.textContent = `${sentCount}`;

    const dispatchTotalEl = $("#dispatchTotalCount");
    if (dispatchTotalEl) dispatchTotalEl.textContent = `${total}`;

    const progressBar = $("#dispatchProgressBar");
    if (progressBar) {
      const pct = total > 0 ? Math.round((sentCount / total) * 100) : 0;
      progressBar.style.width = `${pct}%`;
    }

    const liveBox = document.getElementById("bkLiveBox");
    if (liveBox) liveBox.innerHTML = liveBoxHTML();
    const live = liveGame();
    grid.innerHTML = state.players.map(p => {
      const r = p.role;
      const roleName = state.lang === "he" ? r.name_he : r.name_en;
      const ability = state.lang === "he" ? r.ability_he : r.ability_en;

      const sentBadge = p.isSent
        ? `<span class="bk-dist-pill" style="background:rgba(16,185,129,0.2);color:#34d399;border-color:#10b981;font-size:11px;">✅ ${state.lang === 'he' ? 'נשלח ב-WhatsApp' : 'Sent'}</span>`
        : `<span class="bk-dist-pill" style="background:rgba(255,255,255,0.06);color:var(--bk-text-muted);font-size:11px;">⏳ ${state.lang === 'he' ? 'טרם נשלח' : 'Pending'}</span>`;

      return `
        <div class="bootkeh-player-card ${p.alignment}">
          <div class="bootkeh-player-card-header">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">${p.alignment === "evil" ? "😈" : "🛡️"}</span>
              <span style="font-weight:700;font-size:14px;color:#fff;">#${p.seat} ${esc(p.name)}</span>
            </div>
            ${sentBadge}
          </div>
          <div class="bootkeh-player-card-body">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <span style="font-size:28px;">${r.icon}</span>
              <div>
                <div style="font-weight:700;font-size:15px;color:#fff;">${esc(roleName)}</div>
                <span class="bk-dist-pill ${r.type}">${r.type.toUpperCase()}</span>
              </div>
            </div>
            <div style="font-size:12.5px;color:var(--bk-text-muted);line-height:1.45;margin-bottom:10px;">
              <b>${t.abilityTitle}</b> ${esc(ability)}
            </div>
            <div class="bootkeh-secret-info-box">
              <div class="bootkeh-secret-info-title">📜 ${t.firstNightTitle}</div>
              <textarea id="bkInfo-${p.id}" class="bk-info-edit">${esc(p.firstNightInfo)}</textarea>
              <div style="display:flex;gap:6px;margin-top:6px;align-items:center;">
                <button type="button" id="bkInfoBtn-${p.id}" class="bk-btn sm" onclick="window.Bootkeh.pushInfo('${p.id}')">${live ? (state.lang === "he" ? "עדכן בדף שלו" : "Update their page") : (state.lang === "he" ? "שמור" : "Save")}</button>
                ${live ? `<button type="button" id="bkCopy-${p.seat}" class="bk-btn sm" title="${state.lang === "he" ? "העתק קישור פרטי" : "Copy private link"}" onclick="window.Bootkeh.copyLiveLink(${p.seat})">🔗</button>` : ""}
              </div>
            </div>

            <div style="display:flex;gap:8px;margin-top:auto;padding-top:12px;">
              <button type="button" class="bk-btn whatsapp sm" style="flex:1;justify-content:center;" onclick="window.Bootkeh.sendWhatsapp('${p.id}')">
                <span>${t.shareWhatsapp}</span>
              </button>
              <button type="button" class="bk-btn sm" style="padding:6px 10px;" onclick="window.Bootkeh.sendSms('${p.id}')" title="שלח ב-SMS">
                <span>📱</span>
              </button>
              <button type="button" class="bk-btn sm" onclick="window.Bootkeh.copySecretText('${p.id}')" title="${t.copySecret}">
                <span>📋</span>
              </button>
              <button type="button" class="bk-btn sm" onclick="window.Bootkeh.toggleSentStatus('${p.id}')" title="${state.lang === 'he' ? 'סמן כנשלח' : 'Toggle sent'}">
                <span>${p.isSent ? "↩" : "✓"}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function toggleCardSecret(playerId) {
    const p = state.players.find(x => x.id === playerId);
    if (p) {
      p.isRevealed = !p.isRevealed;
      renderCardsView();
    }
  }

  function toggleSentStatus(playerId) {
    const p = state.players.find(x => x.id === playerId);
    if (p) {
      p.isSent = !p.isSent;
      renderCardsView();
    }
  }

  // --- WhatsApp Sharing Link Generator ---
  function sendWhatsapp(playerId) {
    const p = state.players.find(x => x.id === playerId);
    if (!p) return;

    const r = p.role;
    const roleName = state.lang === "he" ? r.name_he : r.name_en;
    const ability = state.lang === "he" ? r.ability_he : r.ability_en;
    const team = p.alignment === "evil" ? (state.lang === "he" ? "רעים 😈" : "Evil 😈") : (state.lang === "he" ? "טובים 🛡️" : "Good 🛡️");

    let msg = "";
    if (state.lang === "he") {
      msg = `🩸 *דם על מגדל השעון — הודעה סודית לשחקן* 🩸\n\n` +
            `שלום *${p.name}*!\n` +
            `המושב שלך במעגל: *#${p.seat}*\n` +
            `התפקיד הסודי שלך: *${roleName}* (${r.icon})\n` +
            `הצד שלך: *${team}*\n\n` +
            `📜 *יכולת הדמות:*\n${ability}\n\n` +
            `🌙 *מידע התחלתי ללילה הראשון:*\n${p.firstNightInfo}\n\n` +
            `🤫 _שמור את המידע בסוד ואל תראה את המסך לאף אחד! בהצלחה!_`;
    } else {
      msg = `🩸 *Blood on the Clocktower — Secret Player Info* 🩸\n\n` +
            `Hi *${p.name}*!\n` +
            `Your Seat: *#${p.seat}*\n` +
            `Your Secret Role: *${roleName}* (${r.icon})\n` +
            `Your Team: *${team}*\n\n` +
            `📜 *Ability:*\n${ability}\n\n` +
            `🌙 *First Night Starting Info:*\n${p.firstNightInfo}\n\n` +
            `🤫 _Keep this completely secret! Good luck!_`;
    }

    // Encode session data for direct mobile link
    const sessionData = btoa(unescape(encodeURIComponent(JSON.stringify({
      seat: p.seat,
      name: p.name,
      roleId: r.id,
      alignment: p.alignment,
      info: p.firstNightInfo
    }))));

    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    // the private live page (expires / deleted at game end) when one was made; else the offline card link
    const live = liveGame();
    const directCardLink = live && live.links[p.seat] ? live.links[p.seat] : `${baseUrl}?player=${p.id}#s=${sessionData}`;

    if (state.lang === "he") {
      msg += live ? `\n\n🃏 *הדף הסודי שלך (מתעדכן במהלך המשחק, נמחק בסופו):*\n${directCardLink}` : `\n\n🃏 *לצפייה בכרטיס הדמות הוויזואלי שלך בנייד:*\n${directCardLink}`;
    } else {
      msg += live ? `\n\n🃏 *Your secret page (updates during the game, deleted at the end):*\n${directCardLink}` : `\n\n🃏 *View your secret visual character card on your phone:*\n${directCardLink}`;
    }

    const cleanPhone = waPhone(p.phone);
    let url = "";
    if (cleanPhone) {
      url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    }

    p.isSent = true;
    renderCardsView();
    window.open(url, "_blank");
  }

  // ---- Saved custom games ("our versions"): roles, player count and theme, kept on this device ----
  function presets() { try { return JSON.parse(localStorage.getItem("bk_presets") || "[]"); } catch (e) { return []; } }
  function storePresets(list) { try { localStorage.setItem("bk_presets", JSON.stringify(list)); } catch (e) {} }
  // Save what is set up now as a named game.
  function savePreset() {
    const he = state.lang === "he";
    const name = prompt(he ? "שם למשחק השמור (למשל: הגרסה של שישי):" : "Name for this saved game:", state.customThemeTitle || getScriptTitle());
    if (!name) return;
    const list = presets().filter(x => x.name !== name);
    list.unshift({ id: "p" + Date.now(), name: name.slice(0, 60), playerCount: state.playerCount, scriptId: state.scriptId, customRoles: state.customRoles.slice(),
      themeId: state.themeId, customThemeTitle: state.customThemeTitle, customThemeDesc: state.customThemeDesc, saved: Date.now() });
    storePresets(list.slice(0, 30)); renderPresets();
  }
  // Load a saved game into the setup.
  function loadPreset(id) {
    const x = presets().find(p => p.id === id); if (!x) return;
    Object.assign(state, { playerCount: x.playerCount || 8, scriptId: x.scriptId || "custom", customRoles: (x.customRoles || []).slice(), themeId: x.themeId || state.themeId,
      customThemeTitle: x.customThemeTitle || "", customThemeDesc: x.customThemeDesc || "" });
    const sl = $("#playerCountSlider"); if (sl) sl.value = state.playerCount;
    const sc = $("#scriptSelect"); if (sc) sc.value = state.scriptId;
    const ti = $("#customThemeInput"); if (ti) ti.value = state.customThemeTitle || "";
    renderRosterInputs(); initCustomRolesMatrix(); updateCustomRoleChips && updateCustomRoleChips(); renderSetupView(); renderPresets();
    generateGame(false); renderBoardView();
  }
  function deletePreset(id) { storePresets(presets().filter(p => p.id !== id)); renderPresets(); }
  function renderPresets() {
    const box = document.getElementById("bkPresets"); if (!box) return;
    const he = state.lang === "he", list = presets();
    box.innerHTML = `<div class="bk-presets-head"><span class="bk-label" style="margin:0;">${he ? "משחקים שמורים" : "Saved games"}</span>
        <button type="button" class="bk-btn sm" onclick="window.Bootkeh.savePreset()">${he ? "שמור את ההגדרה הנוכחית" : "Save current setup"}</button></div>
      ${list.length ? `<div class="bk-presets">${list.map(x => `<span class="bk-preset"><button type="button" onclick="window.Bootkeh.loadPreset('${x.id}')" title="${esc(x.name)}">
          <b>${esc(x.name)}</b><small>${x.playerCount} ${he ? "שחקנים" : "players"} · ${x.scriptId === "custom" ? `${(x.customRoles || []).length} ${he ? "תפקידים" : "roles"}` : esc((getScript(x.scriptId) || {})[he ? "title_he" : "title_en"] || x.scriptId)}</small></button>
          <button type="button" class="bk-preset-x" onclick="window.Bootkeh.deletePreset('${x.id}')" aria-label="${he ? "מחק" : "Delete"}">×</button></span>`).join("")}</div>`
        : `<div class="bk-muted-note">${he ? "עוד אין משחקים שמורים. בנה משחק (גם עם תפקידים מותאמים) ולחץ \"שמור\"." : "No saved games yet. Set one up (custom roles too) and press Save."}</div>`}`;
  }

  // ---- Random roles: pick a balanced random set of characters for the current player count ----
  function randomizeRoles() {
    const n = parseInt(state.playerCount, 10) || 8;
    const d = (window.BOOTKEH_PLAYER_DISTRIBUTION || {})[String(n)] || { townsfolk: 5, outsiders: 1, minions: 1, demons: 1 };
    const all = window.BOOTKEH_ROLES || [], sh = fairShuffle;
    const take = (type, k) => sh(all.filter(r => r.type === type)).slice(0, k).map(r => r.id);
    // a few more than needed of each kind, so the deal still varies and bluffs exist
    state.customRoles = [...take("townsfolk", d.townsfolk + 4), ...take("outsider", d.outsiders + 2), ...take("minion", d.minions + 2), ...take("demon", Math.max(2, d.demons + 1))];
    state.scriptId = "custom";
    const sc = $("#scriptSelect"); if (sc) sc.value = "custom";
    initCustomRolesMatrix(); if (typeof updateCustomRoleChips === "function") updateCustomRoleChips(); renderSetupView();
    generateGame(false); renderBoardView(); renderCardsView();
  }

  // Deal the roles again to the same players (new random seats/roles from the current set).
  function redeal() {
    const tab = state.activeTab;
    generateGame(false); renderBoardView(); renderCardsView(); renderSheetView();
    if (tab) setTab(tab);
  }

  // ---- Send to everyone: WhatsApp only lets a person press Send for each chat, so this opens the chats one after
  // another from one panel — one tap per player, no searching. ----
  // night = {night: "לילה 2", items: [{seat, text}]} sends that night's info instead of the role message.
  function sendAllWhatsapp(night) {
    if (night && night.items) return sendNightWhatsapp(night);
    if (window.BKLive && window.BKCloud && window.BKCloud.ok !== false) return window.BKLive.groupSend();   // one link for everyone
    return sendEachWhatsapp();
  }
  // Fallback: private chats, one tap each (WhatsApp makes a person press Send in every chat).
  function sendEachWhatsapp() {
    const he = state.lang === "he";
    let ov = document.getElementById("bkSendAll");
    if (!ov) { ov = document.createElement("div"); ov.id = "bkSendAll"; ov.className = "bk-sendall"; document.body.appendChild(ov); }
    const draw = () => {
      const left = state.players.filter(p => !p.isSent), next = left[0], done = state.players.length - left.length;
      ov.innerHTML = `<div class="bk-sendall-card" role="dialog" aria-label="${he ? "שליחה לכולם" : "Send to all"}">
        <div class="bk-sendall-top"><b>${he ? "שליחה לכל השחקנים" : "Send to every player"}</b><button type="button" class="bk-sendall-x" aria-label="${he ? "סגור" : "Close"}">×</button></div>
        <div class="bk-sendall-bar"><i style="width:${Math.round(done / Math.max(1, state.players.length) * 100)}%"></i></div>
        <div class="bk-sendall-count">${done} / ${state.players.length}</div>
        ${next ? `<button type="button" class="bk-btn pri bk-sendall-go">${he ? "שלח ל" : "Send to "}${esc(next.name)} · ${he ? "מושב" : "seat"} ${next.seat}</button>
          <p class="bk-muted-note">${he ? "WhatsApp ייפתח עם ההודעה מוכנה — לוחצים שם “שלח” וחוזרים לכאן לבא בתור." : "WhatsApp opens with the message ready — tap Send there and come back for the next one."}</p>
          ${!liveGame() ? `<p class="bk-muted-note" style="color:#fcd34d;">${he ? "טיפ: צור קודם “דפים פרטיים” כדי שכל שחקן יקבל גם קישור שמתעדכן." : "Tip: create private pages first so each player also gets a live link."}</p>` : ""}`
        : `<p style="font-size:16px;margin:10px 0;">✓ ${he ? "כולם קיבלו את ההודעה" : "Everyone has their message"}</p>`}
        <div class="bk-sendall-list">${state.players.map(p => `<span class="${p.isSent ? "on" : ""}">${p.seat}. ${esc(p.name)}</span>`).join("")}</div>
      </div>`;
      ov.querySelector(".bk-sendall-x").onclick = () => ov.remove();
      const go = ov.querySelector(".bk-sendall-go"); if (go) go.onclick = () => { sendWhatsapp(next.id); draw(); };
    };
    draw();
  }

  // The same one-tap-per-chat panel, for one night's info (only to players who got info this night).
  function sendNightWhatsapp(night) {
    const he = state.lang === "he", g = liveGame(), sent = new Set();
    let ov = document.getElementById("bkSendAll");
    if (!ov) { ov = document.createElement("div"); ov.id = "bkSendAll"; ov.className = "bk-sendall"; document.body.appendChild(ov); }
    const list = night.items.map(i => ({ p: state.players.find(x => x.seat === i.seat), text: i.text })).filter(x => x.p);
    const draw = () => {
      const next = list.find(x => !sent.has(x.p.seat));
      ov.innerHTML = `<div class="bk-sendall-card" role="dialog">
        <div class="bk-sendall-top"><b>${esc(night.night)} · WhatsApp</b><button type="button" class="bk-sendall-x" aria-label="${he ? "סגור" : "Close"}">×</button></div>
        <div class="bk-sendall-bar"><i style="width:${Math.round(sent.size / Math.max(1, list.length) * 100)}%"></i></div>
        <div class="bk-sendall-count">${sent.size} / ${list.length}</div>
        ${next ? `<button type="button" class="bk-btn pri bk-sendall-go">${he ? "שלח ל" : "Send to "}${esc(next.p.name)}</button>` : `<p style="font-size:16px;margin:10px 0;">✓ ${he ? "נשלח לכולם" : "All sent"}</p>`}
        <div class="bk-sendall-list">${list.map(x => `<span class="${sent.has(x.p.seat) ? "on" : ""}">${x.p.seat}. ${esc(x.p.name)}</span>`).join("")}</div></div>`;
      ov.querySelector(".bk-sendall-x").onclick = () => ov.remove();
      const go = ov.querySelector(".bk-sendall-go");
      if (go) go.onclick = () => {
        const link = g && g.links[next.p.seat];
        const msg = `${night.night}\n${next.text}${link ? "\n\n" + link : ""}`;
        window.open(`https://wa.me/${waPhone(next.p.phone)}?text=${encodeURIComponent(msg)}`, "_blank");
        sent.add(next.p.seat); draw();
      };
    };
    draw();
  }

  // Version next to the title: a short code that changes with every update of Bootkeh (made by build.py),
  // and when the page on the server was last updated, so it's easy to see the new version arrived.
  function showVersion() {
    const el = document.getElementById("bkVersion"); if (!el) return;
    const v = el.dataset.v && !el.dataset.v.startsWith("__") ? el.dataset.v : "dev";
    const d = new Date(document.lastModified), ok = !isNaN(d) && Date.now() - d > 5000;
    const when = ok ? d.toLocaleString(state.lang === "he" ? "he-IL" : "en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
    el.textContent = "v." + v;
    el.title = (state.lang === "he" ? "גרסה " : "Version ") + v + (when ? (state.lang === "he" ? " · עודכן " : " · updated ") + when : "");
    if (when) el.textContent += " · " + when;
  }

  // Phone number for WhatsApp links: digits only, international format (Israeli 05x… → 9725x…).
  function waPhone(raw) {
    let d = String(raw || "").replace(/[^0-9+]/g, "");
    if (d.startsWith("+")) d = d.slice(1);
    else if (d.startsWith("00")) d = d.slice(2);
    else if (d.startsWith("0")) d = "972" + d.slice(1);
    return d.replace(/\D/g, "");
  }

  // ---- Live private pages (temporary sub-sites per player) — see assets/bootkeh-cloud.js ----
  // The live game for the current seating (only if the seats/roles haven't been re-dealt since it was made).
  function liveGame() {
    const g = window.BKCloud && window.BKCloud.saved();
    return g && g.sig === playersSig() ? g : null;
  }
  // A fingerprint of the dealt game, so links are never sent for an older deal.
  function playersSig() { return state.players.map(p => `${p.seat}:${p.name}:${p.role && p.role.id}`).join("|"); }

  // Make (or remake) the private player pages for this game.
  async function createLiveGame() {
    if (!window.BKCloud) return;
    const he = state.lang === "he", hours = +(document.getElementById("bkLiveHours") || {}).value || 6;
    const st = document.getElementById("bkLiveStatus"); if (st) st.textContent = he ? "יוצר דפים פרטיים…" : "Creating private pages…";
    try {
      const old = liveGame(); if (old) await window.BKCloud.endGame(old.gameId).catch(() => {});
      const g = await window.BKCloud.createGame(getThemeTitle(), state.players.map(p => ({ seat: p.seat, name: p.name, role: p.role, alignment: p.alignment, info: p.firstNightInfo })), hours, state.lang,
        { name: getScriptTitle(), author: (getScript(state.scriptId) || {}).author || "", roles: (state.poolIds || []).map(getRole).filter(Boolean) });
      g.sig = playersSig(); state.liveSig = g.sig;
      // keep the deal on this device, so a refresh brings back the same game with its links
      g.players = state.players.map(p => ({ id: p.id, seat: p.seat, name: p.name, phone: p.phone, roleId: p.role && p.role.id, alignment: p.alignment, firstNightInfo: p.firstNightInfo, isAlive: p.isAlive, isSent: p.isSent }));
      try { localStorage.setItem("bk_live_game", JSON.stringify(g)); } catch (e) {}
      renderCardsView();
    } catch (e) { if (st) st.textContent = (he ? "לא הצלחתי ליצור דפים: " : "Couldn't create pages: ") + (e.message || e); }
  }

  // End the game: delete all private pages.
  async function endLiveGame() {
    const g = window.BKCloud && window.BKCloud.saved(); if (!g) return;
    const he = state.lang === "he";
    if (!confirm(he ? "לסיים את המשחק ולמחוק את כל הדפים הפרטיים? הקישורים יפסיקו לעבוד." : "End the game and delete all private pages? The links will stop working.")) return;
    try { await window.BKCloud.endGame(g.gameId); } catch (e) { alert(e.message || e); }
    state.liveSig = null; renderCardsView();
  }

  // Send each player's info to their live page (after the storyteller edited it).
  async function pushInfo(playerId) {
    const p = state.players.find(x => x.id === playerId), g = liveGame();
    const ta = document.getElementById("bkInfo-" + playerId);
    if (!p || !ta) return;
    p.firstNightInfo = ta.value;
    if (!g) { renderCardsView(); return; }
    try { await window.BKCloud.updateInfo(g.gameId, g.keys[p.seat], ta.value); flashSaved(playerId); }
    catch (e) { alert(e.message || e); }
  }
  function flashSaved(id) { const b = document.getElementById("bkInfoBtn-" + id); if (b) { const t = b.textContent; b.textContent = "✓"; setTimeout(() => b.textContent = t, 1200); } }

  // Copy one player's private link.
  function copyLiveLink(seat) {
    const g = liveGame(); if (!g) return;
    navigator.clipboard && navigator.clipboard.writeText(g.links[seat]);
    const b = document.getElementById("bkCopy-" + seat); if (b) { b.textContent = "✓"; setTimeout(() => b.textContent = "🔗", 1200); }
  }

  // Open WhatsApp for every player that wasn't sent yet, one after another (each tap opens the next chat).
  function sendNextWhatsapp() {
    const next = state.players.find(p => !p.isSent);
    if (next) sendWhatsapp(next.id);
    else alert(state.lang === "he" ? "כל השחקנים קיבלו הודעה ✓" : "Everyone got their message ✓");
  }

  // The box above the cards: make links, how long they live, end game.
  function liveBoxHTML() {
    const he = state.lang === "he", g = liveGame();
    const until = g ? new Date(g.expiresAt).toLocaleTimeString(he ? "he-IL" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
    return `<div class="bk-card bk-live" style="margin-bottom:16px;">
      <div class="bk-live-row">
        <b style="font-family:var(--bk-font-serif);color:var(--bk-gold-light);font-size:16px;">${he ? "דפים פרטיים לשחקנים" : "Private player pages"}</b>
        <span class="bk-live-pill ${g ? "" : "off"}">${g ? (he ? `פעיל עד ${until}` : `Live until ${until}`) : (he ? "לא פעיל" : "Not live")}</span>
      </div>
      <div style="font-size:12.5px;color:var(--bk-text-muted);line-height:1.5;">${he
        ? "כל שחקן מקבל קישור אישי שמראה רק את התפקיד שלו ואת המידע שלו, ומתעדכן כשאתה משנה את המידע. הדפים נמחקים כשאתה מסיים את המשחק, או לבד אחרי הזמן שבחרת."
        : "Each player gets a personal link that shows only their role and info, and updates when you change it. The pages are deleted when you end the game, or by themselves after the time you pick."}</div>
      <div class="bk-live-row">
        <label style="font-size:13px;color:#f1dfb5;">${he ? "נמחק אחרי" : "Expires after"}
          <select id="bkLiveHours" style="margin-inline-start:6px;"><option value="3">3 ${he ? "שעות" : "hours"}</option><option value="6" selected>6 ${he ? "שעות" : "hours"}</option><option value="12">12 ${he ? "שעות" : "hours"}</option></select></label>
        <button type="button" class="bk-btn pri sm" onclick="window.Bootkeh.createLiveGame()">${g ? (he ? "צור מחדש" : "Recreate") : (he ? "צור דפים פרטיים" : "Create private pages")}</button>
        <button type="button" class="bk-btn sm whatsapp" onclick="window.Bootkeh.sendAllWhatsapp()">${he ? "שלח לכולם בבת אחת" : "Send to everyone at once"}</button>
        <button type="button" class="bk-btn sm" onclick="window.Bootkeh.redeal()">${he ? "חלק תפקידים מחדש" : "Re-deal roles"}</button>
        ${g ? `<button type="button" class="bk-btn sm" onclick="window.Bootkeh.endLiveGame()">${he ? "סיים משחק ומחק דפים" : "End game & delete pages"}</button>` : ""}
        <span id="bkLiveStatus" style="font-size:12px;color:var(--bk-text-muted);"></span>
      </div>
    </div>`;
  }

  // Player side: open the live private page ?g=…&k=… and keep it updated.
  async function openLivePortal(gameId, key) {
    if (window.BKLive) return window.BKLive.openPlayer(gameId, key);   // the live player app (assets/bootkeh-live.js)
    const topbar = $(".bootkeh-topbar"), nav = $(".bootkeh-nav-tabs"), main = $(".bootkeh-main");
    [topbar, nav, main].forEach(x => { if (x) x.style.display = "none"; });
    const portal = $("#playerPortalView"); if (!portal) return;
    portal.style.display = "flex";
    const set = (id, v, html) => { const el = document.getElementById(id); if (el) el[html ? "innerHTML" : "textContent"] = v; };
    set("portalRoleName", "…");
    if (!window.BKCloud) return;
    window.BKCloud.watchPlayer(gameId, key, (d, why) => {
      if (!d) {
        const he = (navigator.language || "he").startsWith("he");
        set("portalPlayerBadge", "");
        set("portalRoleIcon", "🕯️");
        set("portalRoleName", why === "offline" ? (he ? "אין חיבור" : "Offline") : (he ? "המשחק הסתיים" : "This game has ended"));
        set("portalCategoryPill", "");
        set("portalRoleAbility", he ? "הדף הזה היה זמני ונמחק. תודה ששיחקת!" : "This page was temporary and has been removed. Thanks for playing!");
        set("portalFirstNight", "—");
        const c = $("#portalCurtain"); if (c) c.style.display = "none";
        return;
      }
      const he = d.lang !== "en";
      set("portalPlayerBadge", `${he ? "מושב" : "Seat"} #${d.seat} · ${d.name}`);
      set("portalRoleIcon", d.icon || "🎭");
      set("portalRoleName", he ? (d.name_he || d.name_en) : (d.name_en || d.name_he));
      set("portalCategoryPill", `<span class="bk-dist-pill ${esc(d.type)}">${esc(String(d.type || "").toUpperCase())}</span> <span class="bk-dist-pill ${esc(d.alignment)}">${d.alignment === "evil" ? (he ? "רעים 😈" : "Evil 😈") : (he ? "טובים 🛡️" : "Good 🛡️")}</span>`, true);
      set("portalRoleAbility", he ? (d.ability_he || d.ability_en) : (d.ability_en || d.ability_he));
      set("portalFirstNight", d.info || (he ? "אין מידע כרגע." : "No info right now."));
      const exp = d.expiresAt && d.expiresAt.toMillis ? new Date(d.expiresAt.toMillis()) : null;
      const note = document.getElementById("portalExpiry");
      if (note && exp) note.textContent = (he ? "⌛ הדף נמחק ב־" : "⌛ This page is deleted at ") + exp.toLocaleTimeString(he ? "he-IL" : "en-GB", { hour: "2-digit", minute: "2-digit" });
    });
  }

  function sendSms(playerId) {
    const p = state.players.find(x => x.id === playerId);
    if (!p) return;
    const r = p.role;
    const roleName = state.lang === "he" ? r.name_he : r.name_en;
    const cleanPhone = (p.phone || "").replace(/[^0-9]/g, "");

    const sessionData = btoa(unescape(encodeURIComponent(JSON.stringify({
      seat: p.seat,
      name: p.name,
      roleId: r.id,
      alignment: p.alignment,
      info: p.firstNightInfo
    }))));
    const directCardLink = `${window.location.origin}${window.location.pathname}?player=${p.id}#s=${sessionData}`;

    const text = state.lang === "he"
      ? `דם על מגדל השעון: שלום ${p.name}! תפקידך: ${roleName} (${r.icon}). מידע לילה: ${p.firstNightInfo}. כרטיס מלא: ${directCardLink}`
      : `Clocktower: Hi ${p.name}! Role: ${roleName}. Card: ${directCardLink}`;

    const smsUrl = cleanPhone ? `sms:${cleanPhone}?body=${encodeURIComponent(text)}` : `sms:?body=${encodeURIComponent(text)}`;
    p.isSent = true;
    renderCardsView();
    window.open(smsUrl, "_blank");
  }

  function copySecretText(playerId) {
    const p = state.players.find(x => x.id === playerId);
    if (!p) return;

    const r = p.role;
    const roleName = state.lang === "he" ? r.name_he : r.name_en;
    const ability = state.lang === "he" ? r.ability_he : r.ability_en;

    const msg = `🩸 ${p.name} (Seat #${p.seat}): ${roleName} (${r.icon}) | ${p.alignment.toUpperCase()}\nAbility: ${ability}\nFirst Night Info: ${p.firstNightInfo}`;
    navigator.clipboard.writeText(msg).then(() => {
      alert(T[state.lang].copySuccess);
    });
  }

  // --- Game Phase Timer & Controls ---
  function updateTimerDisplay() {
    const el = $("#timerDisplay");
    if (!el) return;
    const m = Math.floor(state.timer.secondsLeft / 60);
    const s = state.timer.secondsLeft % 60;
    el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    el.classList.toggle("urgent", state.timer.secondsLeft <= 30 && state.timer.isRunning);
  }

  function startTimer() {
    if (state.timer.isRunning) return;
    state.timer.isRunning = true;
    SoundFX.playTick();
    state.timer.intervalId = setInterval(() => {
      if (state.timer.secondsLeft > 0) {
        state.timer.secondsLeft--;
        updateTimerDisplay();
        if (state.timer.secondsLeft <= 10 && state.timer.secondsLeft > 0) {
          SoundFX.playTick();
        }
      } else {
        pauseTimer();
        SoundFX.playGong();
        alert(state.lang === "he" ? "⏰ הזמן תם!" : "⏰ Time is up!");
      }
    }, 1000);
  }

  function pauseTimer() {
    state.timer.isRunning = false;
    if (state.timer.intervalId) {
      clearInterval(state.timer.intervalId);
      state.timer.intervalId = null;
    }
    updateTimerDisplay();
  }

  function resetTimer() {
    pauseTimer();
    state.timer.secondsLeft = state.timer.phase === "day" ? 300 : (state.timer.phase === "nomination" ? 120 : 180);
    updateTimerDisplay();
  }

  function addMinute() {
    state.timer.secondsLeft += 60;
    updateTimerDisplay();
  }

  function advancePhase() {
    pauseTimer();
    if (state.timer.phase === "day") {
      state.timer.phase = "nomination";
      state.timer.secondsLeft = 120;
      SoundFX.playTick();
    } else if (state.timer.phase === "nomination") {
      state.timer.phase = "night";
      state.timer.secondsLeft = 180;
      SoundFX.playGong();
    } else {
      state.timer.phase = "day";
      state.timer.dayNumber++;
      state.timer.secondsLeft = 300;
      SoundFX.playDayBell();
    }

    const titleEl = $("#phaseTitle");
    if (titleEl) {
      if (state.timer.phase === "day") titleEl.textContent = `${T[state.lang].timerDay} · ${state.lang === "he" ? "יום" : "Day"} ${state.timer.dayNumber}`;
      if (state.timer.phase === "nomination") titleEl.textContent = T[state.lang].timerNomination;
      if (state.timer.phase === "night") titleEl.textContent = `${T[state.lang].timerNight} · ${state.lang === "he" ? "לילה" : "Night"} ${state.timer.dayNumber}`;
    }
    updateTimerDisplay();
  }

  // --- Saved Players Directory Modal ---
  function openSavedPlayersModal() {
    const m = $("#savedPlayersModal");
    if (!m) return;
    renderSavedPlayersList();
    m.classList.add("open");
  }

  function closeSavedPlayersModal() {
    const m = $("#savedPlayersModal");
    if (m) m.classList.remove("open");
  }

  function renderSavedPlayersList() {
    const list = $("#savedPlayersList");
    if (!list) return;

    list.innerHTML = state.savedPlayers.map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bk-surface-card);border:1px solid var(--bk-border);border-radius:8px;margin-bottom:8px;">
        <div>
          <div style="font-weight:700;font-size:13.5px;color:#fff;">${esc(p.name)}</div>
          <div style="font-size:11.5px;color:var(--bk-text-muted);">${esc(p.phone || "ללא טלפון")}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="bk-btn sm" onclick="window.Bootkeh.quickSeatSavedPlayer('${p.id}')">🪑 ${state.lang === "he" ? "הושב" : "Seat"}</button>
          <button type="button" class="bk-btn sm" style="color:#ef4444;" onclick="window.Bootkeh.deleteSavedPlayer('${p.id}')">✕</button>
        </div>
      </div>
    `).join("");
  }

  function addSavedPlayer() {
    const nameInput = $("#newPlayerName");
    const phoneInput = $("#newPlayerPhone");
    const name = nameInput ? nameInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";

    if (!name) return;
    state.savedPlayers.push({
      id: "sp_" + Math.random().toString(36).substring(2, 7),
      name,
      phone,
      notes: ""
    });
    saveSavedPlayers();
    if (nameInput) nameInput.value = "";
    if (phoneInput) phoneInput.value = "";
    renderSavedPlayersList();
  }

  function deleteSavedPlayer(id) {
    state.savedPlayers = state.savedPlayers.filter(p => p.id !== id);
    saveSavedPlayers();
    renderSavedPlayersList();
  }

  function quickSeatSavedPlayer(savedId) {
    const sp = state.savedPlayers.find(p => p.id === savedId);
    if (!sp) return;
    const inputs = $$(".bk-roster-name-input");
    const phoneInputs = $$(".bk-roster-phone-input");
    for (let i = 0; i < inputs.length; i++) {
      if (!inputs[i].value.trim()) {
        inputs[i].value = sp.name;
        if (phoneInputs[i]) phoneInputs[i].value = sp.phone;
        break;
      }
    }
    closeSavedPlayersModal();
  }

  // --- Attach Event Listeners ---
  function attachEventListeners() {
    // Player Count Slider
    const slider = $("#playerCountSlider");
    if (slider) {
      slider.addEventListener("input", (e) => {
        state.playerCount = parseInt(e.target.value, 10);
        renderSetupView();
        renderRosterInputs();
      });
    }

    // Script Selection Dropdown
    const scriptSelect = $("#scriptSelect");
    if (scriptSelect) {
      scriptSelect.addEventListener("change", (e) => {
        setScript(e.target.value);
      });
    }
  }

  // Fair shuffle (Fisher–Yates) with the browser's crypto random numbers. The old sort(() => Math.random() - .5)
  // was biased, and anyone could fix its result by replacing Math.random in the console.
  const RNG = window.crypto && crypto.getRandomValues.bind(crypto);
  function randInt(n) { if (!RNG) return Math.floor(Math.random() * n); const u = new Uint32Array(1), lim = Math.floor(0x100000000 / n) * n; do RNG(u); while (u[0] >= lim); return u[0] % n; }
  function fairShuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // --- Public API ---
  window.Bootkeh = {
    _state: state,
    liveGame,
    renderBoardView,
    init,
    createLiveGame,
    endLiveGame,
    savePreset,
    loadPreset,
    deletePreset,
    randomizeRoles,
    redeal,
    sendAllWhatsapp,
    sendEachWhatsapp,
    getThemeTitle,
    getRole,
    setThemeFam,
    genTheme,
    useGenTheme,
    readOpening,
    pushInfo,
    copyLiveLink,
    sendNextWhatsapp,
    setTab,
    toggleLanguage,
    setTheme,
    setScript,
    toggleRoleSelection,
    generateGame,
    toggleStorytellerView,
    toggleCardSecret,
    sendWhatsapp,
    copySecretText,
    startTimer,
    pauseTimer,
    resetTimer,
    addMinute,
    advancePhase,
    openSavedPlayersModal,
    closeSavedPlayersModal,
    addSavedPlayer,
    deleteSavedPlayer,
    quickSeatSavedPlayer,
    updateRosterItem,
    quickAssignRosterSeat,
    autoFillRosterFromSaved,
    clearRoster,
    toggleSentStatus,
    onRoleSearch,
    setRoleFilterCat,
    selectAllRoles,
    deselectAllRoles,
    generateRandomTheme,
    setCustomTheme,
    openPlayerPortal,
    toggleCurtain,
    sendSms,
    printSheet() {
      window.print();
    },
    openPlayerDetailsModal(playerId) {
      const p = state.players.find(x => x.id === playerId);
      if (!p) return;
      const status = p.isAlive ? (state.lang === "he" ? "חי 💚" : "Alive 💚") : (state.lang === "he" ? "מת 💀" : "Dead 💀");
      const confirmKill = confirm(`${p.name} (#${p.seat})\nתפקיד: ${state.lang === "he" ? p.role.name_he : p.role.name_en}\nסטטוס נוכחי: ${status}\n\nהאם לשנות סטטוס (חי / מת)?`);
      if (confirmKill) {
        p.isAlive = !p.isAlive;
        renderBoardView();
        if (window.BKLive) window.BKLive.syncSeats();   // everyone's phone sees who is alive
      }
    }
  };

  // Auto boot on DOM load
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 0);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
