/* Bootkeh language switch for the fixed texts of the page (window.BKI18n).
   The page is written in Hebrew; everything drawn by the scripts already follows state.lang. This turns the remaining
   fixed texts (labels, buttons, placeholders, tooltips) to English and back: each text node / attribute keeps its
   Hebrew original, so switching back restores it exactly. Add a line to EN when you add a fixed Hebrew text. */
(function () {
  "use strict";
  const EN = {
    "אאוטסיידרים": "Outsiders", "אגדיים": "Fabled", "או כתוב עולם משלך, למשל: ספינת פיראטים, 1690": "Or write your own world, e.g. a pirate ship, 1690",
    "איפוס": "Reset", "בחירה ידנית": "Pick by hand", "בחירת התפקידים בעצמך": "Pick the roles yourself", "בחר הכל": "Select all", "דף מלא": "Full page",
    "דף תפקידים": "Roles sheet", "דף תפקידים מעוצב להדפסה, חלוקה לשחקנים ושמירה ב-PDF בדיוק כמו בגרסה הרשמית של המשחק": "A roles sheet to print, hand out or save as PDF — laid out like the official one",
    "הדפסה / PDF": "Print / PDF", "החברים שמשחקים איתך, כדי להושיב אותם מהר בכל משחק.": "The friends you play with, to seat them quickly in every game.",
    "הכל": "All", "הכנת משחק": "Setup", "הפעל": "Start", "הצרות מתבשלות (הקלאסי)": "Trouble Brewing (the classic)",
    "הקש על המסך כדי לחשוף את כרטיס הדמות הסודי שלך. הקש שוב כדי להסתיר אותו משכניך לשולחן!": "Tap the screen to reveal your secret character card. Tap again to hide it from your neighbours!",
    "השהה": "Pause", "השחקנים השמורים": "Saved players", "השלב הבא": "Next phase", "חיפוש תפקיד או יכולת (למשל: מורעל, Poisoner)": "Search a role or ability (e.g. poisoned, Poisoner)",
    "חלק מחדש": "Re-deal", "חלק תפקידים": "Deal roles", "חלק תפקידים והושב": "Deal roles & seat", "טובים": "Good", "טיימר לשלבי היום": "Day timer",
    "טלפון (054...)": "Phone (054...)", "יום 1 · דיון": "Day 1 · Discussion", "כל שחקן מקבל ב־WhatsApp את התפקיד שלו, ההסבר והמידע ללילה הראשון.": "Each player gets their role, its ability and their first-night info.",
    "כתות וסיגליות": "Sects & Violets", "לחיצה על כס: חי / מת": "Tap a throne: alive / dead", "מושבים.": "seats.", "מותאם אישית": "Custom", "מחק סט": "Delete set",
    "מלא מהרשימה השמורה": "Fill from saved list", "מסך פרטיות נעול": "Privacy screen locked", "מספר הסיפורים": "Storyteller", "מספר שחקנים": "Number of players",
    "מעגל הישיבה": "Board", "משחק חדש": "New game", "משרתים": "Minions", "מתוך": "of", "נוסעים": "Travellers", "נקה": "Clear", "נקה שמות": "Clear names", "נשלחו": "sent",
    "סט מ־JSON": "Set from JSON", "סט מתמונה": "Set from a picture", "סט תפקידים": "Role set", "עולם אקראי": "Random world", "עולם המשחק": "Game world",
    "עין מספר הסיפורים (הצג תפקידים)": "Storyteller's eye (show roles)", "רעים": "Evil", "רשימה נגללת": "Scrolling list", "רשימת שחקנים": "Player list", "שדים": "Demons",
    "שובו של משמר הארגמן": "Return of the Crimson Guard", "שחקנים": "Players", "שחקנים שמורים": "Saved players", "שליחה לשחקנים": "Send", "שליחת התפקידים": "Sending the roles",
    "שם מספר הסיפורים": "Storyteller's name", "שם שחקן (למשל: דני)": "Player name (e.g. Dan)", "שמור כסט": "Save as set", "תושבים": "Townsfolk", "תפקידים": "Roles",
    "תפקידים אקראיים": "Random roles", "תצוגה": "View", "＋ הוסף": "＋ Add", "🌙 מידע התחלתי ללילה הראשון:": "🌙 First-night info:", "🏰 כניסת מספר סיפורים": "🏰 Storyteller entrance",
    "👁️ הצג את הכרטיס שלי": "👁️ Show my card", "📜 יכולת הדמות שלך:": "📜 Your ability:", "🙈 הסתר מסך": "🙈 Hide screen",
    "משחקים שמורים": "Saved games", "שמור את ההגדרה הנוכחית": "Save the current setup", "הסתר תפקידים": "Hide roles", "הצג תפקידים": "Show roles",
    "שחקנים שמורים ": "Saved players", "חזרה": "Back",
  };
  const orig = new WeakMap(), ATTRS = ["placeholder", "title", "aria-label"];
  const he = /[֐-׿]/;
  function apply(lang) {
    const root = document.body; if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && !n.parentElement.closest("script,style,#bkPlayerApp,.bk-script") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const cur = n.nodeValue, key = (orig.has(n) ? orig.get(n) : cur), t = key.trim();
      if (lang === "en") { if (he.test(t) && EN[t]) { if (!orig.has(n)) orig.set(n, cur); n.nodeValue = cur.replace(t, EN[t]); } }
      else if (orig.has(n)) { n.nodeValue = orig.get(n); orig.delete(n); }
    }
    root.querySelectorAll(ATTRS.map(a => `[${a}]`).join(",")).forEach(el => {
      if (el.closest("#bkPlayerApp")) return;
      for (const a of ATTRS) { const v = el.getAttribute(a); if (v == null) continue; const k = "bki18n" + a.replace(/-/g, "");
        if (lang === "en") { const t = (el.dataset[k] != null ? el.dataset[k] : v).trim(); if (he.test(t) && EN[t]) { if (el.dataset[k] == null) el.dataset[k] = v; el.setAttribute(a, EN[t]); } }
        else if (el.dataset[k] != null) { el.setAttribute(a, el.dataset[k]); delete el.dataset[k]; } }
    });
  }
  window.BKI18n = { apply, EN };
})();
