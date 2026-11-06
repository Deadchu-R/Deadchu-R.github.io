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
    storytellerName: "רועי / Sit",
    customRoles: [],
    players: [],
    savedPlayers: [],
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
      tabSetup: "🎲 יצירת משחק",
      tabBoard: "⭕ מעגל ישיבה וגרימואר",
      tabSheet: "📜 דף תפקידים (Script Sheet)",
      tabCards: "🃏 קלפי שחקנים ו-WhatsApp",
      savedPlayersBtn: "👥 שחקנים שמורים",
      langToggle: "English 🇬🇧",
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
      advancedSettings: "⚙️ הגדרות מתקדמות — בחירת תפקידים מדויקת",
      playerRosterLabel: "שמות השחקנים וטלפון (להודעות WhatsApp):",
      generateBtn: "⚡ ג'נרט משחק והושב שחקנים!",
      seatToggleStoryteller: "עין מספר הסיפורים (הצג תפקידים)",
      seatToggleSpectator: "מצב שחקנים (הסתר ספוילרים למסך)",
      timerDay: "☀️ שלב היום (דיון חופשי)",
      timerNomination: "⚖️ שלב הוצאות להורג",
      timerNight: "🌙 שלב הלילה (כולם עוצמים עיניים)",
      timerStart: "▶ הפעל טיימר",
      timerPause: "⏸ השהה",
      timerReset: "↺ איפוס",
      timerAddMin: "＋ 1 דקה",
      nextPhase: "עבור לשלב הבא ➔",
      printSheet: "🖨️ הדפס דף תפקידים (PDF / Print)",
      shareWhatsapp: "📱 שלח תפקיד ב-WhatsApp",
      copySecret: "📋 העתק טקסט סודי",
      secretRevealed: "לחץ להסתרת התפקיד",
      secretHidden: "👁️ לחץ לחשיפת התפקיד הסודי",
      firstNightTitle: "מידע התחלתי ללילה ראשון:",
      abilityTitle: "יכולת הדמות:",
      alive: "חי",
      dead: "מת",
      ghostVote: "קול רפאים זמין",
      savePlayerSuccess: "השחקן נשמר בהצלחה!",
      whatsappSent: "נפתח חלון WhatsApp לשליחה!",
      copySuccess: "המידע הועתק ללוח!",
      addSavedPlayer: "＋ הוסף שחקן שמור",
      savedPlayersTitle: "ספר השחקנים השמורים (לשליחה מהירה ב-WhatsApp)",
      namePlaceholder: "שם שחקן",
      phonePlaceholder: "טלפון (למשל: 054-1234567)"
    },
    en: {
      siteTitle: "Bootkeh — Blood on the Clocktower",
      tabSetup: "🎲 Game Setup",
      tabBoard: "⭕ Seating & Grimoire",
      tabSheet: "📜 Character Sheet",
      tabCards: "🃏 Player Cards & WhatsApp",
      savedPlayersBtn: "👥 Saved Players",
      langToggle: "עברית 🇮🇱",
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
      advancedSettings: "⚙️ Advanced Settings — Exact Role Selection",
      playerRosterLabel: "Player Names & Phone (for WhatsApp sharing):",
      generateBtn: "⚡ Generate Game & Seat Players!",
      seatToggleStoryteller: "Storyteller Eye (Show Roles)",
      seatToggleSpectator: "Spectator Mode (Hide Spoilers for TV)",
      timerDay: "☀️ Day Phase (Town Discussion)",
      timerNomination: "⚖️ Executions & Nominations",
      timerNight: "🌙 Night Phase (Eyes Closed)",
      timerStart: "▶ Start Timer",
      timerPause: "⏸ Pause",
      timerReset: "↺ Reset",
      timerAddMin: "＋ 1 Min",
      nextPhase: "Advance Phase ➔",
      printSheet: "🖨️ Print Character Sheet (PDF)",
      shareWhatsapp: "📱 Send via WhatsApp",
      copySecret: "📋 Copy Secret Info",
      secretRevealed: "Click to hide secret role",
      secretHidden: "👁️ Click to reveal secret role",
      firstNightTitle: "First Night Starting Info:",
      abilityTitle: "Character Ability:",
      alive: "Alive",
      dead: "Dead",
      ghostVote: "Ghost vote available",
      savePlayerSuccess: "Player saved successfully!",
      whatsappSent: "WhatsApp chat opened!",
      copySuccess: "Secret info copied to clipboard!",
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

  // --- Initialization ---
  function init() {
    loadSavedPlayers();
    initThemeSelection();
    initCustomRolesMatrix();
    updateLanguage();
    renderSetupView();
    attachEventListeners();
    generateGame(false); // prepare initial game data silently
    setTab("setup");     // start on Setup view as requested
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
        { id: "p8", name: "יוסי / Yossi", phone: "", notes: "" }
      ];
    } catch (_) {
      state.savedPlayers = [];
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
    if (tab === "board") renderBoardView();
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
    const catMap = {
      townsfolk: { title_en: "Townsfolk", title_he: "תושבי העיירה", color: "#38bdf8" },
      outsider: { title_en: "Outsiders", title_he: "אאוטסיידרים", color: "#2dd4bf" },
      minion: { title_en: "Minions", title_he: "משרתים", color: "#f97316" },
      demon: { title_en: "Demons", title_he: "שדים", color: "#ef4444" }
    };

    let html = "";
    ["townsfolk", "outsider", "minion", "demon"].forEach(cat => {
      const rolesInCat = allRoles.filter(r => r.type === cat);
      html += `
        <div class="bk-role-matrix-category">
          <div class="bk-role-matrix-title" style="color:${catMap[cat].color};">
            <span>${state.lang === "he" ? catMap[cat].title_he : catMap[cat].title_en}</span>
            <span style="font-size:11px;opacity:0.7;">(${rolesInCat.length})</span>
          </div>
          <div class="bk-role-chips">
            ${rolesInCat.map(r => `
              <div class="bk-role-chip ${cat}" id="chip-${r.id}" onclick="window.Bootkeh.toggleRoleSelection('${r.id}')">
                <span>${r.icon}</span>
                <span>${state.lang === "he" ? r.name_he : r.name_en}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    });
    matrix.innerHTML = html;
  }

  function updateCustomRoleChips() {
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
    const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

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

    // Prepare player names from roster inputs or saved directory
    const playerInputs = $$(".bk-roster-name-input");
    const phoneInputs = $$(".bk-roster-phone-input");

    const players = [];
    for (let i = 0; i < count; i++) {
      const name = (playerInputs[i] && playerInputs[i].value.trim()) || 
                   (state.savedPlayers[i] && state.savedPlayers[i].name) || 
                   `${state.lang === "he" ? "שחקן" : "Player"} ${i + 1}`;
      const phone = (phoneInputs[i] && phoneInputs[i].value.trim()) || 
                    (state.savedPlayers[i] && state.savedPlayers[i].phone) || "";

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
        firstNightInfo: ""
      });
    }

    state.players = players;

    // Generate dynamic First Night Info for each player
    computeFirstNightInfo(players, rolesInPlay, poolRoles);

    // Render updated views
    renderBoardView();
    renderSheetView();
    renderCardsView();
    if (autoSwitch) {
      setTab("board");
      SoundFX.playGong();
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
  function renderBoardView() {
    const container = $("#seatingCircle");
    if (!container) return;

    const N = state.players.length;
    if (N === 0) return;

    // Radius of circular seating
    const R = 280;
    const centerX = 340;
    const centerY = 340;

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
      const x = Math.round(centerX + R * Math.cos(angle));
      const y = Math.round(centerY + R * Math.sin(angle));

      const isRevealed = state.isStorytellerView;
      const roleName = isRevealed ? (state.lang === "he" ? p.role.name_he : p.role.name_en) : (state.lang === "he" ? "מושב" : "Seat");
      const icon = isRevealed ? p.role.icon : "👤";
      const alignClass = isRevealed ? p.alignment : "";
      const statusClass = p.isAlive ? "" : "dead";

      html += `
        <div class="bootkeh-seat-node ${alignClass} ${statusClass}" 
             style="left:${x}px;top:${y}px;" 
             onclick="window.Bootkeh.openPlayerDetailsModal('${p.id}')"
             title="${esc(p.name)} (${esc(roleName)})">
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

    grid.innerHTML = state.players.map(p => {
      const r = p.role;
      const roleName = state.lang === "he" ? r.name_he : r.name_en;
      const ability = state.lang === "he" ? r.ability_he : r.ability_en;

      return `
        <div class="bootkeh-player-card">
          <div class="bootkeh-player-card-header">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">${p.alignment === "evil" ? "😈" : "🛡️"}</span>
              <span style="font-weight:700;font-size:14px;color:#fff;">#${p.seat} ${esc(p.name)}</span>
            </div>
            <button type="button" class="bk-btn sm" onclick="window.Bootkeh.toggleCardSecret('${p.id}')">
              ${p.isRevealed ? t.secretRevealed : t.secretHidden}
            </button>
          </div>
          <div class="bootkeh-player-card-body">
            <div style="display:${p.isRevealed ? "block" : "none"};">
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
                <div>${esc(p.firstNightInfo)}</div>
              </div>
            </div>

            <div style="display:flex;gap:8px;margin-top:auto;padding-top:10px;">
              <button type="button" class="bk-btn pri sm" style="flex:1;justify-content:center;" onclick="window.Bootkeh.sendWhatsapp('${p.id}')">
                <span>${t.shareWhatsapp}</span>
              </button>
              <button type="button" class="bk-btn sm" onclick="window.Bootkeh.copySecretText('${p.id}')" title="${t.copySecret}">
                <span>📋</span>
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

    const cleanPhone = (p.phone || "").replace(/[^0-9]/g, "");
    let url = "";
    if (cleanPhone) {
      url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    }

    window.open(url, "_blank");
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

  // --- Public API ---
  window.Bootkeh = {
    init,
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
