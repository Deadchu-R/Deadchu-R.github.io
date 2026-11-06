// assets/bootkeh-roles-extra.js
// The rest of the Blood on the Clocktower character list, so "Advanced settings" can build any custom script.
// Added after bootkeh-data.js: each entry is appended to window.BOOTKEH_ROLES unless a role with that id already exists.
// Abilities are short summaries in our own words (EN + HE), not the official card text — check the official
// almanac / wiki for exact wording and rulings. Travellers and Fabled are listed for scripts, never dealt at random.
(function () {
  "use strict";
  const R = window.BOOTKEH_ROLES = window.BOOTKEH_ROLES || [];
  const have = new Set(R.map(r => r.id));
  // [id, type, English name, Hebrew name, icon, edition, summary EN, summary HE]
  const X = [
    // ---- Townsfolk
    ["steward", "townsfolk", "Steward", "סוכן בית", "🗝️", "experimental", "Starts knowing one good player.", "מתחיל בידיעת שחקן טוב אחד."],
    ["noble", "townsfolk", "Noble", "אציל", "👑", "experimental", "Starts knowing 3 players; exactly 1 of them is evil.", "מתחיל בידיעת 3 שחקנים — בדיוק אחד מהם רע."],
    ["shugenja", "townsfolk", "Shugenja", "שוגנג'ה", "🧭", "experimental", "Starts knowing whether the nearest evil player is clockwise or anticlockwise.", "מתחיל בידיעה אם השחקן הרע הקרוב ביותר נמצא עם כיוון השעון או נגדו."],
    ["village_idiot", "townsfolk", "Village Idiot", "שוטה הכפר", "🤪", "experimental", "Each night picks a player and learns their alignment; if there are several, one of them is drunk.", "בכל לילה בוחר שחקן ולומד את הצד שלו; אם יש כמה שוטים, אחד מהם שיכור."],
    ["high_priestess", "townsfolk", "High Priestess", "כוהנת גדולה", "🔮", "experimental", "Each night learns which player the Storyteller thinks she should talk to most.", "בכל לילה לומדת עם איזה שחקן מספר הסיפור חושב שכדאי לה לדבר הכי הרבה."],
    ["general", "townsfolk", "General", "גנרל", "🎖️", "experimental", "Each night learns who the Storyteller thinks is winning: good, evil or neither.", "בכל לילה לומד מי לדעת מספר הסיפור מנצח: הטובים, הרעים או אף אחד."],
    ["preacher", "townsfolk", "Preacher", "מטיף", "📢", "experimental", "Each night chooses a player; a Minion chosen this way learns it and loses their ability.", "בכל לילה בוחר שחקן; משרת שנבחר יודע זאת ומאבד את היכולת שלו."],
    ["king", "townsfolk", "King", "מלך", "🤴", "experimental", "The Demon knows who the King is; once the dead outnumber the living, the King learns a character in play each night.", "השד יודע מי המלך; כשהמתים רבים מהחיים, המלך לומד בכל לילה דמות שבמשחק."],
    ["choirboy", "townsfolk", "Choirboy", "ילד מקהלה", "🎶", "experimental", "If the Demon kills the King, the Choirboy learns which player is the Demon.", "אם השד הורג את המלך, ילד המקהלה לומד מי השד."],
    ["huntsman", "townsfolk", "Huntsman", "צייד", "🏹", "experimental", "Once per game at night, picks a player; if it is the Damsel she becomes a Townsfolk.", "פעם במשחק בלילה בוחר שחקן; אם זו העלמה — היא הופכת לתושבת."],
    ["lycanthrope", "townsfolk", "Lycanthrope", "איש־זאב", "🐺", "experimental", "Each night picks a living player; if good, they die and the Demon doesn't kill tonight. One good player reads as evil.", "בכל לילה בוחר שחקן חי; אם הוא טוב — הוא מת והשד לא הורג הלילה. שחקן טוב אחד נראה רע."],
    ["nightwatchman", "townsfolk", "Nightwatchman", "שומר לילה", "🏮", "experimental", "Once per game at night, picks a player who learns who the Nightwatchman is.", "פעם במשחק בלילה בוחר שחקן, והוא לומד מי שומר הלילה."],
    ["poppy_grower", "townsfolk", "Poppy Grower", "מגדל פרגים", "🌺", "experimental", "Minions and Demon don't learn each other while the Poppy Grower lives.", "כל עוד מגדל הפרגים חי, המשרתים והשד לא יודעים זה על זה."],
    ["atheist", "townsfolk", "Atheist", "אתאיסט", "🚫", "experimental", "The Storyteller may break the rules; if executed, good wins if there is no Demon in play.", "מספר הסיפור רשאי לשבור חוקים; אם האתאיסט מוצא להורג — הטובים מנצחים אם אין שד במשחק."],
    ["cannibal", "townsfolk", "Cannibal", "קניבל", "🍖", "experimental", "Has the ability of the last player executed; if that player was evil, the Cannibal is poisoned until a good player dies.", "מקבל את היכולת של האחרון שהוצא להורג; אם הוא היה רע — הקניבל מורעל עד שטוב ימות."],
    ["engineer", "townsfolk", "Engineer", "מהנדס", "⚙️", "experimental", "Once per game at night, chooses which Minions or which Demon are in play.", "פעם במשחק בלילה בוחר אילו משרתים או איזה שד נמצאים במשחק."],
    ["farmer", "townsfolk", "Farmer", "חקלאי", "🌾", "experimental", "When the Farmer dies at night, an alive good player becomes a Farmer.", "כשהחקלאי מת בלילה, שחקן טוב וחי הופך לחקלאי."],
    ["fisherman", "townsfolk", "Fisherman", "דייג", "🎣", "experimental", "Once per game during the day, may visit the Storyteller for advice to help the team win.", "פעם במשחק ביום יכול לבקש ממספר הסיפור עצה שתעזור לצוות לנצח."],
    ["magician", "townsfolk", "Magician", "קוסם", "🎩", "experimental", "The Demon thinks you are a Minion; Minions think you are the Demon.", "השד חושב שאתה משרת; המשרתים חושבים שאתה השד."],
    ["banshee", "townsfolk", "Banshee", "בנשי", "👻", "experimental", "If the Demon kills the Banshee, everyone learns it; she may then nominate and vote twice a day.", "אם השד הורג את הבנשי, כולם יודעים; מאז היא יכולה למנות ולהצביע פעמיים ביום."],
    ["princess", "townsfolk", "Princess", "נסיכה", "👸", "experimental", "On day 1, if she nominates and executes a player, the Demon doesn't kill that night.", "ביום הראשון, אם היא ממנה שחקן והוא מוצא להורג — השד לא הורג בלילה."],
    ["acrobat", "townsfolk", "Acrobat", "אקרובט", "🤸", "experimental", "Each night picks a player; if they are or become drunk or poisoned tonight, the Acrobat dies.", "בכל לילה בוחר שחקן; אם הוא שיכור או מורעל הלילה — האקרובט מת."],
    ["gnome", "townsfolk", "Gnome", "גמד", "🍄", "experimental", "All players start knowing a player of your alignment; you may choose to kill anyone who nominates them.", "כולם יודעים שחקן מהצד שלך; אתה יכול להרוג את מי שממנה אותו."],
    // ---- Outsiders
    ["plague_doctor", "outsider", "Plague Doctor", "רופא המגפה", "🦠", "experimental", "When the Plague Doctor dies, the Storyteller gains a Minion ability.", "כשרופא המגפה מת, מספר הסיפור מקבל יכולת של משרת."],
    ["hatter", "outsider", "Hatter", "כובען", "🎩", "experimental", "When the Hatter dies, Minions and Demons may choose new characters to become (a tea party).", "כשהכובען מת, המשרתים והשד יכולים לבחור דמויות חדשות."],
    ["politician", "outsider", "Politician", "פוליטיקאי", "🗳️", "experimental", "If the Politician was the player most responsible for their team losing, they switch sides and win.", "אם הפוליטיקאי הכי אחראי להפסד של הצוות שלו — הוא מחליף צד ומנצח."],
    ["puzzlemaster", "outsider", "Puzzlemaster", "אמן החידות", "🧩", "experimental", "One player is drunk; once per game the Puzzlemaster may guess who for information about the Demon.", "שחקן אחד שיכור; פעם במשחק אמן החידות יכול לנחש מי — ולקבל מידע על השד."],
    ["ogre", "outsider", "Ogre", "ענק", "👹", "experimental", "On the first night picks a player and becomes their alignment (you don't learn which).", "בלילה הראשון בוחר שחקן ומצטרף לצד שלו (בלי לדעת איזה)."],
    ["zealot", "outsider", "Zealot", "קנאי", "🔥", "experimental", "If there are 5 or more players alive, the Zealot must vote for every nomination.", "כשיש 5 שחקנים חיים או יותר, הקנאי חייב להצביע בכל מינוי."],
    ["hermit", "outsider", "Hermit", "נזיר מתבודד", "🛖", "experimental", "Has all Outsider abilities; the Outsider count may change.", "יש לו את כל יכולות האאוטסיידרים; מספר האאוטסיידרים עשוי להשתנות."],
    ["golem", "outsider", "Golem", "גולם", "🗿", "experimental", "May only nominate once per game; if the nominee is not the Demon, they die.", "יכול למנות פעם אחת במשחק; אם הממונה אינו השד — הוא מת."],
    // ---- Minions
    ["mezepheles", "minion", "Mezepheles", "מזפלס", "🗣️", "experimental", "Starts knowing a secret word; the first good player to say it becomes evil that night.", "מתחיל בידיעת מילה סודית; הטוב הראשון שאומר אותה הופך לרע בלילה."],
    ["fearmonger", "minion", "Fearmonger", "מפיץ פחד", "😱", "experimental", "Each night picks a player; if that player is executed, their team loses. Everyone learns when the choice changes.", "בכל לילה בוחר שחקן; אם הוא מוצא להורג — הצוות שלו מפסיד."],
    ["organ_grinder", "minion", "Organ Grinder", "נגן תיבת נגינה", "🐒", "experimental", "Votes are secret and counted in private while the Organ Grinder lives.", "כל עוד הוא חי, ההצבעות סודיות ונספרות בהסתר."],
    ["vizier", "minion", "Vizier", "וזיר", "📜", "experimental", "Everyone knows who the Vizier is; the Vizier can't die by day and can force executions.", "כולם יודעים מי הוזיר; הוא לא מת ביום ויכול לכפות הוצאה להורג."],
    ["summoner", "minion", "Summoner", "מזמן", "🕯️", "experimental", "Gets bluffs; on night 3 picks a player who becomes an evil Demon of the Summoner's choice.", "מקבל בלופים; בלילה השלישי בוחר שחקן שהופך לשד רע לבחירתו."],
    ["wizard", "minion", "Wizard", "מכשף", "🪄", "experimental", "Once per game may make a wish; if granted it may come with a price and a clue.", "פעם במשחק יכול להביע משאלה; אם היא מתגשמת — היא באה עם מחיר ורמז."],
    ["xaan", "minion", "Xaan", "שאן", "🕸️", "experimental", "On night X, all Townsfolk are poisoned until dusk (X = the number of Outsiders).", "בלילה X כל התושבים מורעלים עד הערב (X = מספר האאוטסיידרים)."],
    ["boffin", "minion", "Boffin", "מדען מטורף", "🧪", "experimental", "The Demon secretly has a good character's ability.", "לשד יש בסוד יכולת של דמות טובה."],
    ["wraith", "minion", "Wraith", "רוח רפאים", "🌫️", "experimental", "May keep their eyes open at night and wakes when other evil players do.", "יכול להשאיר עיניים פקוחות בלילה ומתעורר עם שאר הרעים."],
    // ---- Demons
    ["lord_of_typhon", "demon", "Lord of Typhon", "אדון טייפון", "🐉", "experimental", "Each night kills; evil characters sit in a line next to the Lord of Typhon.", "בכל לילה הורג; הדמויות הרעות יושבות ברצף לצידו."],
    ["lil_monsta", "demon", "Lil' Monsta", "מפלצונת", "🧸", "experimental", "Minions choose each night who babysits Lil' Monsta; that player is the Demon and a player dies.", "בכל לילה המשרתים בוחרים מי שומר על המפלצונת; הוא השד ושחקן מת."],
    ["lleech", "demon", "Lleech", "עלוקה", "🩸", "experimental", "Picks a host on night 1 who is poisoned; the Lleech only dies if the host dies.", "בלילה הראשון בוחר פונדקאי שמורעל; העלוקה מתה רק אם הפונדקאי מת."],
    ["yaggababble", "demon", "Yaggababble", "יגבאבל", "💬", "experimental", "Starts knowing a secret phrase; each time it is said publicly, a player might die.", "מתחיל בידיעת משפט סודי; בכל פעם שהוא נאמר בקול — שחקן עלול למות."],
    // ---- Travellers
    ["scapegoat", "traveller", "Scapegoat", "שעיר לעזאזל", "🐐", "trouble_brewing", "If a player of your alignment is executed, you might be executed instead.", "אם שחקן מהצד שלך מוצא להורג — ייתכן שאתה תוצא במקומו."],
    ["gunslinger", "traveller", "Gunslinger", "אקדוחן", "🔫", "trouble_brewing", "Once a day, after a vote, may pick a player who voted; they die.", "פעם ביום, אחרי הצבעה, בוחר שחקן שהצביע — והוא מת."],
    ["beggar", "traveller", "Beggar", "קבצן", "🥣", "trouble_brewing", "Must use a vote token to vote; dead players may give you theirs.", "חייב אסימון הצבעה כדי להצביע; מתים יכולים לתת לו את שלהם."],
    ["bureaucrat", "traveller", "Bureaucrat", "ביורוקרט", "📋", "trouble_brewing", "Each night picks a player; tomorrow their vote counts 3 times.", "בכל לילה בוחר שחקן; מחר הקול שלו נספר פי 3."],
    ["thief", "traveller", "Thief", "גנב", "🦹", "trouble_brewing", "Each night picks a player; tomorrow their vote counts negatively.", "בכל לילה בוחר שחקן; מחר הקול שלו נספר כשלילי."],
    ["butcher", "traveller", "Butcher", "קצב", "🔪", "bad_moon_rising", "Each day, after the first execution, may nominate again.", "בכל יום, אחרי ההוצאה להורג הראשונה, יכול למנות שוב."],
    ["bone_collector", "traveller", "Bone Collector", "אספן עצמות", "🦴", "bad_moon_rising", "Once per game at night, a dead player regains their ability until dusk.", "פעם במשחק בלילה, שחקן מת מקבל בחזרה את היכולת שלו עד הערב."],
    ["harlot", "traveller", "Harlot", "פילגש", "💋", "bad_moon_rising", "Each night picks a player who may choose to show you their character; then you both might die.", "בכל לילה בוחרת שחקן שיכול לחשוף לה את הדמות; ואז שניכם עלולים למות."],
    ["barista", "traveller", "Barista", "בריסטה", "☕", "bad_moon_rising", "Each night a player is sober and gets true info, or their ability works twice.", "בכל לילה שחקן נהיה פיכח ומקבל מידע אמיתי — או שהיכולת שלו עובדת פעמיים."],
    ["deviant", "traveller", "Deviant", "סוטה", "🤡", "bad_moon_rising", "If you were funny today, you can't die by exile.", "אם הצחקת היום — אי אפשר לגרש אותך."],
    ["apprentice", "traveller", "Apprentice", "שוליה", "🎓", "sects_violets", "On your first night you gain a Townsfolk ability (if good) or a Minion ability (if evil).", "בלילה הראשון שלך מקבל יכולת של תושב (אם טוב) או של משרת (אם רע)."],
    ["matron", "traveller", "Matron", "מטרונית", "👵", "sects_violets", "Each day may make players swap seats; players may only whisper to their neighbours.", "בכל יום יכולה להחליף מקומות ישיבה; מותר ללחוש רק לשכנים."],
    ["voudon", "traveller", "Voudon", "וודון", "🪆", "sects_violets", "Only you and the dead can vote; they don't need a vote token.", "רק אתה והמתים מצביעים, ובלי צורך באסימון."],
    ["judge", "traveller", "Judge", "שופט", "⚖️", "sects_violets", "Once per game, if another player nominated, you may choose to force the current execution to pass or fail.", "פעם במשחק יכול להכריע אם ההוצאה להורג הנוכחית עוברת או נכשלת."],
    ["bishop", "traveller", "Bishop", "בישוף", "⛪", "sects_violets", "Only the Storyteller can nominate; at least one opposing player must be nominated each day.", "רק מספר הסיפור ממנה; בכל יום חייב להיות ממונה לפחות אחד מהצד השני."],
    ["gangster", "traveller", "Gangster", "גנגסטר", "🕴️", "experimental", "Once per day may choose to kill an alive neighbour if your other neighbour agrees.", "פעם ביום יכול להרוג שכן חי אם השכן השני מסכים."],
    // ---- Fabled (Storyteller helpers)
    ["doomsayer", "fabled", "Doomsayer", "נביא אסונות", "☄️", "fabled", "If 4 or more players live, each living player may once publicly ask that a player of their own team dies.", "כשיש 4 חיים או יותר, כל שחקן חי יכול פעם אחת לבקש בפומבי ששחקן מהצד שלו ימות."],
    ["angel", "fabled", "Angel", "מלאך", "😇", "fabled", "Something bad might happen to whoever is most responsible for the death of a new player.", "משהו רע עלול לקרות למי שאחראי למוות של שחקן חדש."],
    ["buddhist", "fabled", "Buddhist", "בודהיסט", "☸️", "fabled", "For the first 2 minutes of each day, veteran players may not talk.", "בשתי הדקות הראשונות של כל יום שחקנים ותיקים לא מדברים."],
    ["hells_librarian", "fabled", "Hell's Librarian", "ספרנית הגיהנום", "🤫", "fabled", "Something bad might happen to whoever talks when the Storyteller asks for silence.", "משהו רע עלול לקרות למי שמדבר כשמספר הסיפור מבקש שקט."],
    ["revolutionary", "fabled", "Revolutionary", "מהפכן", "✊", "fabled", "2 neighbours are known to be on the same team; once per game one of them registers falsely.", "שני שכנים ידועים כבני אותו צד; פעם במשחק אחד מהם נרשם לא נכון."],
    ["fiddler", "fabled", "Fiddler", "כנר", "🎻", "fabled", "Once per game the Demon secretly picks an opposing player; all players vote which of the two wins.", "פעם במשחק השד בוחר יריב בסוד, וכולם מצביעים מי מהשניים מנצח."],
    ["toymaker", "fabled", "Toymaker", "צעצוען", "🪀", "fabled", "The Demon may choose not to attack and must do so at least once per game; evil players get normal starting info.", "השד רשאי לוותר על התקפה ופעם אחת חייב; הרעים מקבלים מידע פתיחה רגיל."],
    ["fibbin", "fabled", "Fibbin", "פיבין", "🃏", "fabled", "Once per game, one good player might get incorrect information.", "פעם במשחק, שחקן טוב אחד עלול לקבל מידע שגוי."],
    ["duchess", "fabled", "Duchess", "דוכסית", "🫖", "fabled", "Each day 3 players may visit; at night each visitor learns how many visitors are evil, but one gets false info.", "בכל יום 3 שחקנים מבקרים; בלילה כל מבקר לומד כמה מהמבקרים רעים — אבל אחד מקבל מידע שגוי."],
    ["sentinel", "fabled", "Sentinel", "זקיף", "🛡️", "fabled", "There might be 1 extra or 1 fewer Outsider in play.", "ייתכן שיש אאוטסיידר אחד יותר או פחות."],
    ["spirit_of_ivory", "fabled", "Spirit of Ivory", "רוח השנהב", "🦣", "fabled", "There can't be more than 1 extra evil player.", "לא יכול להיות יותר משחקן רע אחד נוסף."],
    ["djinn", "fabled", "Djinn", "ג'יני", "🧞", "fabled", "Use the Djinn's special rule; all players know what it is.", "משתמשים בחוק המיוחד של הג'יני — וכולם יודעים מהו."],
    ["storm_catcher", "fabled", "Storm Catcher", "תופס הסערה", "⛈️", "fabled", "Names a good character; if in play, it can only die by execution, and evil players learn which player it is.", "קובע דמות טובה; אם היא במשחק — היא מתה רק בהוצאה להורג, והרעים יודעים מי היא."],
    ["bootlegger", "fabled", "Bootlegger", "מבריח", "🍾", "fabled", "This script has homebrew characters or rules.", "בתסריט יש דמויות או חוקים ביתיים."],
    ["ferryman", "fabled", "Ferryman", "המעבורתן", "⛵", "fabled", "On the final day, all dead players regain their vote token.", "ביום האחרון כל המתים מקבלים בחזרה את אסימון ההצבעה."],
    ["gardener", "fabled", "Gardener", "גנן", "🌷", "fabled", "The Storyteller assigns 1 or more players' characters.", "מספר הסיפור קובע את הדמות של שחקן אחד או יותר."]
  ];
  for (const [id, type, en, he, icon, ed, aen, ahe] of X) {
    const old = R.find(r => r.id === id);
    if (old) { if (id === "acrobat") old.type = "townsfolk"; continue; }   // Acrobat is a Townsfolk
    R.push({ id, type, name_en: en, name_he: he, ability_en: aen, ability_he: ahe, icon, editions: [ed], firstNight: 0, otherNight: 0, summary: true });
  }
})();
