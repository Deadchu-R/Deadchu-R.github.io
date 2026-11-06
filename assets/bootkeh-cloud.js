/* Bootkeh live games: temporary private pages for each player (window.BKCloud).
   The storyteller signs in anonymously (no account needed) and the game is saved in Cloud Firestore
   (same Firebase project as CV Studio, config in assets/cveditor-firebase.json):
     bk_games/<gameId>                {owner, title, createdAt, expiresAt}
     bk_games/<gameId>/p/<secretKey>  {owner, expiresAt, seat, name, role…, info, lang}
   Each player gets a link  …/Bootkeh/?g=<gameId>&k=<secretKey>  that shows only their own card and updates live
   when the storyteller changes their info. Security comes from firestore.rules:
     - only the storyteller who created a game can write or delete it;
     - a player page can be read only with its secret key (no listing) and only until expiresAt;
   so a link stops working when the game ends ("End game" deletes everything) or when it expires (a few hours). */
(function () {
  "use strict";
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const ME = (document.currentScript && document.currentScript.src) || location.href;
  const C = { ready: null, ok: false, uid: null, error: "" };
  let db = null, auth = null, FV = null;

  const script = src => new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.async = false; s.onload = ok; s.onerror = () => bad(new Error("could not load " + src)); document.head.appendChild(s); });
  // Random URL-safe id (crypto strength): 16 bytes ≈ 22 chars for keys, 10 bytes for game ids.
  const rid = n => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // Load Firebase once (players don't need to sign in; storytellers sign in anonymously when they publish).
  C.ready = (async () => {
    try {
      const r = await fetch(new URL("cveditor-firebase.json", ME).href, { cache: "no-cache" });
      const cfg = r.ok ? await r.json() : null;
      if (!cfg || !cfg.apiKey) throw new Error("not set up");
      await script(SDK + "firebase-app-compat.js");
      await script(SDK + "firebase-auth-compat.js");
      await script(SDK + "firebase-firestore-compat.js");
      const fb = window.firebase;
      const app = fb.apps.find(a => a.name === "bootkeh") || fb.initializeApp(cfg, "bootkeh");
      auth = app.auth(); db = app.firestore(); FV = fb.firestore;
      C.ok = true;
    } catch (e) { C.error = e.message || String(e); }
  })();

  // Sign the storyteller in anonymously (kept on this device, so they can manage their games after a refresh).
  async function storyteller() {
    await C.ready; if (!C.ok) throw new Error("Live links are not available (" + C.error + ")");
    if (auth.currentUser) return (C.uid = auth.currentUser.uid);
    await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    if (!auth.currentUser) await auth.signInAnonymously();
    return (C.uid = auth.currentUser.uid);
  }

  // Publish a game: one private page per player. players: [{seat,name,phone?,role:{…},alignment,info}]. Returns {gameId, links:{seat: url}, expiresAt}.
  C.createGame = async (title, players, hours, lang, script) => {
    const uid = await storyteller();
    hours = Math.min(12, Math.max(1, +hours || 6));
    const exp = FV.Timestamp.fromMillis(Date.now() + hours * 3600e3);
    // script: an array of roles, or {name, author, roles}
    const sc = Array.isArray(script) ? { roles: script } : (script || { roles: [] });
    const gameId = rid(10), b = db.batch(), base = location.origin + location.pathname.replace(/[^/]*$/, ""), links = {}, keys = {};
    // the shared, public part of the game (phase, who is alive, the current accusation, announcements)
    const seats = players.map(p => ({ seat: p.seat, name: String(p.name || "").slice(0, 60), alive: p.alive !== false, ghost: true }));
    b.set(db.collection("bk_games").doc(gameId), { owner: uid, title: String(title || "").slice(0, 120), createdAt: FV.FieldValue.serverTimestamp(), expiresAt: exp,
      lang: lang || "he", state: { phase: "lobby", day: 1, seats, nom: null, notice: null, rev: 1 },
      // the roles that can be in this game (public in Blood on the Clocktower) — shown to players in a pull-out list
      scriptName: String(sc.name || "").slice(0, 80), scriptAuthor: String(sc.author || "").slice(0, 60),
      script: (sc.roles || []).slice(0, 40).map(r => ({ id: r.id, icon: r.icon || "", type: r.type || "", name_he: r.name_he || "", name_en: r.name_en || "",
        ability_he: String(r.ability_he || "").slice(0, 400), ability_en: String(r.ability_en || "").slice(0, 400) })) });
    for (const p of players) {
      const key = rid(16); keys[p.seat] = key;
      const r = p.role || {};
      b.set(db.collection("bk_games").doc(gameId).collection("p").doc(key), {
        owner: uid, expiresAt: exp, seat: p.seat, name: String(p.name || "").slice(0, 60), lang: lang || "he", title: String(title || "").slice(0, 120),
        roleId: r.id || "", icon: r.icon || "", type: r.type || "", name_en: r.name_en || "", name_he: r.name_he || "",
        ability_en: r.ability_en || "", ability_he: r.ability_he || "", alignment: p.alignment || "good", info: String(p.info || "").slice(0, 2000),
        log: p.info ? [{ label: lang === "en" ? "Night 1" : "לילה 1", text: String(p.info).slice(0, 2000), at: Date.now() }] : [],
        vote: null, defense: null,
        wake: null, act: null, seen: null,
        updatedAt: FV.FieldValue.serverTimestamp()
      });
      links[p.seat] = `${base}?g=${gameId}&k=${key}`;
      // seat ticket for the one group link: a player who opens …?g=<game>&join takes their seat here once,
      // and only then may read the secret key of that seat (see firestore.rules, match /c/{seat})
      b.set(db.collection("bk_games").doc(gameId).collection("c").doc(String(p.seat)), { owner: uid, expiresAt: exp, seat: p.seat, key, claimedBy: null });
    }
    await b.commit();
    const saved = { gameId, keys, links, join: `${base}?g=${gameId}&join=1`, expiresAt: exp.toMillis(), title };
    try { localStorage.setItem("bk_live_game", JSON.stringify(saved)); } catch (e) {}
    return saved;
  };

  // Change what one player sees (night info), live on their page.
  C.updateInfo = async (gameId, key, info) => {
    await storyteller();
    await db.collection("bk_games").doc(gameId).collection("p").doc(key).update({ info: String(info || "").slice(0, 2000), updatedAt: FV.FieldValue.serverTimestamp() });
  };

  // Storyteller: change the shared game state (phase, seats, accusation, notice). patch = {phase:…, day:…, …}
  C.setState = async (gameId, patch) => {
    await storyteller();
    const u = { "state.rev": FV.FieldValue.increment(1) };
    for (const [k, v] of Object.entries(patch)) u["state." + k] = v;
    await db.collection("bk_games").doc(gameId).update(u);
  };

  // Storyteller: send each player their info for this phase in one go. items: [{key, text, label}]
  C.pushInfos = async (gameId, items) => {
    await storyteller();
    const b = db.batch();
    for (const it of items) {
      const ref = db.collection("bk_games").doc(gameId).collection("p").doc(it.key);
      b.update(ref, { info: String(it.text || "").slice(0, 2000), log: FV.FieldValue.arrayUnion({ label: String(it.label || "").slice(0, 40), text: String(it.text || "").slice(0, 2000), at: Date.now() }), updatedAt: FV.FieldValue.serverTimestamp() });
    }
    await b.commit();
  };

  // Storyteller: watch all player pages of the game (their votes and defences). cb({seat: data})
  C.watchPlayers = async (gameId, cb) => {
    const uid = await storyteller();
    return db.collection("bk_games").doc(gameId).collection("p").where("owner", "==", uid).onSnapshot(q => {
      const out = {}; q.forEach(d => { const x = d.data(); out[x.seat] = x; }); cb(out);
    }, e => console.warn("watchPlayers", e.message));
  };

  // Anyone with the link (storyteller or player): watch the shared game state. cb(state|null)
  C.watchGame = async (gameId, cb) => {
    await C.ready; if (!C.ok) { cb(null); return () => {}; }
    return db.collection("bk_games").doc(gameId).onSnapshot(d => cb(d.exists ? Object.assign({ title: d.data().title, lang: d.data().lang, script: d.data().script || [], scriptName: d.data().scriptName || "", scriptAuthor: d.data().scriptAuthor || "" }, d.data().state || {}) : null), () => cb(null));
  };

  // Player: vote on the open accusation ("yes" / "no"), from their own private page.
  C.vote = async (gameId, key, nomId, v) => {
    await C.ready;
    await db.collection("bk_games").doc(gameId).collection("p").doc(key).update({ vote: { nom: nomId, v: v === "yes" ? "yes" : "no", at: Date.now() } });
  };

  // ---- the night, step by step ----
  // Storyteller: wake one player — their phone asks them to choose. wake = {id, n, text, self, dead} (null = go back to sleep)
  C.wake = async (gameId, key, wake) => {
    await storyteller();
    await db.collection("bk_games").doc(gameId).collection("p").doc(key).update({ wake: wake || null });
  };
  // Player: answer the wake-up (the seats they chose).
  C.act = async (gameId, key, wakeId, targets, roles) => {
    await C.ready;
    await db.collection("bk_games").doc(gameId).collection("p").doc(key).update({ act: { wake: wakeId, targets: (targets || []).slice(0, 4).map(Number), roles: (roles || []).slice(0, 3).map(String), at: Date.now() } });
  };
  // Storyteller: a player's character changed (Pit-Hag, Snake Charmer swap, a Minion becomes the Imp…) — their card updates.
  C.setRole = async (gameId, key, r, alignment) => {
    await storyteller();
    await db.collection("bk_games").doc(gameId).collection("p").doc(key).update({ roleId: r.id || "", icon: r.icon || "", type: r.type || "", name_en: r.name_en || "", name_he: r.name_he || "",
      ability_en: r.ability_en || "", ability_he: r.ability_he || "", alignment: alignment || "good", updatedAt: FV.FieldValue.serverTimestamp() });
  };
  // Player: "Got it" — they saw their latest info (the storyteller sees a ✓ and moves on).
  C.seen = async (gameId, key, infoAt) => {
    await C.ready;
    await db.collection("bk_games").doc(gameId).collection("p").doc(key).update({ seen: { at: infoAt || 0, when: Date.now() } });
  };

  // Player: write a defence (or an accusation speech) for the open accusation.
  C.defend = async (gameId, key, nomId, text) => {
    await C.ready;
    await db.collection("bk_games").doc(gameId).collection("p").doc(key).update({ defense: { nom: nomId, text: String(text || "").slice(0, 600), at: Date.now() } });
  };

  // ---- one link for the whole group ----
  // Storyteller: watch which seats were taken. cb({seat: claimedBy|null})
  C.watchClaims = async (gameId, cb) => {
    const uid = await storyteller();
    return db.collection("bk_games").doc(gameId).collection("c").where("owner", "==", uid).onSnapshot(q => {
      const out = {}; q.forEach(d => { const x = d.data(); out[x.seat] = x.claimedBy || null; }); cb(out);
    }, e => console.warn("watchClaims", e.message));
  };
  // Storyteller: free a seat that the wrong person took.
  C.releaseSeat = async (gameId, seat) => {
    await storyteller();
    await db.collection("bk_games").doc(gameId).collection("c").doc(String(seat)).update({ claimedBy: null });
    await db.collection("bk_games").doc(gameId).collection("t").doc(String(seat)).delete().catch(() => {});
  };
  // Player: take a seat from the group link. Returns the seat's secret key, or throws "taken".
  C.claimSeat = async (gameId, seat) => {
    const uid = await storyteller();   // players sign in anonymously too, so the seat is tied to this phone
    const ref = db.collection("bk_games").doc(gameId).collection("c").doc(String(seat));
    const mine = async () => { try { const d = await ref.get(); return d.exists && d.data().claimedBy === uid ? d.data().key : null; } catch (e) { return null; } };
    let k = await mine(); if (k) return k;
    try { await ref.update({ claimedBy: uid }); } catch (e) { throw new Error("taken"); }
    k = await mine(); if (!k) throw new Error("taken");
    // tell everyone (the other phones on the group link, and the storyteller) that this seat is taken
    try { await db.collection("bk_games").doc(gameId).collection("t").doc(String(seat)).set({ seat: +seat, by: uid }); } catch (e) { console.warn("taken flag", e.message); }
    return k;
  };
  // Anyone with the group link: watch which seats are already taken. cb({seat: true})
  C.watchTaken = async (gameId, cb) => {
    await C.ready; if (!C.ok) { cb({}); return () => {}; }
    return db.collection("bk_games").doc(gameId).collection("t").onSnapshot(q => { const o = {}; q.forEach(d => { o[d.data().seat] = true; }); cb(o); }, e => console.warn("watchTaken", e.message));
  };

  // End the game: delete every page of it (links stop working right away).
  C.endGame = async gameId => {
    const uid = await storyteller();
    const ps = await db.collection("bk_games").doc(gameId).collection("p").where("owner", "==", uid).get();
    const cs = await db.collection("bk_games").doc(gameId).collection("c").where("owner", "==", uid).get();
    const ts = await db.collection("bk_games").doc(gameId).collection("t").get().catch(() => ({ forEach() {} }));
    const b = db.batch(); ps.forEach(d => b.delete(d.ref)); cs.forEach(d => b.delete(d.ref)); ts.forEach(d => b.delete(d.ref)); b.delete(db.collection("bk_games").doc(gameId));
    await b.commit();
    try { const s = JSON.parse(localStorage.getItem("bk_live_game") || "null"); if (s && s.gameId === gameId) localStorage.removeItem("bk_live_game"); } catch (e) {}
  };

  // Tidy up: delete this storyteller's games that already expired (they can't be opened anyway).
  C.cleanup = async () => {
    try {
      const uid = await storyteller();
      const old = await db.collection("bk_games").where("owner", "==", uid).get();
      for (const g of old.docs) if (g.data().expiresAt && g.data().expiresAt.toMillis() < Date.now()) await C.endGame(g.id);
    } catch (e) { /* best effort */ }
  };

  // The game this device published last (still running?), or null.
  C.saved = () => { try { const s = JSON.parse(localStorage.getItem("bk_live_game") || "null"); return s && s.expiresAt > Date.now() ? s : null; } catch (e) { return null; } };

  // Player side: watch one page. cb(data) on every change; cb(null, reason) when it's gone/expired.
  C.watchPlayer = async (gameId, key, cb) => {
    await C.ready; if (!C.ok) { cb(null, "offline"); return () => {}; }
    let timer = null;
    return db.collection("bk_games").doc(gameId).collection("p").doc(key).onSnapshot(
      d => {
        if (!d.exists) return cb(null, "ended");
        const x = d.data(), left = x.expiresAt ? x.expiresAt.toMillis() - Date.now() : 0;
        if (left <= 0) return cb(null, "expired");
        clearTimeout(timer); timer = setTimeout(() => cb(null, "expired"), Math.min(left, 2147e6));   // close the page at expiry
        cb(x);
      },
      () => cb(null, "ended")
    );
  };

  window.BKCloud = C;
})();
