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
  C.createGame = async (title, players, hours, lang) => {
    const uid = await storyteller();
    hours = Math.min(12, Math.max(1, +hours || 6));
    const exp = FV.Timestamp.fromMillis(Date.now() + hours * 3600e3);
    const gameId = rid(10), b = db.batch(), base = location.origin + location.pathname.replace(/[^/]*$/, ""), links = {}, keys = {};
    b.set(db.collection("bk_games").doc(gameId), { owner: uid, title: String(title || "").slice(0, 120), createdAt: FV.FieldValue.serverTimestamp(), expiresAt: exp });
    for (const p of players) {
      const key = rid(16); keys[p.seat] = key;
      const r = p.role || {};
      b.set(db.collection("bk_games").doc(gameId).collection("p").doc(key), {
        owner: uid, expiresAt: exp, seat: p.seat, name: String(p.name || "").slice(0, 60), lang: lang || "he", title: String(title || "").slice(0, 120),
        roleId: r.id || "", icon: r.icon || "", type: r.type || "", name_en: r.name_en || "", name_he: r.name_he || "",
        ability_en: r.ability_en || "", ability_he: r.ability_he || "", alignment: p.alignment || "good", info: String(p.info || "").slice(0, 2000),
        updatedAt: FV.FieldValue.serverTimestamp()
      });
      links[p.seat] = `${base}?g=${gameId}&k=${key}`;
    }
    await b.commit();
    const saved = { gameId, keys, links, expiresAt: exp.toMillis(), title };
    try { localStorage.setItem("bk_live_game", JSON.stringify(saved)); } catch (e) {}
    return saved;
  };

  // Change what one player sees (night info), live on their page.
  C.updateInfo = async (gameId, key, info) => {
    await storyteller();
    await db.collection("bk_games").doc(gameId).collection("p").doc(key).update({ info: String(info || "").slice(0, 2000), updatedAt: FV.FieldValue.serverTimestamp() });
  };

  // End the game: delete every page of it (links stop working right away).
  C.endGame = async gameId => {
    const uid = await storyteller();
    const ps = await db.collection("bk_games").doc(gameId).collection("p").where("owner", "==", uid).get();
    const b = db.batch(); ps.forEach(d => b.delete(d.ref)); b.delete(db.collection("bk_games").doc(gameId));
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
