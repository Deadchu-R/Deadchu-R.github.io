/* Bootkeh rules helper (window.BKRules) — the parts of Blood on the Clocktower a fair deal needs, learned from a
   friend's storyteller generator (github.com/ItaiSitnik/Main, BOTC):
     - roles that don't know what they are: the Drunk thinks it is a Townsfolk, the Lunatic thinks it is the Demon,
       the Marionette thinks it is a good character (the player sees the role they "think", the storyteller sees both);
     - one fixed red herring for the Fortune Teller; demon bluffs that never include a role someone "thinks" they are;
     - setup changes: Baron +2 Outsiders, Fang Gu +1, Vigormortis −1, Godfather ±1;
     - first-night info for every info role, with a TRUE version and FALSE versions ready (for a drunk or poisoned
       player), and suggestions for later nights (Empath, Undertaker, Oracle, Fortune Teller…);
     - who wakes when (night order), and quick messages ("You died tonight", "You are now evil"…).
   Everything here is pure: it reads the dealt players and returns text / data; bootkeh.js and bootkeh-live.js use it. */
(function () {
  "use strict";
  const RNG = window.crypto && crypto.getRandomValues.bind(crypto);
  const rint = n => { if (!RNG || n < 2) return Math.floor(Math.random() * n); const u = new Uint32Array(1), lim = Math.floor(0x100000000 / n) * n; do RNG(u); while (u[0] >= lim); return u[0] % n; };
  const pick = a => a.length ? a[rint(a.length)] : null;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const roles = () => window.BOOTKEH_ROLES || [];
  const role = id => roles().find(r => r.id === id);
  const GOOD = ["townsfolk", "outsider"], EVIL = ["minion", "demon"];
  const isEvilType = t => EVIL.includes(t);

  // --- setup: change the Outsider count for roles that do that (returns the change) ---
  function outsiderChange(minions, demons) {
    let d = 0;
    if (minions.some(m => m.id === "baron")) d += 2;
    if (minions.some(m => m.id === "godfather")) d += 1;   // the Godfather may be −1 or +1; +1 here (the storyteller can redeal)
    if (demons.some(x => x.id === "fang_gu")) d += 1;
    if (demons.some(x => x.id === "vigormortis")) d -= 1;
    return d;
  }

  // --- after the deal: who thinks they are what, red herring, bluffs. players: [{seat,name,role,alignment}], pool: roles of the set ---
  function setup(players, pool) {
    const inPlay = new Set(players.map(p => p.role.id));
    const poolTf = pool.filter(r => r.type === "townsfolk"), poolGood = pool.filter(r => GOOD.includes(r.type));
    const notIn = list => list.filter(r => !inPlay.has(r.id));
    const reserved = new Set();
    const fakeTownsfolk = () => { const c = notIn(poolTf).filter(r => !reserved.has(r.id)); const r = pick(c.length ? c : notIn(roles().filter(x => x.type === "townsfolk")).filter(x => !reserved.has(x.id))); if (r) reserved.add(r.id); return r; };
    const demon = players.find(p => p.role.type === "demon");
    for (const p of players) {
      p.thinks = null; p.isDrunk = false;
      if (p.role.id === "drunk") { const r = fakeTownsfolk(); if (r) { p.thinks = r.id; p.isDrunk = true; } }
      if (p.role.id === "marionette") { const r = fakeTownsfolk(); if (r) p.thinks = r.id; }
      if (p.role.id === "lunatic" && demon) p.thinks = demon.role.id;
    }
    const goodPlayers = players.filter(p => GOOD.includes(p.role.type) && p.role.id !== "drunk");
    const redHerring = pick(goodPlayers) || null;
    const bluffPool = notIn(poolGood).filter(r => !reserved.has(r.id));
    const bluffs = shuffle(bluffPool.length >= 3 ? bluffPool : notIn(roles().filter(r => GOOD.includes(r.type))).filter(r => !reserved.has(r.id))).slice(0, 3);
    return { redHerring: redHerring ? redHerring.seat : null, bluffs: bluffs.map(r => r.id) };
  }

  // the role a player sees on their card / page
  const shown = p => (p.thinks && role(p.thinks)) || p.role;
  const shownAlignment = p => p.role.id === "lunatic" ? "evil" : p.role.id === "marionette" ? "good" : p.alignment;
  // does this player register as evil (Recluse / Spy can go either way — the true answer uses their real alignment)
  const evil = p => p.alignment === "evil";

  // --- text helpers (Hebrew / English) ---
  const L = lang => lang === "en" ? "en" : "he";
  const nm = (r, lang) => r ? (L(lang) === "he" ? r.name_he : r.name_en) : "";
  const say = (lang, he, en) => L(lang) === "he" ? he : en;
  function neighbours(players, p, aliveOnly) {
    const ring = aliveOnly ? players.filter(x => x.isAlive !== false || x === p) : players, n = ring.length, i = ring.indexOf(p);
    return n < 2 ? [] : [ring[(i - 1 + n) % n], ring[(i + 1) % n]].filter((x, k, a) => x !== p && a.indexOf(x) === k);
  }
  // "1 of these 2 players is the X": the holder and a decoy (never the asker), in random order
  function pairWith(players, asker, target) {
    const decoys = players.filter(x => x !== asker && x !== target && x.role.type !== "demon");
    const pair = shuffle([target, pick(decoys) || players.find(x => x !== asker && x !== target)]);
    return pair.filter(Boolean).map(x => x.name);
  }
  function fakePair(players, asker, notHolderOf) {
    return shuffle(players.filter(x => x !== asker && x.role.id !== notHolderOf)).slice(0, 2).map(x => x.name);
  }

  // --- first night: {truth, lies:[...], note} for one player. ctx = {players, pool, rules:{redHerring,bluffs}, lang} ---
  function firstNight(p, ctx) {
    const { players, lang } = ctx, pool = ctx.pool || [], rules = ctx.rules || {};
    const r = shown(p), real = p.role, out = { truth: "", lies: [], note: "" };
    const demons = players.filter(x => x.role.type === "demon"), minions = players.filter(x => x.role.type === "minion");
    const bluffs = (rules.bluffs || []).map(role).filter(Boolean);
    const names = list => list.map(x => x.name).join(", ");
    const tf = players.filter(x => x.role.type === "townsfolk"), os = players.filter(x => x.role.type === "outsider");
    const one = (target, r2) => say(lang, `אחד מהשניים האלה הוא ${nm(r2, lang)}: ${pairWith(players, p, target).join(" או ")}.`, `One of these two is the ${nm(r2, lang)}: ${pairWith(players, p, target).join(" or ")}.`);
    const fakeOne = r2 => say(lang, `אחד מהשניים האלה הוא ${nm(r2, lang)}: ${fakePair(players, p, r2.id).join(" או ")}.`, `One of these two is the ${nm(r2, lang)}: ${fakePair(players, p, r2.id).join(" or ")}.`);

    // evil team info (the Lunatic gets made-up evil info; the Marionette isn't shown to the Minions)
    if (real.type === "demon") {
      const ms = minions;
      out.truth = say(lang, `המשרתים שלך: ${names(ms) || "אין"}. שלושה תפקידים שלא במשחק (בלופים בטוחים): ${bluffs.map(b => nm(b, lang)).join(", ")}.`,
                            `Your Minions: ${names(ms) || "none"}. Three good roles not in play (safe bluffs): ${bluffs.map(b => nm(b, lang)).join(", ")}.`);
      const lun = players.find(x => x.role.id === "lunatic"), mar = players.find(x => x.role.id === "marionette");
      if (lun) out.truth += say(lang, ` ${lun.name} הוא חולה הירח — הוא חושב שהוא השד.`, ` ${lun.name} is the Lunatic — they think they are the Demon.`);
      if (mar) out.truth += say(lang, ` ${mar.name} הוא המריונטה שלך — הוא חושב שהוא טוב.`, ` ${mar.name} is your Marionette — they think they are good.`);
      return out;
    }
    if (real.id === "lunatic") {
      const fakeMinions = shuffle(players.filter(x => x !== p && x.role.type !== "demon")).slice(0, Math.max(1, minions.length)), fb = shuffle(roles().filter(x => GOOD.includes(x.type) && !players.some(y => y.role.id === x.id))).slice(0, 3);
      out.truth = say(lang, `המשרתים שלך: ${names(fakeMinions)}. שלושה תפקידים שלא במשחק (בלופים בטוחים): ${fb.map(b => nm(b, lang)).join(", ")}.`,
                            `Your Minions: ${names(fakeMinions)}. Three good roles not in play (safe bluffs): ${fb.map(b => nm(b, lang)).join(", ")}.`);
      out.note = say(lang, "חולה הירח: המידע מזויף בכוונה — הוא חושב שהוא השד.", "Lunatic: this info is made up on purpose — they think they are the Demon.");
      return out;
    }
    if (real.type === "minion" && real.id !== "marionette") {
      const others = minions.filter(x => x !== p && x.role.id !== "marionette");
      out.truth = say(lang, `השד שלך: ${names(demons) || "לא ידוע"}.${others.length ? ` משרתים נוספים: ${names(others)}.` : ""}`, `Your Demon: ${names(demons) || "unknown"}.${others.length ? ` Other Minions: ${names(others)}.` : ""}`);
      if (players.some(x => x.role.id === "damsel")) out.truth += say(lang, " העלמה במצוקה נמצאת במשחק.", " The Damsel is in play.");
      return out;
    }

    // good info roles (the Drunk / Marionette get the role they think they are, with FALSE info)
    const drunk = p.isDrunk || real.id === "marionette";
    const empathN = q => neighbours(players, q, true).filter(evil).length;
    switch (r.id) {
      case "empath": { const n = empathN(p); out.truth = say(lang, `מספר השכנים הרעים שלך: ${n}.`, `Evil neighbours: ${n}.`); out.lies = [0, 1, 2].filter(x => x !== n).map(x => say(lang, `מספר השכנים הרעים שלך: ${x}.`, `Evil neighbours: ${x}.`)); break; }
      case "chef": { let k = 0; for (let i = 0; i < players.length; i++) if (evil(players[i]) && evil(players[(i + 1) % players.length])) k++;
        out.truth = say(lang, `זוגות רעים שיושבים זה ליד זה: ${k}.`, `Pairs of evil players sitting together: ${k}.`); out.lies = [0, 1, 2].filter(x => x !== k).map(x => say(lang, `זוגות רעים שיושבים זה ליד זה: ${x}.`, `Pairs of evil players sitting together: ${x}.`)); break; }
      case "washerwoman": { const t = pick(tf.filter(x => x !== p)); out.truth = t ? one(t, t.role) : ""; const fr = pick(pool.filter(x => x.type === "townsfolk")); if (fr) out.lies = [fakeOne(fr)]; break; }
      case "librarian": { const t = pick(os); out.truth = t ? one(t, t.role) : say(lang, "אין אף אאוטסיידר במשחק.", "Zero Outsiders are in play.");
        out.lies = [say(lang, "אין אף אאוטסיידר במשחק.", "Zero Outsiders are in play."), ...pool.filter(x => x.type === "outsider").slice(0, 3).map(fakeOne)].filter(x => x !== out.truth); break; }
      case "investigator": { const t = pick(minions); out.truth = t ? one(t, t.role) : say(lang, "אין משרתים במשחק.", "No Minions are in play."); const fr = pick(pool.filter(x => x.type === "minion")); if (fr) out.lies = [fakeOne(fr)]; break; }
      case "clockmaker": { let s = 1; if (demons[0] && minions.length) s = Math.min(...minions.map(m => { const d = Math.abs(m.seat - demons[0].seat); return Math.min(d, players.length - d); }));
        out.truth = say(lang, `מספר הצעדים מהשד למשרת הכי קרוב: ${s}.`, `Steps from the Demon to its nearest Minion: ${s}.`); out.lies = [1, 2, 3].filter(x => x !== s).map(x => say(lang, `מספר הצעדים מהשד למשרת הכי קרוב: ${x}.`, `Steps from the Demon to its nearest Minion: ${x}.`)); break; }
      case "noble": { const e = pick(players.filter(x => x !== p && evil(x))), g = shuffle(players.filter(x => x !== p && !evil(x))).slice(0, 2);
        out.truth = e ? say(lang, `בדיוק אחד מהשלושה האלה רע: ${shuffle([e, ...g]).map(x => x.name).join(", ")}.`, `Exactly one of these three is evil: ${shuffle([e, ...g]).map(x => x.name).join(", ")}.`) : "";
        out.lies = [say(lang, `בדיוק אחד מהשלושה האלה רע: ${shuffle(players.filter(x => x !== p && !evil(x))).slice(0, 3).map(x => x.name).join(", ")}.`, `Exactly one of these three is evil: ${shuffle(players.filter(x => x !== p && !evil(x))).slice(0, 3).map(x => x.name).join(", ")}.`)]; break; }
      case "pixie": { const t = pick(tf.filter(x => x !== p)); out.truth = t ? say(lang, `התפקיד ${nm(t.role, lang)} במשחק. אם תשכנע את כולם שאתה הוא — תקבל את היכולת שלו כשהוא ימות.`, `The ${nm(t.role, lang)} is in play. If you are "mad" about being it, you gain its ability when it dies.`) : "";
        const fr = pick(pool.filter(x => x.type === "townsfolk" && !players.some(y => y.role.id === x.id))); if (fr) out.lies = [say(lang, `התפקיד ${nm(fr, lang)} במשחק.`, `The ${nm(fr, lang)} is in play.`)]; break; }
      case "grandmother": { const t = pick(players.filter(x => x !== p && GOOD.includes(x.role.type))); out.truth = t ? say(lang, `הנכד/ה שלך: ${t.name}, שהוא ${nm(t.role, lang)}.`, `Your grandchild: ${t.name}, the ${nm(t.role, lang)}.`) : ""; break; }
      case "alchemist": { const offM = pool.filter(x => x.type === "minion" && !players.some(y => y.role.id === x.id)), m = pick(offM.length ? offM : pool.filter(x => x.type === "minion"));
        out.truth = m ? say(lang, `יש לך את היכולת של ${nm(m, lang)}: ${m.ability_he}`, `You have the ${nm(m, lang)} ability: ${m.ability_en}`) : ""; break; }
      case "fortune_teller": out.truth = say(lang, "בכל לילה תבחר שני שחקנים ותגלה אם אחד מהם שד.", "Each night you choose two players and learn if either is a Demon."); break;
      case "seamstress": out.truth = say(lang, "פעם אחת במשחק, בלילה, תבחר שני שחקנים ותגלה אם הם באותו צד.", "Once per game, at night, choose two players: learn if they are the same alignment."); break;
      case "damsel": case "recluse": case "heretic": case "klutz": out.truth = ""; break;
      default: out.truth = "";
    }
    if (!out.truth) out.truth = say(lang, "אין לך מידע בלילה הראשון. הקשב היטב ביום!", "No info on the first night. Listen closely during the day!");
    if (r.id === "fortune_teller" && rules.redHerring) { const rh = players.find(x => x.seat === rules.redHerring); if (rh) out.note = say(lang, `הפתיון של מגדת העתידות: ${rh.name} (נרשם לה כשד).`, `Fortune Teller red herring: ${rh.name} (registers as a Demon to them).`); }
    if (drunk) { // a drunk player gets false info, but keep the true one for the storyteller
      const lie = out.lies[0] || out.truth;
      out.note = (out.note ? out.note + " " : "") + say(lang, `${nm(real, lang)}: חושב שהוא ${nm(r, lang)} — מקבל מידע שקרי.`, `${nm(real, lang)}: thinks they are the ${nm(r, lang)} — gets false info.`);
      out.lies = out.lies.filter(x => x !== lie).concat(out.truth !== lie ? [out.truth] : []);
      out.truth = lie; out.drunk = true;
    }
    return out;
  }

  // --- later nights: quick answers for the storyteller to tap (true first). ctx also has: day, executedToday (player), deadTonight ---
  function laterNight(p, ctx) {
    const { players, lang } = ctx, r = shown(p), list = [];
    const add = (label, text, truth) => list.push({ label, text, truth });
    if (r.id === "empath") { const n = neighbours(players, p, true).filter(evil).length; [0, 1, 2].forEach(x => add(String(x), say(lang, `מספר השכנים הרעים החיים שלך: ${x}.`, `Evil living neighbours: ${x}.`), x === n)); }
    if (r.id === "fortune_teller") { add(say(lang, "כן", "Yes"), say(lang, "כן — אחד מהשניים שבחרת הוא שד.", "Yes — one of the two you chose is a Demon."), null); add(say(lang, "לא", "No"), say(lang, "לא — אף אחד מהשניים אינו שד.", "No — neither is a Demon."), null); }
    if (r.id === "seamstress") { add(say(lang, "אותו צד", "Same"), say(lang, "שני השחקנים באותו צד.", "They are the same alignment."), null); add(say(lang, "צדדים שונים", "Different"), say(lang, "שני השחקנים בצדדים שונים.", "They are different alignments."), null); }
    if (r.id === "undertaker" && ctx.executedToday) { const ex = ctx.executedToday; add(nm(shown(ex), lang), say(lang, `היום הוצא להורג: ${nm(ex.role, lang)}.`, `Executed today: the ${nm(ex.role, lang)}.`), true);
      const f = pick((ctx.pool || []).filter(x => x.id !== ex.role.id)); if (f) add(nm(f, lang), say(lang, `היום הוצא להורג: ${nm(f, lang)}.`, `Executed today: the ${nm(f, lang)}.`), false); }
    if (r.id === "oracle") { const n = players.filter(x => x.isAlive === false && evil(x)).length; [n, n + 1].concat(n ? [n - 1] : []).forEach(x => add(String(x), say(lang, `מספר השחקנים המתים שהם רעים: ${x}.`, `Dead players who are evil: ${x}.`), x === n)); }
    if (r.id === "ravenkeeper") add(say(lang, "בחר שחקן", "Choose"), say(lang, "מתת הלילה. בחר שחקן ותגלה את התפקיד שלו.", "You died tonight. Choose a player: you learn their character."), null);
    if (p.isDrunk) list.forEach(x => { if (x.truth != null) x.truth = !x.truth; });   // for the Drunk the "right" answer is a false one
    return list;
  }

  // quick messages the storyteller can send to one player at any time
  function quick(lang) {
    return [
      { k: "died", text: say(lang, "💀 מתת הלילה. אתה עדיין מדבר ויש לך הצבעה אחת אחרונה.", "💀 You died tonight. You still talk, and you have one last vote.") },
      { k: "evil", text: say(lang, "👎 עברת לצד הרע. מעכשיו אתה בצד של השד.", "👎 You are now evil. You are on the Demon's side.") },
      { k: "good", text: say(lang, "👍 עברת לצד הטוב.", "👍 You are now good.") },
      { k: "again", text: say(lang, "🤔 בחר שחקן אחר, בבקשה.", "🤔 Please choose a different player.") },
      { k: "poisoned", text: say(lang, "🧪 (למספר הסיפורים) שחקן זה שיכור/מורעל — תן לו מידע שקרי.", "🧪 (storyteller) this player is drunk/poisoned — give false info."), stOnly: true },
    ].filter(x => !x.stOnly);
  }

  // who wakes tonight, in order: [{p, order}] — night 1 uses firstNight, later nights otherNight (from the role data)
  function nightOrder(players, first) {
    return players.map(p => { const r = shown(p), real = p.role; let o = first ? (r.firstNight || 0) : (r.otherNight || 0);
      if (first && real.type === "minion") o = o || 5; if (first && real.type === "demon") o = o || 6;   // minion info, then demon info, early on night 1
      return { p, order: o }; }).filter(x => x.order > 0 && (first || x.p.isAlive !== false || ["ravenkeeper"].includes(shown(x.p).id))).sort((a, b) => a.order - b.order);
  }

  window.BKRules = { setup, shown, shownAlignment, firstNight, laterNight, quick, nightOrder, outsiderChange };
})();
