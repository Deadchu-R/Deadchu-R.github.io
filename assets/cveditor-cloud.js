/* CVEditor cloud accounts: real "Sign in with Google" (Firebase Authentication) and a private résumé vault per user
   (Cloud Firestore, document vaults/<uid>). Only the signed-in user can read or write their own vault: that is enforced
   by the Firestore security rules in firestore.rules (not by this code), so nobody else — not even the site owner —
   can open someone's résumés.

   Setup: fill assets/cveditor-firebase.json with the web app config from the Firebase console (see docs/CVEDITOR-ACCOUNTS.md).
   The config is public by design (it only names the project); the security comes from the rules.
   While the file is empty, RTCloud.configured stays false and the editor works without accounts.

   API (window.RTCloud):
     ready            Promise, resolves after the config was read and Firebase loaded (or not configured)
     configured       true when Google sign-in can be used
     onUser(cb)       cb(user|null) whenever the signed-in user changes; user = {uid, email, name, photo, verified}
     signIn()         opens Google's account chooser
     signOut()
     load(uid)        → the user's résumés {id: cv, …} ({} when new)
     save(uid, cvs)   saves them (debounced, ~1.2 s); returns a Promise for the write
*/
(function () {
  "use strict";
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const ME = (document.currentScript && document.currentScript.src) || location.href;
  const cloud = { configured: false, user: null, resolved: false };   // resolved: the first sign-in state is known
  let auth = null, db = null, listeners = [], saveTimer = null, pending = null;

  // Load one script tag and wait for it.
  const script = src => new Promise((ok, bad) => {
    const s = document.createElement("script"); s.src = src; s.async = false;
    s.onload = ok; s.onerror = () => bad(new Error("could not load " + src)); document.head.appendChild(s);
  });

  // The signed-in Firebase user in the small shape the editor uses.
  const shape = u => u && { uid: u.uid, email: (u.email || "").toLowerCase(), name: u.displayName || "", photo: u.photoURL || "", verified: !!u.emailVerified };

  cloud.ready = (async () => {
    let cfg = null;
    try {
      const r = await fetch(new URL("cveditor-firebase.json", ME).href, { cache: "no-cache" });
      if (r.ok) cfg = await r.json();
    } catch (e) { /* no config file */ }
    if (!cfg || !cfg.apiKey || !cfg.projectId) { cloud.resolved = true; console.info("CVEditor: Google sign-in is not set up (assets/cveditor-firebase.json is empty)."); return; }
    try {
      await script(SDK + "firebase-app-compat.js");
      await script(SDK + "firebase-auth-compat.js");
      await script(SDK + "firebase-firestore-compat.js");
      const app = window.firebase.initializeApp(cfg);
      auth = app.auth(); db = app.firestore();
      await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);   // stay signed in on this device until Sign out
      cloud.configured = true;
      auth.onAuthStateChanged(u => { cloud.user = shape(u); cloud.resolved = true; listeners.forEach(cb => { try { cb(cloud.user); } catch (e) { console.error(e); } }); });
      auth.getRedirectResult().catch(e => console.warn("Google sign-in:", e.message));
    } catch (e) {
      cloud.resolved = true;
      console.warn("CVEditor: Google sign-in could not start:", e.message);
    }
  })();

  cloud.onUser = cb => { listeners.push(cb); if (cloud.configured) cb(cloud.user); };

  cloud.signIn = async () => {
    await cloud.ready;
    if (!cloud.configured) throw new Error("Google sign-in isn't switched on yet.");
    const p = new window.firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });   // always show the account chooser
    try { await auth.signInWithPopup(p); }
    catch (e) {
      // popups blocked (some phones / in-app browsers): go to Google's page and come back
      if (/popup-blocked|operation-not-supported|cancelled-popup/.test(e.code || "")) return auth.signInWithRedirect(p);
      if (/popup-closed-by-user/.test(e.code || "")) return;
      throw e;
    }
  };

  // Switch account: save what is pending, then open Google's account chooser; the new account replaces the current one.
  cloud.switchAccount = async () => { await cloud.flush(); return cloud.signIn(); };

  cloud.signOut = async () => { await cloud.flush(); if (auth) await auth.signOut(); };

  cloud.load = async uid => {
    const snap = await db.collection("vaults").doc(uid).get();
    const d = snap.exists ? snap.data() : null;
    return (d && d.cvs && typeof d.cvs === "object") ? d.cvs : {};
  };

  // Write now (used by save after the pause, and before signing out).
  cloud.flush = async () => {
    clearTimeout(saveTimer);
    if (!pending) return;
    const { uid, cvs } = pending; pending = null;
    const json = JSON.stringify(cvs);
    if (json.length > 950000) throw new Error("Your résumés are too big to save (pictures?). Use a smaller photo.");
    await db.collection("vaults").doc(uid).set({ cvs: JSON.parse(json), updated: window.firebase.firestore.FieldValue.serverTimestamp() });
  };

  cloud.save = (uid, cvs) => {
    if (!cloud.configured || !uid) return Promise.resolve();
    pending = { uid, cvs };
    clearTimeout(saveTimer);
    return new Promise((ok, bad) => { saveTimer = setTimeout(() => cloud.flush().then(ok, bad), 1200); });
  };

  addEventListener("pagehide", () => { if (pending) cloud.flush().catch(() => {}); });
  window.RTCloud = cloud;
})();
