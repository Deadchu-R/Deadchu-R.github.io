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

  // the Grimoire (Spy, Widow): every seat with its real character
  const typeName = (t, lang) => ({ townsfolk: say(lang, "תושב", "Townsfolk"), outsider: say(lang, "אאוטסיידר", "Outsider"), minion: say(lang, "משרת", "Minion"), demon: say(lang, "שד", "Demon") }[t] || t);
  function grimoire(players, lang) {
    return say(lang, "📖 הגרימואר: ", "📖 The Grimoire: ") + players.map(x => `${x.seat}. ${x.name} — ${nm(x.role, lang)}${x.isDrunk ? say(lang, " (שיכור)", " (drunk)") : ""}${x.isAlive === false ? " ✝" : ""}`).join(" · ");
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
    const small = players.length < 7;   // official: no Minion / Demon info with 5–6 players
    if (small && (real.type === "demon" || (real.type === "minion" && real.id !== "marionette"))) {
      out.truth = say(lang, "במשחק של 5–6 שחקנים הרעים לא מכירים זה את זה.", "With 5–6 players, the evil team does not learn each other.");
      return out;
    }
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
      case "knight": { const t = shuffle(players.filter(x => x !== p && x.role.type !== "demon")).slice(0, 2); out.truth = say(lang, `שני השחקנים האלה אינם השד: ${t.map(x => x.name).join(" ו־")}.`, `These two players are not the Demon: ${t.map(x => x.name).join(" and ")}.`);
        const d = demons[0], o = players.find(x => x !== p && x !== d); if (d && o) out.lies = [say(lang, `שני השחקנים האלה אינם השד: ${shuffle([d, o]).map(x => x.name).join(" ו־")}.`, `These two players are not the Demon: ${shuffle([d, o]).map(x => x.name).join(" and ")}.`)]; break; }
      case "spy": case "widow": out.truth = grimoire(players, lang); break;
      case "balloonist": { const t = pick(players.filter(x => x !== p)); out.truth = t ? say(lang, `${t.name} הוא ${typeName(t.role.type, lang)}.`, `${t.name} is a ${typeName(t.role.type, lang)}.`) : ""; break; }
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
    if (r.id === "spy") add(say(lang, "הגרימואר", "Grimoire"), grimoire(players, lang), true);
    if (r.id === "balloonist") { const t = pick(players.filter(x => x !== p)); if (t) add(typeName(t.role.type, lang), say(lang, `${t.name} הוא ${typeName(t.role.type, lang)}.`, `${t.name} is a ${typeName(t.role.type, lang)}.`), true); }
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
      // night 1 (official sheet): Dusk → Philosopher, Alchemist… → MINION INFO → Lunatic → DEMON INFO → everyone else
      if (first && players.length >= 7 && real.type === "minion" && real.id !== "marionette") o = Math.min(o || 5, 5);
      if (first && players.length >= 7 && real.type === "demon") o = Math.min(o || 9, 9);
      return { p, order: o }; }).filter(x => x.order > 0 && (first || x.p.isAlive !== false || ["ravenkeeper"].includes(shown(x.p).id))).sort((a, b) => a.order - b.order);
  }

  // --- what a role does when woken: how many players to choose and the prompt on their phone ---
  //  n = players to choose (0 = just wakes for info), self = may choose themselves, first = also on night 1
  const ACT = {
    fortune_teller: { n: 2, self: true, first: true, he: "בחר שני שחקנים — תגלה אם אחד מהם שד.", en: "Choose two players — learn if either is a Demon." },
    monk: { n: 1, self: false, he: "בחר שחקן (לא את עצמך) — הוא מוגן מהשד הלילה.", en: "Choose a player (not yourself) — they are safe from the Demon tonight." },
    snake_charmer: { n: 1, self: false, first: true, he: "בחר שחקן חי — אם הוא השד, תחליפו תפקידים.", en: "Choose a living player — if they are the Demon, you swap." },
    butler: { n: 1, self: false, first: true, he: "בחר שחקן (לא את עצמך) — מחר תוכל להצביע רק אם הוא מצביע.", en: "Choose a player (not yourself) — tomorrow you may only vote if they do." },
    poisoner: { n: 1, self: true, first: true, he: "בחר שחקן — הוא מורעל הלילה ומחר.", en: "Choose a player — they are poisoned tonight and tomorrow." },
    devils_advocate: { n: 1, self: true, first: true, he: "בחר שחקן חי (לא כמו אתמול) — אם יוצא להורג מחר, לא ימות.", en: "Choose a living player (not last night's) — if executed tomorrow, they don't die." },
    witch: { n: 1, self: true, first: true, he: "בחר שחקן — אם יאשים מחר, ימות.", en: "Choose a player — if they nominate tomorrow, they die." },
    cerenovus: { n: 1, self: true, first: true, r: 1, kinds: ["townsfolk", "outsider"], he: "בחר שחקן ותפקיד טוב — הוא יהיה \"משוגע\" שהוא התפקיד הזה מחר.", en: "Choose a player and a good character — they must be \"mad\" about it tomorrow." },
    pit_hag: { n: 1, self: true, r: 1, kinds: ["townsfolk", "outsider", "minion", "demon"], he: "בחר שחקן ותפקיד — הוא הופך לתפקיד הזה (אם הוא לא כבר במשחק).", en: "Choose a player and a character — they become it (if not in play)." },
    courtier: { n: 0, r: 1, kinds: ["townsfolk", "outsider", "minion", "demon"], once: true, first: true, he: "פעם במשחק: בחר תפקיד — הוא שיכור 3 לילות וימים. (אפשר לדלג)", en: "Once per game: choose a character — they are drunk for 3 nights & 3 days. (You may skip)" },
    dreamer: { n: 1, self: false, first: true, he: "בחר שחקן (לא את עצמך) — תקבל שני תפקידים, אחד מהם שלו.", en: "Choose a player (not yourself) — learn 1 good and 1 evil character, one is theirs." },
    seamstress: { n: 2, self: false, first: true, once: true, he: "פעם במשחק: בחר שני שחקנים — תגלה אם הם באותו צד. (אפשר לדלג)", en: "Once per game: choose two players — learn if they are the same alignment. (You may skip)" },
    chambermaid: { n: 2, self: false, first: true, he: "בחר שני שחקנים חיים — תגלה כמה התעוררו הלילה.", en: "Choose two living players — learn how many woke tonight." },
    innkeeper: { n: 2, self: true, he: "בחר שני שחקנים — הם לא ימותו הלילה, אחד שיכור.", en: "Choose two players — they can't die tonight; one is drunk." },
    sailor: { n: 1, self: false, first: true, he: "בחר שחקן חי — אחד מכם שיכור עד מחר.", en: "Choose a living player — one of you is drunk until dusk." },
    exorcist: { n: 1, self: false, he: "בחר שחקן (לא כמו אתמול) — אם הוא השד, הוא לא יפעל הלילה.", en: "Choose a player (different to last night) — if the Demon, it doesn't act tonight." },
    gambler: { n: 1, self: true, r: 1, kinds: ["townsfolk", "outsider", "minion", "demon"], he: "בחר שחקן ונחש את התפקיד שלו — טעות = אתה מת.", en: "Choose a player and guess their character — wrong = you die." },
    professor: { n: 1, self: false, once: true, he: "פעם במשחק: בחר שחקן מת — אם הוא תושב, הוא חוזר לחיים.", en: "Once per game: choose a dead player — if Townsfolk, they are resurrected.", dead: true },
    ravenkeeper: { n: 1, self: true, he: "מתת הלילה: בחר שחקן — תגלה את התפקיד שלו.", en: "You died tonight: choose a player — learn their character." },
    imp: { n: 1, self: true, he: "בחר שחקן — הוא מת. (אם תבחר בעצמך, משרת יהפוך לשד)", en: "Choose a player — they die. (Choose yourself: a Minion becomes the Imp)" },
    pukka: { n: 1, self: true, first: true, he: "בחר שחקן — הוא מורעל. המורעל הקודם מת.", en: "Choose a player — they are poisoned. The previous one dies." },
    vortox: { n: 1, self: true, he: "בחר שחקן — הוא מת.", en: "Choose a player — they die." },
    vigormortis: { n: 1, self: true, he: "בחר שחקן — הוא מת.", en: "Choose a player — they die." },
    no_dashii: { n: 1, self: true, he: "בחר שחקן — הוא מת.", en: "Choose a player — they die." },
    fang_gu: { n: 1, self: true, he: "בחר שחקן — הוא מת.", en: "Choose a player — they die." },
    zombuul: { n: 1, self: true, he: "אם אף אחד לא מת היום: בחר שחקן — הוא מת.", en: "If nobody died today: choose a player — they die." },
    shabaloth: { n: 2, self: true, he: "בחר שני שחקנים — הם מתים.", en: "Choose two players — they die." },
    po: { n: 1, self: true, he: "בחר שחקן — הוא מת (או אף אחד, ואז מחר שלושה).", en: "Choose a player — they die (or nobody, then three next time)." },
    al_hadikhia: { n: 3, self: true, he: "בחר שלושה שחקנים.", en: "Choose three players." },
    lleech: { n: 1, self: true, first: true, he: "בחר שחקן — הוא מת (בלילה הראשון: בחר מארח).", en: "Choose a player — they die (night 1: choose your host)." },
    assassin: { n: 1, self: true, once: true, he: "פעם במשחק: בחר שחקן — הוא מת בכל מקרה. (אפשר לדלג)", en: "Once per game: choose a player — they die regardless. (You may skip)" },
    godfather: { n: 1, self: true, he: "אם אאוטסיידר מת היום: בחר שחקן — הוא מת.", en: "If an Outsider died today: choose a player — they die." },
    philosopher: { n: 0, first: true, r: 1, kinds: ["townsfolk", "outsider"], once: true, he: "פעם במשחק: בחר תפקיד טוב — תקבל את היכולת שלו. (אפשר לדלג)", en: "Once per game: choose a good character — gain its ability. (You may skip)" },
  };
  const DEMON_KILL = new Set(["imp", "vortox", "vigormortis", "no_dashii", "fang_gu", "zombuul", "shabaloth", "po", "lleech", "al_hadikhia"]);
  // A role without a hand-written prompt: read the choice from its ability text ("Each night, choose 2 players…",
  // "choose a character…", "Once per game…", "(not yourself)"), so every character that chooses at night gets buttons.
  const NUM = { a: 1, an: 1, one: 1, "1": 1, two: 2, "2": 2, three: 3, "3": 3 };
  function inferAct(r) {
    const t = String(r.ability_en || ""); if (!(r.firstNight || r.otherNight)) return null;
    if (!/(each|at) night|on night 1|once per game, at night/i.test(t)) return null;
    const mp = /choose (a|an|one|two|three|\d) (?:alive |living |dead |good |evil |other )?players?/i.exec(t), mc = /choose (a|an|one|two|\d) (?:good |evil |)?characters?/i.exec(t);
    if (!mp && !mc) return null;
    const a = { n: mp ? NUM[mp[1].toLowerCase()] || 1 : 0, r: mc ? NUM[mc[1].toLowerCase()] || 1 : 0, self: !/not yourself|other than you/i.test(t), first: !!r.firstNight && !/night\*/i.test(t),
      once: /once per game/i.test(t), dead: /choose (a|an) dead player/i.test(t), kinds: /good character/i.test(t) ? ["townsfolk", "outsider"] : /evil character/i.test(t) ? ["minion", "demon"] : null };
    a.he = `לפי היכולת שלך: ${r.ability_he || ""}`; a.en = `Your ability: ${r.ability_en}`;
    if (a.once) { a.he += " (אפשר לדלג)"; a.en += " (You may skip)"; }
    return a;
  }
  function action(p, first, lang) {
    const r = shown(p), a = ACT[r.id] || inferAct(r);
    if (!a || (first && !a.first)) return { n: 0, text: say(lang, "התעוררת. תסתכל במידע שלך.", "You are awake. Look at your info."), info: true };
    return { n: a.n, r: a.r || 0, kinds: a.kinds || null, self: !!a.self, dead: !!a.dead, once: !!a.once, text: L(lang) === "he" ? a.he : a.en };
  }

  // --- dawn helper: from tonight's choices, who probably died / was protected / poisoned. acts: {seat: [targets]} ---
  function resolveNight(players, acts, lang) {
    const by = id => players.filter(p => p.role.id === id && p.isAlive !== false), sel = p => (acts[p.seat] || []);
    const poisoned = new Set(), protectedS = new Set(), deaths = new Set(), notes = [];
    const nameOf = seat => (players.find(p => p.seat === seat) || {}).name || seat;
    by("poisoner").forEach(p => sel(p).forEach(t => poisoned.add(t)));
    by("pukka").forEach(p => sel(p).forEach(t => poisoned.add(t)));
    const poisonedHere = p => poisoned.has(p.seat) || p.isDrunk;
    by("monk").forEach(p => { if (!poisonedHere(p)) sel(p).forEach(t => protectedS.add(t)); });
    by("innkeeper").forEach(p => { if (!poisonedHere(p)) sel(p).forEach(t => protectedS.add(t)); });
    players.forEach(p => { if (p.role.id === "soldier" && !poisonedHere(p)) protectedS.add(p.seat); });
    players.filter(p => DEMON_KILL.has(p.role.id) && p.isAlive !== false).forEach(d => sel(d).forEach(t => {
      const tp = players.find(x => x.seat === t); if (!tp || tp.isAlive === false) return;
      if (protectedS.has(t)) notes.push(say(lang, `השד בחר ב־${nameOf(t)}, אבל הוא מוגן — לא מת.`, `The Demon chose ${nameOf(t)}, but they are protected — no death.`));
      else if (t === d.seat && d.role.id === "imp") notes.push(say(lang, `השד הרג את עצמו — משרת חי הופך לאימפ.`, `The Imp killed itself — a living Minion becomes the Imp.`));
      else if (tp.role.id === "mayor" && !poisonedHere(tp)) notes.push(say(lang, `השד בחר בראש העיר (${nameOf(t)}) — אתה יכול להעביר את המוות לשחקן אחר.`, `The Demon chose the Mayor (${nameOf(t)}) — you may bounce the death.`));
      else deaths.add(t);
    }));
    by("assassin").forEach(p => sel(p).forEach(t => deaths.add(t)));
    poisoned.forEach(t => notes.push(say(lang, `${nameOf(t)} מורעל — תן לו מידע שקרי.`, `${nameOf(t)} is poisoned — give false info.`)));
    return { deaths: [...deaths], poisoned: [...poisoned], protected: [...protectedS], notes };
  }

  // --- the storyteller's decisions after a player chose (act = {targets:[seats], roles:[ids]}) ---
  // Each decision: {title, text, options:[{label, truth?, msgs:[{seat,text}], effects:[{kind:"role"|"kill"|"drunk"|"poison", seat, role?}]}]}.
  // The storyteller taps one option (messages go to those players, effects change the game) or writes their own.
  function decide(p, act, ctx) {
    const { players, lang } = ctx, rules = ctx.rules || {}, r = shown(p), out = [];
    const T = act.targets || [], RR = (act.roles || []).map(role).filter(Boolean);
    const P = seat => players.find(x => x.seat === seat), N = q => q ? String(q.name).split(" / ")[0] : "?";
    const drunk = p.isDrunk || (ctx.poisoned || []).includes(p.seat);
    const D = (title, text, options) => out.push({ title, text, options });
    const msg = (seat, text) => ({ seat, text });
    if (drunk) out.push({ title: say(lang, `${N(p)} שיכור/מורעל`, `${N(p)} is drunk/poisoned`), text: say(lang, "היכולת שלו לא עובדת באמת — תן לו תשובה שקרית או \"כאילו\" עבד.", "Their ability doesn't really work — give a false answer or pretend it worked."), options: [] });

    if (r.id === "fortune_teller" && T.length === 2) {
      const hit = T.some(t => { const q = P(t); return q && (q.role.type === "demon" || q.seat === rules.redHerring); });
      const yes = say(lang, "כן — אחד מהשניים שבחרת הוא שד.", "Yes — one of the two you chose is a Demon."), no = say(lang, "לא — אף אחד מהשניים אינו שד.", "No — neither is a Demon.");
      D(say(lang, "מגדת העתידות", "Fortune Teller"), say(lang, `בחרה ב־${T.map(t => N(P(t))).join(" ו־")}. ${hit ? "אחד מהם שד (או הפתיון)." : "אף אחד מהם לא שד."}`, `Chose ${T.map(t => N(P(t))).join(" and ")}. ${hit ? "One is a Demon (or the red herring)." : "Neither is a Demon."}`),
        [{ label: say(lang, "כן", "Yes"), truth: drunk ? !hit : hit, msgs: [msg(p.seat, yes)] }, { label: say(lang, "לא", "No"), truth: drunk ? hit : !hit, msgs: [msg(p.seat, no)] }]);
    }
    if (r.id === "ravenkeeper" && T[0]) { const q = P(T[0]), fake = pick((ctx.pool || []).filter(x => x.id !== q.role.id));
      D(say(lang, "שומר העורבים", "Ravenkeeper"), say(lang, `בחר ב־${N(q)} (${nm(q.role, lang)}).`, `Chose ${N(q)} (${nm(q.role, lang)}).`),
        [{ label: nm(q.role, lang), truth: !drunk, msgs: [msg(p.seat, say(lang, `${N(q)} הוא ${nm(q.role, lang)}.`, `${N(q)} is the ${nm(q.role, lang)}.`))] }].concat(fake ? [{ label: nm(fake, lang), truth: drunk, msgs: [msg(p.seat, say(lang, `${N(q)} הוא ${nm(fake, lang)}.`, `${N(q)} is the ${nm(fake, lang)}.`))] }] : [])); }
    if (r.id === "dreamer" && T[0]) { const q = P(T[0]), real = q.role, good = GOOD.includes(real.type);
      const other = pick((ctx.pool || []).filter(x => (good ? EVIL : GOOD).includes(x.type))), pair = shuffle([real, other].filter(Boolean)).map(x => nm(x, lang)).join(say(lang, " או ", " or "));
      D(say(lang, "החולם", "Dreamer"), say(lang, `בחר ב־${N(q)} (${nm(real, lang)}).`, `Chose ${N(q)} (${nm(real, lang)}).`), [{ label: pair, truth: !drunk, msgs: [msg(p.seat, say(lang, `${N(q)} הוא ${pair}.`, `${N(q)} is the ${pair}.`))] }]); }
    if (r.id === "snake_charmer" && T[0]) { const q = P(T[0]);
      if (q && q.role.type === "demon" && !drunk) D(say(lang, "לוחש הנחשים פגע בשד!", "Snake Charmer hit the Demon!"), say(lang, `${N(p)} ו־${N(q)} מחליפים תפקידים וצדדים; השד הישן (עכשיו לוחש) מורעל.`, `${N(p)} and ${N(q)} swap characters and alignments; the old Demon (now Snake Charmer) is poisoned.`),
        [{ label: say(lang, "בצע החלפה", "Swap them"), msgs: [msg(p.seat, say(lang, `אתה עכשיו ${nm(q.role, lang)} — השד. עברת לצד הרע.`, `You are now the ${nm(q.role, lang)} — the Demon. You are evil.`)), msg(q.seat, say(lang, `אתה עכשיו לוחש הנחשים. עברת לצד הטוב (ואתה מורעל).`, `You are now the Snake Charmer. You are good (and poisoned).`))],
          effects: [{ kind: "role", seat: p.seat, role: q.role.id }, { kind: "role", seat: q.seat, role: "snake_charmer" }, { kind: "poison", seat: q.seat }] }]);
    }
    if (r.id === "gambler" && T[0] && RR[0]) { const q = P(T[0]), right = q && q.role.id === RR[0].id;
      D(say(lang, "המהמר", "Gambler"), say(lang, `ניחש ש־${N(q)} הוא ${nm(RR[0], lang)} — ${right ? "נכון" : `טעות (באמת ${nm(q.role, lang)})`}.`, `Guessed ${N(q)} is the ${nm(RR[0], lang)} — ${right ? "right" : `wrong (really ${nm(q.role, lang)})`}.`),
        [{ label: say(lang, "נכון — כלום לא קורה", "Right — nothing happens"), truth: right || drunk, msgs: [] }, { label: say(lang, "טעה — המהמר מת", "Wrong — the Gambler dies"), truth: !right && !drunk, msgs: [], effects: [{ kind: "kill", seat: p.seat }] }]); }
    if (r.id === "cerenovus" && T[0] && RR[0]) { const q = P(T[0]);
      D(say(lang, "סרנובוס", "Cerenovus"), say(lang, `בחר ב־${N(q)} ובתפקיד ${nm(RR[0], lang)}.`, `Chose ${N(q)} and the ${nm(RR[0], lang)}.`),
        [{ label: say(lang, `שלח ל־${N(q)}`, `Tell ${N(q)}`), msgs: drunk ? [] : [msg(q.seat, say(lang, `🧠 סרנובוס בחר בך: מחר אתה חייב להיות "משוגע" שאתה ${nm(RR[0], lang)} — אחרת אולי תוצא להורג.`, `🧠 The Cerenovus chose you: tomorrow you must be "mad" that you are the ${nm(RR[0], lang)} — or you might be executed.`))] }]); }
    if (r.id === "pit_hag" && T[0] && RR[0]) { const q = P(T[0]), inPlay = players.some(x => x.role.id === RR[0].id), al = EVIL.includes(RR[0].type) ? "evil" : "good";
      D(say(lang, "מכשפת הבור", "Pit-Hag"), say(lang, `רוצה להפוך את ${N(q)} ל־${nm(RR[0], lang)}.${inPlay ? " התפקיד כבר במשחק — אין שינוי." : ""}${RR[0].type === "demon" ? " שד חדש: אתה מחליט אם מישהו מת הלילה." : ""}`, `Wants ${N(q)} to become the ${nm(RR[0], lang)}.${inPlay ? " Already in play — no change." : ""}${RR[0].type === "demon" ? " A new Demon: you decide whether anyone dies tonight." : ""}`),
        inPlay || drunk ? [{ label: say(lang, "אין שינוי", "No change"), msgs: [] }] : [{ label: say(lang, `${N(q)} הופך ל־${nm(RR[0], lang)}`, `${N(q)} becomes the ${nm(RR[0], lang)}`), msgs: [msg(q.seat, say(lang, `התפקיד שלך השתנה: אתה עכשיו ${nm(RR[0], lang)}${al === "evil" ? " (רע)" : ""}.`, `Your character changed: you are now the ${nm(RR[0], lang)}${al === "evil" ? " (evil)" : ""}.`))], effects: [{ kind: "role", seat: q.seat, role: RR[0].id }] }, { label: say(lang, "אין שינוי", "No change"), msgs: [] }]); }
    if (r.id === "philosopher" && RR[0]) { const holder = players.find(x => x.role.id === RR[0].id && x !== p);
      D(say(lang, "הפילוסוף", "Philosopher"), say(lang, `בחר ביכולת של ${nm(RR[0], lang)}.${holder ? ` ${N(holder)} מחזיק בתפקיד — הוא נהיה שיכור.` : ""}`, `Chose the ${nm(RR[0], lang)} ability.${holder ? ` ${N(holder)} has it — they become drunk.` : ""}`),
        [{ label: say(lang, "תן לו את היכולת", "Give the ability"), msgs: [msg(p.seat, say(lang, `קיבלת את היכולת של ${nm(RR[0], lang)}: ${RR[0].ability_he}`, `You gained the ${nm(RR[0], lang)} ability: ${RR[0].ability_en}`))],
          effects: (drunk ? [] : [{ kind: "role", seat: p.seat, role: RR[0].id, keepTrue: true }]).concat(holder && !drunk ? [{ kind: "drunk", seat: holder.seat }] : []) }]); }
    if (r.id === "courtier" && RR[0]) { const holder = players.find(x => x.role.id === RR[0].id);
      D(say(lang, "איש החצר", "Courtier"), say(lang, `בחר ב־${nm(RR[0], lang)}.${holder ? ` ${N(holder)} שיכור 3 לילות וימים.` : " התפקיד לא במשחק — אין השפעה."}`, `Chose the ${nm(RR[0], lang)}.${holder ? ` ${N(holder)} is drunk for 3 nights & days.` : " Not in play — no effect."}`),
        [{ label: say(lang, "אישור", "OK"), msgs: [], effects: holder && !drunk ? [{ kind: "drunk", seat: holder.seat }] : [] }]); }
    if (r.id === "imp" && T[0] === p.seat && !drunk) { const ms = players.filter(x => x.role.type === "minion" && x.isAlive !== false);
      D(say(lang, "האימפ הרג את עצמו", "The Imp killed itself"), say(lang, "בחר איזה משרת חי הופך לאימפ (עדיפות לגברת בארגמן).", "Choose which living Minion becomes the Imp (the Scarlet Woman first)."),
        ms.map(m => ({ label: say(lang, `${N(m)} הופך לאימפ`, `${N(m)} becomes the Imp`), msgs: [msg(m.seat, say(lang, "😈 אתה עכשיו האימפ — השד.", "😈 You are now the Imp — the Demon."))], effects: [{ kind: "role", seat: m.seat, role: "imp" }, { kind: "kill", seat: p.seat }] }))); }
    return out;
  }

  window.BKRules = { inferAct, grimoire, decide, action, resolveNight, setup, shown, shownAlignment, firstNight, laterNight, quick, nightOrder, outsiderChange };
})();
