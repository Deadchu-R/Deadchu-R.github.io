// assets/bootkeh-themes.js — the Theme generator of Bootkeh (window.BKThemes).
// Themes in three families: history (real events), movies (film genres and their classic set-ups) and RPGs
// (tabletop / video-game role-playing settings). Each theme gives the storyteller a title, the setting, who the
// town is, what the Demon and the Minions are in this world, and an opening to read aloud. A random twist is added.
// All texts are original; movie themes are genre set-ups, not any specific film.
(function () {
  "use strict";
  // [icon, title EN, title HE, setting EN, setting HE, town EN, town HE, demon EN, demon HE, minions EN, minions HE, opening EN, opening HE]
  const H = [
    ["⚓", "The Last Night of the Titanic, 1912", "הלילה האחרון של הטיטאניק, 1912", "An ocean liner in the North Atlantic, hours before the iceberg.", "אונייה ענקית באוקיינוס האטלנטי, שעות לפני הקרחון.", "Passengers of every class", "נוסעים מכל המחלקות", "A stowaway who feeds on fear", "נוסע סמוי שניזון מפחד", "Bribed stewards", "דיילים משוחדים", "The band is still playing, but someone below deck has locked the doors…", "התזמורת עדיין מנגנת, אבל מישהו בבטן הספינה נעל את הדלתות…"],
    ["🌋", "Pompeii, the Eve of the Eruption, 79 AD", "פומפיי, ערב ההתפרצות, 79 לספירה", "A rich Roman town as Vesuvius rumbles.", "עיר רומית עשירה בזמן שהווזוב רועם.", "Merchants, priests and gladiators", "סוחרים, כוהנים וגלדיאטורים", "A fire spirit from the mountain", "רוח אש מן ההר", "Cultists of Vulcan", "כת הסוגדים לוולקן", "Ash falls like snow. The augurs say one of you angered the gods.", "אפר יורד כמו שלג. המגידים אומרים שאחד מכם הכעיס את האלים."],
    ["⚖️", "The Salem Witch Trials, 1692", "משפטי המכשפות בסיילם, 1692", "A Puritan village gripped by accusations.", "כפר פוריטני שאחוז בהאשמות.", "Farmers and church elders", "חקלאים וזקני הכנסייה", "A true witch hiding among the accusers", "מכשפה אמיתית שמסתתרת בין המאשימים", "Lying witnesses", "עדים משקרים", "The court is in session. Tonight, someone will be named.", "בית הדין מתכנס. הלילה מישהו יואשם."],
    ["🏛️", "The Ides of March, 44 BC", "אידי מרץ, 44 לפני הספירה", "The Roman Senate, the morning Caesar is due to speak.", "הסנאט הרומי, בבוקר שבו קיסר אמור לנאום.", "Senators and soothsayers", "סנאטורים ומגידי עתידות", "A conspirator who wants an empire", "קושר שרוצה אימפריה", "Daggers in the togas", "פגיונות בתוך הטוגות", "Beware the Ides of March — the soothsayer whispers your name.", "היזהר מאידי מרץ — המגיד לוחש את שמך."],
    ["🐀", "The Black Death, Florence 1348", "המוות השחור, פירנצה 1348", "A walled city closing its gates to the plague.", "עיר מוקפת חומה שסוגרת שערים מפני המגפה.", "Physicians, monks and guildsmen", "רופאים, נזירים ובעלי גילדות", "The plague given a face", "המגפה בדמות אדם", "Rat-catchers who spread it", "לוכדי עכברים שמפיצים אותה", "Mark the doors with red crosses. Not every sick man is what he seems.", "סמנו את הדלתות בצלב אדום. לא כל חולה הוא מה שהוא נראה."],
    ["🎭", "Venice Carnival, 1750", "קרנבל ונציה, 1750", "Masks, canals and a Doge with many enemies.", "מסכות, תעלות ודוג'ה עם הרבה אויבים.", "Nobles behind masks", "אצילים מאחורי מסכות", "A masked assassin of the Council of Ten", "מתנקש רעול פנים של מועצת העשרה", "Spies of the Republic", "מרגלי הרפובליקה", "Tonight everyone wears a mask — and one mask never comes off.", "הלילה כולם עוטים מסכה — ומסכה אחת לעולם לא יורדת."],
    ["🗽", "Prohibition Chicago, 1927", "שיקגו של היובש, 1927", "Speakeasies, jazz and police on the payroll.", "בארים מחתרתיים, ג'אז ושוטרים משוחדים.", "Bootleggers, reporters and honest cops", "מבריחים, עיתונאים ושוטרים ישרים", "A crime boss nobody has seen", "בוס מאפיה שאף אחד לא ראה", "His enforcers", "האוכפים שלו", "The password is 'clocktower'. Someone in this bar is wearing a wire.", "הסיסמה היא 'מגדל שעון'. מישהו בבר הזה מצותת."],
    ["❄️", "The Lost Polar Expedition, 1845", "משלחת הקוטב האבודה, 1845", "Two ships frozen in the Arctic ice.", "שתי ספינות שקפאו בקרח הארקטי.", "Sailors and officers", "מלחים וקצינים", "The thing under the ice", "היצור שמתחת לקרח", "Mutineers", "מורדים", "The food is running out, and the footprints around the ship are not ours.", "האוכל אוזל, ועקבות הרגליים סביב הספינה אינם שלנו."],
    ["🏯", "Sengoku Japan, 1560", "יפן של תקופת סנגוקו, 1560", "A castle town during the age of warring states.", "עיר מבצר בתקופת המדינות הלוחמות.", "Samurai, monks and farmers", "סמוראים, נזירים ואיכרים", "A yokai shapeshifter", "יוקאי משנה צורה", "Ninja of a rival clan", "נינג'ות של שבט יריב", "The daimyo is dead. By morning the castle chooses a new master.", "הדאימיו מת. עד הבוקר הטירה תבחר אדון חדש."],
    ["🛰️", "The Space Race, 1961", "המרוץ לחלל, 1961", "A secret launch base during the Cold War.", "בסיס שיגור סודי בזמן המלחמה הקרה.", "Engineers and pilots", "מהנדסים וטייסים", "A double agent", "סוכן כפול", "Saboteurs", "מחבלים", "Launch is at dawn. One of us has already sold the plans.", "השיגור בשחר. אחד מאיתנו כבר מכר את התוכניות."],
    ["🏺", "The Library of Alexandria, 48 BC", "הספרייה של אלכסנדריה, 48 לפני הספירה", "Scholars guarding the world's knowledge as war comes.", "חכמים ששומרים על כל הידע בעולם כשהמלחמה מגיעה.", "Scholars and scribes", "חכמים וסופרים", "An arsonist who hates knowledge", "מצית ששונא ידע", "Book thieves", "גנבי ספרים", "The scrolls must be saved — but someone is carrying a torch.", "צריך להציל את המגילות — אבל מישהו מחזיק לפיד."],
    ["⛏️", "Klondike Gold Rush, 1898", "הבהלה לזהב בקלונדייק, 1898", "A frozen mining town where gold makes men mad.", "עיירת כורים קפואה שבה הזהב משגע אנשים.", "Prospectors and saloon owners", "מחפשי זהב ובעלי סלונים", "A claim-jumper who kills for gold", "גונב מכרות שהורג בשביל זהב", "Card sharks", "רמאי קלפים", "Someone struck gold yesterday. Today he was found in the snow.", "מישהו מצא זהב אתמול. היום הוא נמצא בשלג."]
  ];
  const M = [
    ["💎", "The Heist (heist films)", "השוד הגדול (סרטי שוד)", "A casino vault, a crew of specialists and a perfect plan.", "כספת של קזינו, צוות מומחים ותוכנית מושלמת.", "The crew", "הצוות", "The traitor who planned it all", "הבוגד שתכנן הכול", "Security on the inside", "האבטחה מבפנים", "The plan is perfect. That's what worries me.", "התוכנית מושלמת. זה מה שמדאיג אותי."],
    ["🔍", "Murder at the Manor (whodunit films)", "רצח באחוזה (סרטי בלש)", "A storm, a country house and a dead host.", "סערה, אחוזה כפרית ומארח מת.", "Guests and servants", "אורחים ומשרתים", "The murderer at the table", "הרוצח שליד השולחן", "Heirs who gain from the will", "יורשים שמרוויחים מהצוואה", "No one leaves until we know who did it.", "אף אחד לא יוצא עד שנדע מי עשה את זה."],
    ["🧟", "Zombie Outbreak (survival horror)", "התפרצות זומבים (אימה הישרדותית)", "A barricaded mall on day three.", "קניון מבוצר ביום השלישי.", "Survivors", "ניצולים", "Patient zero, still hiding the bite", "החולה הראשון, שעדיין מסתיר את הנשיכה", "The infected", "הנדבקים", "Check everyone for bites. Twice.", "בדקו את כולם לנשיכות. פעמיים."],
    ["👽", "The Thing in the Base (sci-fi horror)", "היצור בבסיס (אימת מדע בדיוני)", "An isolated research station and a creature that copies people.", "תחנת מחקר מבודדת ויצור שמעתיק בני אדם.", "Researchers", "חוקרים", "The alien copy", "העותק החייזרי", "Copies it already made", "עותקים שהוא כבר יצר", "One of us isn't one of us anymore.", "אחד מאיתנו כבר לא אחד מאיתנו."],
    ["🤠", "High Noon (westerns)", "צהרי היום (מערבונים)", "A dusty frontier town waiting for the noon train.", "עיירת ספר מאובקת שמחכה לרכבת של הצהריים.", "Townsfolk and a tired sheriff", "תושבים ושריף עייף", "The outlaw coming home", "פורע החוק שחוזר הביתה", "His gang already in town", "החבורה שלו שכבר בעיר", "The train arrives at noon. So does he.", "הרכבת מגיעה בצהריים. גם הוא."],
    ["🕵️", "Cold War Spies (spy thrillers)", "מרגלים במלחמה הקרה (מותחני ריגול)", "A Berlin safe house full of agents.", "דירת מסתור בברלין מלאה בסוכנים.", "Agents of the West", "סוכני המערב", "A mole at the top", "חפרפרת בצמרת", "Sleeper agents", "סוכנים רדומים", "The list of names was stolen at midnight.", "רשימת השמות נגנבה בחצות."],
    ["🚀", "Lost Starship (space opera)", "ספינת חלל אבודה (אופרת חלל)", "A colony ship drifting with its AI gone silent.", "ספינת התיישבות שנסחפת והבינה המלאכותית שלה שותקת.", "The crew", "הצוות", "A rogue AI wearing a crew face", "בינה מלאכותית סוררת עם פנים של איש צוות", "Corrupted androids", "אנדרואידים משובשים", "Life support: 72 hours. Trust: zero.", "תמיכת חיים: 72 שעות. אמון: אפס."],
    ["🎪", "The Haunted Carnival (horror)", "הקרנבל הרדוף (אימה)", "A travelling fair that arrives at midnight.", "יריד נודד שמגיע בחצות.", "Visitors and carnies", "מבקרים ואנשי הקרקס", "The Ringmaster", "מנהל הזירה", "Clowns", "ליצנים", "Step right up — some tickets are one-way.", "היכנסו, היכנסו — חלק מהכרטיסים הם לכיוון אחד."],
    ["🏴‍☠️", "Mutiny on the High Seas (pirate films)", "מרד בים הפתוח (סרטי פיראטים)", "A pirate ship with a map and too many captains.", "ספינת פיראטים עם מפה ויותר מדי קברניטים.", "The crew", "אנשי הצוות", "A cursed captain", "קברניט מקולל", "Mutineers", "מורדים", "Whoever holds the map holds the ship.", "מי שמחזיק את המפה מחזיק בספינה."],
    ["🌆", "Neon Noir (cyberpunk films)", "נואר ניאון (סרטי סייברפאנק)", "A rain-soaked megacity run by corporations.", "עיר ענק שטופת גשם בשליטת תאגידים.", "Hackers and street people", "האקרים ואנשי רחוב", "A corporate AI", "בינה מלאכותית תאגידית", "Chromed enforcers", "אוכפים עם שתלים", "Your memories might not be yours. Check your implants.", "ייתכן שהזיכרונות שלך אינם שלך. בדוק את השתלים."],
    ["🧛", "Dracula's Castle (gothic horror)", "הטירה של דרקולה (אימה גותית)", "A castle in the Carpathians and a host who never eats.", "טירה בהרי הקרפטים ומארח שאף פעם לא אוכל.", "Travellers stranded for the night", "מטיילים שנתקעו ללילה", "The Count", "הרוזן", "Thralls and brides", "משרתים וכלות", "The doors lock at sunset. Do not open them for anyone.", "הדלתות ננעלות בשקיעה. אל תפתחו לאף אחד."],
    ["🏝️", "Island Survival (survival films)", "הישרדות באי (סרטי הישרדות)", "Plane crash survivors on an island that is not on any map.", "ניצולי התרסקות על אי שלא מופיע באף מפה.", "Passengers", "נוסעים", "The island itself", "האי עצמו", "Others who were here before", "אחרים שהיו כאן קודם", "The radio works — but someone keeps turning it off.", "הקשר עובד — אבל מישהו ממשיך לכבות אותו."]
  ];
  const P = [
    ["🐉", "The Dragon's Hoard (high fantasy)", "האוצר של הדרקון (פנטזיה)", "A mountain town under a dragon's shadow.", "עיר הררית בצל דרקון.", "Adventurers and villagers", "הרפתקנים וכפריים", "A dragon in human form", "דרקון בדמות אדם", "Kobold spies", "מרגלים קובולדים", "The dragon wants tribute: one of you, by dawn.", "הדרקון רוצה מס: אחד מכם, עד השחר."],
    ["🕯️", "Cult of the Old Ones (cosmic horror RPG)", "כת הקדמונים (אימה קוסמית)", "A fishing village with strange tides and stranger smiles.", "כפר דייגים עם גאות מוזרה וחיוכים מוזרים יותר.", "Investigators", "חוקרים", "Something that came from the sea", "משהו שעלה מן הים", "Cultists", "כת הסוגדים", "Do not read the book. Someone already did.", "אל תקראו בספר. מישהו כבר קרא."],
    ["⚔️", "The Dungeon Below (dungeon crawl)", "המבוך שמתחת (מבוכים)", "A party lost deep in a dungeon, torches burning low.", "חבורה שאבדה עמוק במבוך, והלפידים דועכים.", "The adventuring party", "חבורת ההרפתקנים", "A mimic disguised as one of you", "חיקוי שמתחפש לאחד מכם", "Goblins in the walls", "גובלינים בקירות", "Roll for initiative. Someone already rolled against you.", "הטילו קוביית יוזמה. מישהו כבר הטיל נגדכם."],
    ["🐺", "Werewolf Moon (dark fantasy)", "ירח הזאבים (פנטזיה אפלה)", "A forest village on the night of the blood moon.", "כפר ביער בליל ירח הדם.", "Hunters and villagers", "ציידים וכפריים", "The alpha werewolf", "זאב האלפא", "Its pack", "הלהקה שלו", "The moon is full and red. Lock the shutters.", "הירח מלא ואדום. נעלו את התריסים."],
    ["🧙", "The Mage Academy (fantasy school)", "אקדמיית הקוסמים (פנטזיה)", "A school of magic on the night of the final exam.", "בית ספר לקסם בליל המבחן האחרון.", "Students and professors", "תלמידים ומורים", "A dark wizard enrolled in secret", "קוסם אפל שנרשם בסתר", "Students he has charmed", "תלמידים שהוא כישף", "The headmaster's staff is missing. So is a student.", "המטה של המנהל נעלם. וגם תלמיד אחד."],
    ["🏰", "Court of Thrones (political fantasy)", "חצר הכתרים (פנטזיה פוליטית)", "A royal court after the king's sudden death.", "חצר מלכות אחרי מות המלך הפתאומי.", "Lords and ladies", "לורדים וגבירות", "A usurper", "גוזל כתר", "Poisoners at court", "מרעילים בחצר", "Long live the king — but which one?", "יחי המלך — אבל איזה?"],
    ["☢️", "Vault Under the Wasteland (post-apocalypse RPG)", "מקלט מתחת לשממה (פוסט־אפוקליפסה)", "An underground shelter after the bombs.", "מקלט תת־קרקעי אחרי הפצצות.", "Vault dwellers", "תושבי המקלט", "The Overseer's secret", "הסוד של המפקח", "Raiders let in at night", "שודדים שנכנסים בלילה", "The water chip is failing. Someone sabotaged it.", "שבב המים מתקלקל. מישהו חיבל בו."],
    ["🧝", "The Elven Forest (fantasy)", "יער האלפים (פנטזיה)", "An ancient forest where trees whisper secrets.", "יער עתיק שבו העצים לוחשים סודות.", "Elves and druids", "אלפים ודרואידים", "A corrupted spirit of the woods", "רוח יער שהושחתה", "Blighted creatures", "יצורים מורעלים", "The oldest tree is dying, and its roots point at one of you.", "העץ העתיק מת, והשורשים שלו מצביעים על אחד מכם."],
    ["🤖", "Steam & Gears (steampunk RPG)", "קיטור וגלגלי שיניים (סטימפאנק)", "A city of airships and clockwork.", "עיר של ספינות אוויר ושעונים.", "Inventors and airship crews", "ממציאים וצוותי ספינות אוויר", "A mad automaton", "רובוט מכני מטורף", "Clockwork spies", "מרגלים מכניים", "The great clock has stopped. That has never happened before.", "השעון הגדול נעצר. זה מעולם לא קרה."],
    ["🌌", "Starship Bridge (space RPG)", "גשר הפיקוד (חלל)", "A starship bridge cut off from home.", "גשר פיקוד של ספינת חלל שנותקה מהבית.", "Officers", "קצינים", "A shapeshifter", "משנה צורה", "Loyalists of the enemy empire", "נאמני האימפריה האויבת", "Red alert. The traitor is on the bridge.", "כוננות אדומה. הבוגד נמצא בגשר."],
    ["⚰️", "Vampire Masquerade (gothic RPG)", "נשף הערפדים (גותי)", "A city where vampire clans hide among humans.", "עיר שבה שבטי ערפדים מסתתרים בין בני אדם.", "Hunters and mortals", "ציידים ובני תמותה", "An elder vampire", "ערפד עתיק", "Ghouls", "גולים", "The masquerade must not break — but blood was spilled in public.", "אסור שהמסכה תיפול — אבל דם נשפך בפומבי."],
    ["🗡️", "Thieves' Guild (fantasy)", "גילדת הגנבים (פנטזיה)", "A guild hall after the treasury was emptied.", "אולם הגילדה אחרי שהאוצר רוקן.", "Thieves", "גנבים", "The guildmaster's killer", "הרוצח של ראש הגילדה", "Informers for the city watch", "מלשינים של משמר העיר", "Honour among thieves ends tonight.", "הכבוד בין גנבים נגמר הלילה."]
  ];
  const TW = [
    ["…and a storm cuts off the town.", "…וסערה מנתקת את העיר מהעולם."], ["…on the longest night of the year.", "…בלילה הארוך בשנה."],
    ["…and the bells ring thirteen times.", "…והפעמונים מצלצלים שלוש עשרה פעמים."], ["…during a royal wedding.", "…באמצע חתונה מלכותית."],
    ["…while a comet burns in the sky.", "…בזמן ששביט בוער בשמיים."], ["…and nobody remembers yesterday.", "…ואף אחד לא זוכר את אתמול."],
    ["…on the night of a masked ball.", "…בליל נשף מסכות."], ["…as the river floods the streets.", "…כשהנהר מציף את הרחובות."],
    ["…and the town's founder returns from the grave.", "…ומייסד העיר חוזר מהקבר."], ["…with only one candle left.", "…ורק נר אחד נשאר."]
  ];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const FAM = { history: H, movies: M, rpg: P };
  const FAM_LABEL = { history: ["History", "היסטוריה"], movies: ["Movies", "סרטים"], rpg: ["RPG", "משחקי תפקידים"] };
  // ---- a world builder, so worlds don't repeat: places, Demons, Minions, openings and twists of one genre are
  //      combined (thousands of combinations), mixed with the hand-written worlds above, and the last worlds you saw
  //      are skipped. [icon, title EN, title HE, setting EN, setting HE, town EN, town HE] / [EN, HE] ----
  const G = {
    historic: {
      fam: "history",
      places: [
        ["🏛️", "Byzantium Under Siege, 1453", "ביזנטיון במצור, 1453", "Constantinople's walls tremble under the cannons.", "חומות קונסטנטינופול רועדות מול התותחים.", "Monks, soldiers and merchants", "נזירים, חיילים וסוחרים"],
        ["🏺", "The Pharaoh's Tomb, 1323 BC", "קבר הפרעה, 1323 לפני הספירה", "Workers seal the tomb of a young king.", "פועלים אוטמים את קברו של מלך צעיר.", "Priests, builders and scribes", "כוהנים, בונים וסופרים"],
        ["⚔️", "The Viking Longhouse, 870", "בית הוויקינגים, 870", "A winter feast in a fjord far from any king.", "משתה חורף בפיורד רחוק מכל מלך.", "Jarls, skalds and shieldmaidens", "יארלים, משוררים ולוחמות מגן"],
        ["🗼", "Paris, the Night of the Revolution, 1789", "פריז, ליל המהפכה, 1789", "Barricades rise and the Bastille is next.", "בריקדות עולות והבסטיליה הבאה בתור.", "Citizens, nobles and guards", "אזרחים, אצילים ושומרים"],
        ["🚂", "The Orient Express, 1934", "האוריינט אקספרס, 1934", "A luxury train stuck in a snowdrift in the Balkans.", "רכבת פאר שנתקעה בשלג בבלקן.", "Passengers and staff", "נוסעים ואנשי צוות"],
        ["🏜️", "The Silk Road Caravan, 1271", "שיירה בדרך המשי, 1271", "A caravanserai in the desert, a night's ride from Samarkand.", "חאן בלב המדבר, לילה רכיבה מסמרקנד.", "Traders, guides and pilgrims", "סוחרים, מורי דרך ועולי רגל"],
        ["🏰", "The Crusader Fortress, 1187", "מבצר הצלבנים, 1187", "A castle on a hill as the great army approaches.", "טירה על גבעה כשהצבא הגדול מתקרב.", "Knights, squires and villagers", "אבירים, נושאי כלים וכפריים"],
        ["🎩", "Victorian London Fog, 1888", "ערפל לונדון הוויקטוריאנית, 1888", "Gaslight, cobblestones and a fog nobody can see through.", "פנסי גז, אבני מרצפת וערפל שאי אפשר לראות דרכו.", "Constables, doctors and dockworkers", "שוטרים, רופאים ופועלי נמל"],
      ],
      demons: [["A plague doctor who spreads what he cures", "רופא מגפות שמפיץ את מה שהוא מרפא"], ["An enemy general in disguise", "גנרל של האויב בתחפושת"], ["A cursed relic that whispers to its keeper", "שריד מקולל שלוחש לשומר שלו"],
        ["The king's poisoner", "המרעיל של המלך"], ["A false prophet", "נביא שקר"], ["The executioner, who enjoys his work", "התליין, שנהנה מהעבודה שלו"], ["A spy of the rival empire", "מרגל של האימפריה היריבה"]],
      minions: [["Bribed guards", "שומרים משוחדים"], ["Smugglers in the cellars", "מבריחים במרתפים"], ["Followers of the old cult", "חסידי הכת הישנה"], ["Courtiers with debts", "אנשי חצר עם חובות"],
        ["Informers", "מלשינים"], ["Forgers of letters", "זייפני מכתבים"], ["Mercenaries paid in gold", "שכירי חרב שמקבלים זהב"]],
      openings: [["History will remember tonight — if anyone survives to write it.", "ההיסטוריה תזכור את הלילה הזה — אם מישהו ישרוד כדי לכתוב אותה."], ["The gates are shut. Nobody leaves until dawn.", "השערים נסגרו. אף אחד לא יוצא עד הזריחה."],
        ["A letter with a broken seal was found this morning.", "הבוקר נמצא מכתב עם חותם שבור."], ["The bells have stopped, and the candles burn low.", "הפעמונים השתתקו, והנרות דועכים."], ["Someone in this room is not who they claim to be.", "מישהו בחדר הזה הוא לא מי שהוא טוען."], ["Tonight, loyalty costs more than gold.", "הלילה, נאמנות עולה יותר מזהב."]],
    },
    crime: {
      fam: "movies",
      places: [
        ["🎰", "Last Night in Vegas (crime films)", "לילה אחרון בווגאס (סרטי פשע)", "A casino on the Strip, the night of the big fight.", "קזינו בסטריפ, בליל הקרב הגדול.", "Dealers, gamblers and bouncers", "דילרים, מהמרים ומאבטחים"],
        ["🛳️", "Murder on the Cruise (whodunit films)", "רצח בשייט (סרטי בלש)", "A cruise ship in the middle of the sea, and the captain is dead.", "ספינת תענוגות באמצע הים, והקברניט מת.", "Passengers and crew", "נוסעים ואנשי צוות"],
        ["🏦", "The Bank Job (heist films)", "עבודת הבנק (סרטי שוד)", "A bank vault, a tunnel and a long weekend.", "כספת בנק, מנהרה וסוף שבוע ארוך.", "The crew", "הצוות"],
        ["🍝", "The Family Dinner (mafia films)", "ארוחת המשפחה (סרטי מאפיה)", "A restaurant in Little Italy, the night the Don retires.", "מסעדה ברובע האיטלקי, בלילה שבו הדון פורש.", "The family", "המשפחה"],
        ["🏨", "The Grand Hotel (mystery films)", "המלון הגדול (סרטי מסתורין)", "An old mountain hotel, snowed in for the holidays.", "מלון הררי ישן, מושלג בחגים.", "Guests and the night staff", "אורחים ומשמרת הלילה"],
        ["📺", "Live on Air (thriller films)", "בשידור חי (מותחנים)", "A TV studio during the final of a reality show.", "אולפן טלוויזיה בגמר של ריאליטי.", "Contestants and the crew", "מתמודדים וצוות ההפקה"],
      ],
      demons: [["The mastermind who hired everyone", "המוח שגייס את כולם"], ["A hitman with a perfect alibi", "רוצח שכיר עם אליבי מושלם"], ["The detective who is the killer", "הבלש שהוא הרוצח"], ["The boss nobody has ever seen", "הבוס שאף אחד לא ראה"], ["A blackmailer who knows everyone's secret", "סוחט שיודע את הסוד של כולם"], ["A con artist with many faces", "נוכל עם הרבה פרצופים"]],
      minions: [["Crooked cops", "שוטרים מושחתים"], ["The getaway drivers", "נהגי המילוט"], ["Paid witnesses", "עדים בתשלום"], ["Inside men", "סוכנים מבפנים"], ["The muscle", "הבריונים"], ["A lawyer with no conscience", "עורך דין בלי מצפון"]],
      openings: [["Nobody planned for a body.", "אף אחד לא תכנן גופה."], ["The lights go out for six seconds. When they return, someone is dead.", "האורות כבים לשש שניות. כשהם חוזרים, מישהו מת."], ["Everyone has an alibi. Not everyone is telling the truth.", "לכולם יש אליבי. לא כולם אומרים אמת."],
        ["The money is gone, and so is the trust.", "הכסף נעלם, וגם האמון."], ["The doors are locked from the inside.", "הדלתות נעולות מבפנים."], ["One of you made a deal. Tonight it comes due.", "אחד מכם עשה עסקה. הלילה מגיע התשלום."]],
    },
    horror: {
      fam: "movies",
      places: [
        ["🏕️", "Summer Camp, Lake Black (slasher films)", "מחנה קיץ באגם השחור (סרטי סלאשר)", "Cabins by the lake, the last week of summer.", "בקתות על האגם, בשבוע האחרון של הקיץ.", "Counsellors and campers", "מדריכים וחניכים"],
        ["🏚️", "The House on the Hill (haunted house films)", "הבית שעל הגבעה (סרטי בית רדוף)", "A family inherits a house no one would sell to them.", "משפחה יורשת בית שאף אחד לא רצה למכור להם.", "The family and the neighbours", "המשפחה והשכנים"],
        ["🏥", "Ward 13 (hospital horror)", "מחלקה 13 (אימה בבית חולים)", "An abandoned hospital wing that still has patients.", "אגף נטוש בבית חולים שעדיין יש בו מטופלים.", "Nurses, doctors and patients", "אחיות, רופאים ומטופלים"],
        ["🌽", "The Harvest (folk horror)", "הקציר (אימה עממית)", "A village with a festival that outsiders never see the end of.", "כפר עם פסטיבל שזרים אף פעם לא רואים את סופו.", "Villagers and a few visitors", "כפריים וכמה מבקרים"],
        ["🚇", "Last Train (horror)", "הרכבת האחרונה (אימה)", "The last subway train stops between stations and won't move.", "רכבת התחתית האחרונה נעצרת בין תחנות ולא זזה.", "Passengers", "נוסעים"],
        ["🎞️", "The Cursed Tape (supernatural horror)", "הקלטת המקוללת (אימה על טבעית)", "Everyone in town watched the tape. Seven days ago.", "כולם בעיר צפו בקלטת. לפני שבעה ימים.", "Students and townsfolk", "סטודנטים ותושבים"],
      ],
      demons: [["The thing in the mask", "הדבר שמאחורי המסכה"], ["A ghost who wants a body", "רוח רפאים שרוצה גוף"], ["The doll in the attic", "הבובה בעליית הגג"], ["A demon summoned by accident", "שד שזומן בטעות"], ["The town's oldest resident, who never ages", "התושב הוותיק בעיר, שלא מזדקן"], ["The Shadow Man", "איש הצל"]],
      minions: [["Possessed friends", "חברים דיבוקים"], ["The cult that welcomed you", "הכת שקיבלה אתכם בברכה"], ["Whispering children", "ילדים לוחשים"], ["Those who already watched", "אלה שכבר צפו"], ["The caretakers", "השומרים"], ["Things in the walls", "דברים בתוך הקירות"]],
      openings: [["Don't split up. Whatever you hear, don't split up.", "אל תתפצלו. מה שלא תשמעו, אל תתפצלו."], ["The phones lost signal at midnight.", "הטלפונים איבדו קליטה בחצות."], ["Somebody is knocking — from inside the closet.", "מישהו דופק — מתוך הארון."],
        ["Count heads. There is one more of you than this morning.", "תספרו ראשים. יש אחד יותר מהבוקר."], ["The radio is playing a song nobody here has heard before.", "ברדיו מתנגן שיר שאף אחד כאן לא שמע אף פעם."], ["Lock the doors. It already has a key.", "נעלו את הדלתות. למה שבחוץ כבר יש מפתח."]],
    },
    scifi: {
      fam: "movies",
      places: [
        ["🪐", "Colony on Mars, 2149 (sci-fi films)", "מושבה על מאדים, 2149 (מדע בדיוני)", "A dome colony as the dust storm cuts the link to Earth.", "מושבת כיפה כשסופת אבק מנתקת את הקשר לכדור הארץ.", "Colonists and engineers", "מתיישבים ומהנדסים"],
        ["🧬", "The Lab Below (sci-fi thriller)", "המעבדה שמתחת (מותחן מדע בדיוני)", "A secret lab under a mountain after an experiment goes wrong.", "מעבדה סודית מתחת להר אחרי שניסוי השתבש.", "Scientists and security", "מדענים ואנשי אבטחה"],
        ["🛸", "First Contact (sci-fi films)", "מגע ראשון (מדע בדיוני)", "A small town the night the lights appear in the sky.", "עיירה קטנה בלילה שבו האורות מופיעים בשמיים.", "Townsfolk and soldiers", "תושבים וחיילים"],
        ["🌊", "Deep Station (underwater sci-fi)", "תחנת המעמקים (מדע בדיוני תת ימי)", "A research station at the bottom of the ocean.", "תחנת מחקר בקרקעית האוקיינוס.", "Divers and researchers", "צוללנים וחוקרים"],
        ["🤖", "The Android Factory (sci-fi films)", "מפעל האנדרואידים (מדע בדיוני)", "A factory where the robots look exactly like us.", "מפעל שבו הרובוטים נראים בדיוק כמונו.", "Workers — all of them human, they say", "עובדים — כולם בני אדם, לפחות כך הם אומרים"],
        ["⏳", "The Time Loop (sci-fi films)", "לולאת הזמן (מדע בדיוני)", "The same night, again and again.", "אותו לילה, שוב ושוב.", "Guests at a birthday party", "אורחים במסיבת יום הולדת"],
      ],
      demons: [["An alien wearing a human face", "חייזר שלובש פנים של אדם"], ["The station's AI", "הבינה המלאכותית של התחנה"], ["Patient zero of the virus", "החולה הראשון בנגיף"], ["A time traveller who came to change everything", "נוסע בזמן שבא לשנות הכול"], ["The android that thinks it's human", "אנדרואיד שחושב שהוא אדם"], ["A clone of the commander", "שיבוט של המפקד"]],
      minions: [["Infected crew", "אנשי צוות נגועים"], ["Corporate agents", "סוכני התאגיד"], ["Hacked robots", "רובוטים שנפרצו"], ["Cultists of the signal", "חסידי האות"], ["Mutineers", "מורדים"], ["Copies", "העתקים"]],
      openings: [["Oxygen at 40%. Trust at zero.", "חמצן 40%. אמון — אפס."], ["The signal says: 'We are already among you.'", "האות אומר: 'אנחנו כבר ביניכם'."], ["System reboot complete. Crew count: one too many.", "אתחול המערכת הושלם. מספר אנשי הצוות: אחד יותר מדי."],
        ["Earth stopped answering three days ago.", "כדור הארץ הפסיק לענות לפני שלושה ימים."], ["Run the blood test. Everyone.", "תעשו בדיקת דם. לכולם."], ["The clock resets at dawn. Make tonight count.", "השעון מתאפס בזריחה. תנצלו את הלילה."]],
    },
    fantasy: {
      fam: "rpg",
      places: [
        ["🌋", "The Fire Mountain Forge (fantasy)", "הנפחייה בהר האש (פנטזיה)", "A dwarven city carved inside a volcano.", "עיר גמדים שנחצבה בתוך הר געש.", "Dwarves, smiths and miners", "גמדים, נפחים וכורים"],
        ["🌉", "The Floating City (fantasy)", "העיר המרחפת (פנטזיה)", "A city on islands that float above the clouds.", "עיר על איים שמרחפים מעל העננים.", "Sky-sailors and mages", "מלחי שמיים וקוסמים"],
        ["🍄", "The Fairy Market (fae fantasy)", "שוק הפיות (פנטזיה)", "A market that opens only at the full moon.", "שוק שנפתח רק בירח מלא.", "Traders, fae and fools", "סוחרים, פיות ותמימים"],
        ["🧊", "The Frozen North (sword & sorcery)", "הצפון הקפוא (חרב וכישוף)", "A frontier hold beyond the wall of ice.", "מבצר גבול מעבר לחומת הקרח.", "Rangers and clansfolk", "סיירים ובני שבטים"],
        ["🏜️", "The Sand Kingdom (desert fantasy)", "ממלכת החול (פנטזיה)", "An oasis palace where djinn are bound to serve.", "ארמון נווה מדבר שבו ג'ינים כבולים לשרת.", "Viziers, merchants and guards", "וזירים, סוחרים ושומרים"],
        ["🕍", "The Temple of Seven Gods (fantasy)", "מקדש שבעת האלים (פנטזיה)", "A holy city during the choosing of a new High Priest.", "עיר קדושה בזמן בחירת כוהן גדול חדש.", "Priests, pilgrims and paladins", "כוהנים, עולי רגל ופלדינים"],
        ["🐉", "The Dragon Riders' Aerie (fantasy)", "קן רוכבי הדרקונים (פנטזיה)", "A cliff-top academy where dragon eggs hatch tonight.", "אקדמיה על צוק שבה ביצי הדרקונים בוקעות הלילה.", "Riders, keepers and cadets", "רוכבים, שומרים וצוערים"],
      ],
      demons: [["A lich hiding in a living body", "ליץ' שמתחבא בגוף חי"], ["A djinn who broke free", "ג'יני שהשתחרר"], ["The fairy queen's changeling", "הילד המוחלף של מלכת הפיות"], ["A shadow dragon", "דרקון צל"], ["The fallen paladin", "הפלדין שנפל"], ["A necromancer with a kind smile", "נקרומנסר עם חיוך נחמד"], ["The witch of the bog", "המכשפה מהביצה"]],
      minions: [["Goblin spies", "מרגלים גובלינים"], ["Cultists in robes", "כתתים בגלימות"], ["Cursed knights", "אבירים מקוללים"], ["Wraiths", "רוחות אופל"], ["Bandits sworn to the dark", "שודדים שנשבעו לאופל"], ["Charmed apprentices", "שוליות מכושפים"], ["Orc mercenaries", "שכירי חרב אורקים"]],
      openings: [["Roll for initiative — the darkness already did.", "הטילו קובייה — החושך כבר הטיל."], ["The prophecy said one of you would betray us. It didn't say who.", "הנבואה אמרה שאחד מכם יבגוד. היא לא אמרה מי."], ["The wards are failing. Something walks the halls.", "הלחשים המגינים נחלשים. משהו מסתובב במסדרונות."],
        ["Gather close to the fire. Not all of you will see it again.", "התקרבו למדורה. לא כולכם תראו אותה שוב."], ["The crown is missing, and so is the king.", "הכתר נעלם, וגם המלך."], ["Magic always has a price. Tonight someone pays it.", "לקסם תמיד יש מחיר. הלילה מישהו משלם אותו."]],
    },
    modern: {
      fam: "movies",
      places: [
        ["🏢", "The Office Party (comedy-thriller)", "מסיבת המשרד (קומדיה מותחת)", "The company holiday party, the night before the layoffs.", "מסיבת החג של החברה, בלילה שלפני הפיטורים.", "Employees", "עובדים"],
        ["🎓", "Reunion Night (mystery films)", "ליל המחזור (סרטי מסתורין)", "Twenty years after school, the class meets again.", "עשרים שנה אחרי התיכון, המחזור נפגש שוב.", "Old classmates", "חברים לשכבה"],
        ["🏝️", "The Influencer Retreat (satire)", "ריטריט המשפיענים (סאטירה)", "A luxury island villa, no phones allowed.", "וילה יוקרתית באי, בלי טלפונים.", "Influencers and their managers", "משפיענים והמנהלים שלהם"],
        ["🎸", "The Festival (thriller films)", "הפסטיבל (מותחנים)", "A desert music festival, three days in.", "פסטיבל מוזיקה במדבר, ביום השלישי.", "Fans, artists and the crew", "מעריצים, אמנים וצוות"],
        ["🏔️", "The Ski Lodge (mystery films)", "בקתת הסקי (סרטי מסתורין)", "A ski lodge cut off by an avalanche.", "בקתת סקי שנותקה ממפולת שלגים.", "Skiers and the staff", "גולשים והצוות"],
        ["⚽", "The Final (sports drama)", "הגמר (דרמת ספורט)", "The locker room before the cup final.", "חדר ההלבשה לפני גמר הגביע.", "Players and coaches", "שחקנים ומאמנים"],
      ],
      demons: [["The boss who sold everyone out", "הבוס שמכר את כולם"], ["A stalker in the group chat", "מטריד בקבוצת הוואטסאפ"], ["The fixer who bet on the result", "המאכער שהימר על התוצאה"], ["An old friend with an old grudge", "חבר ותיק עם טינה ישנה"], ["The host who invited you here", "המארח שהזמין אתכם לכאן"], ["The anonymous account", "החשבון האנונימי"]],
      minions: [["Leakers", "מדליפים"], ["Yes-men", "המהנהנים"], ["The cleaning crew who saw everything", "צוות הניקיון שראה הכול"], ["Fake followers", "עוקבים מזויפים"], ["Rivals with a plan", "יריבים עם תוכנית"], ["The camera crew", "צוות הצילום"]],
      openings: [["Someone posted the secret at midnight. Only we knew it.", "מישהו פרסם את הסוד בחצות. רק אנחנו ידענו אותו."], ["The Wi-Fi is down and so is the bridge.", "הוויי־פיי נפל, וגם הגשר."], ["Smile for the camera. It's always recording.", "חייכו למצלמה. היא תמיד מקליטה."],
        ["Last one standing gets everything.", "מי שנשאר אחרון מקבל הכול."], ["The group chat just went silent.", "קבוצת הוואטסאפ פתאום השתתקה."], ["Nobody leaves until we find out who did it.", "אף אחד לא הולך עד שנגלה מי עשה את זה."]],
    },
  };
  const TW2 = TW.concat([
    ["…and the dead can still talk tonight.", "…והמתים עוד יכולים לדבר הלילה."], ["…while the town sleeps under a spell.", "…בזמן שהעיר ישנה תחת כישוף."], ["…and every mirror shows a stranger.", "…ובכל מראה מופיע זר."],
    ["…on the eve of an eclipse.", "…בערב של ליקוי חמה."], ["…and the only road out has vanished.", "…והדרך היחידה החוצה נעלמה."], ["…while a fortune-teller's warning hangs in the air.", "…כשהאזהרה של מגדת העתידות עוד באוויר."],
    ["…and the food is running out.", "…והאוכל אוזל."], ["…as the old clock tower strikes midnight.", "…כשמגדל השעון הישן מצלצל חצות."], ["…and a stranger arrives with a sealed letter.", "…וזר מגיע עם מכתב חתום."],
    ["…on the anniversary of the great fire.", "…ביום השנה לשריפה הגדולה."], ["…and the dogs won't stop howling.", "…והכלבים לא מפסיקים ליילל."], ["…while the snow hides every footprint.", "…בזמן שהשלג מכסה כל עקבה."],
    ["…and the ballots were already counted.", "…והקולות כבר נספרו."], ["…and the heir has gone missing.", "…והיורש נעלם."], ["…during the hottest night in a century.", "…בלילה החם ביותר מזה מאה שנה."],
    ["…and the moon has not risen.", "…והירח לא עלה."], ["…while a rival town prepares for war.", "…בזמן שעיר יריבה מתכוננת למלחמה."], ["…and the rain tastes of iron.", "…והגשם בטעם של ברזל."],
    ["…and someone has been reading everyone's diaries.", "…ומישהו קרא את היומנים של כולם."], ["…while the circus is in town.", "…בזמן שהקרקס בעיר."], ["…and the town's well has run dry.", "…והבאר של העיר יבשה."],
  ]);
  const GEN_FAM = { history: ["historic"], movies: ["crime", "horror", "scifi", "modern"], rpg: ["fantasy", "horror", "scifi"] };
  let curatedCount = H.length + M.length + P.length, combos = 0;
  for (const k of Object.keys(G)) { const g = G[k]; combos += g.places.length * g.demons.length * g.minions.length * g.openings.length * TW2.length; }

  // the last worlds shown on this device (so "Another" doesn't bring them back) — titles and the demon of each
  const SEEN = "bk_theme_seen";
  const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || "[]"); } catch (e) { return []; } };
  const remember = key => { try { const l = seen().filter(x => x !== key); l.unshift(key); localStorage.setItem(SEEN, JSON.stringify(l.slice(0, 60))); } catch (e) {} };
  const pickNot = (a, bad) => { const ok = a.filter(x => !bad.includes(x[0])); return pick(ok.length ? ok : a); };

  function built(genre) {
    const g = G[genre], s = seen(), pl = pickNot(g.places, s.map(x => x.split("|")[0])), d = pickNot(g.demons, s.map(x => x.split("|")[1])), m = pick(g.minions), o = pickNot(g.openings, s.map(x => x.split("|")[2])), w = pick(TW2);
    return { key: `${pl[1]}|${d[0]}|${o[0]}`, family: g.fam, icon: pl[0], en: { title: pl[1], setting: pl[3], town: pl[5], demon: d[0], minions: m[0], opening: o[0], twist: w[0] },
      he: { title: pl[2], setting: pl[4], town: pl[6], demon: d[1], minions: m[1], opening: o[1], twist: w[1] } };
  }
  function curated(f) {
    const s = seen(), all = FAM[f], fresh = all.filter(t => !s.some(x => x.split("|")[0] === t[1]));
    const t = pick(fresh.length ? fresh : all), w = pick(TW2);
    return { key: `${t[1]}|${t[7]}|${t[11]}`, family: f, icon: t[0], en: { title: t[1], setting: t[3], town: t[5], demon: t[7], minions: t[9], opening: t[11], twist: w[0] },
      he: { title: t[2], setting: t[4], town: t[6], demon: t[8], minions: t[10], opening: t[12], twist: w[1] } };
  }
  // Make a theme. family: "history" | "movies" | "rpg" | "any". Returns both languages.
  function generate(family, avoidTitle) {
    const fams = family && FAM[family] ? [family] : Object.keys(FAM);
    let r, n = 0;
    do {
      const f = pick(fams);
      r = Math.random() < 0.4 ? curated(f) : built(pick(GEN_FAM[f]));
    } while (((avoidTitle && r.en.title === avoidTitle) || seen().slice(0, 12).some(x => x.split("|")[0] === r.en.title)) && ++n < 20);
    remember(r.key);
    r.familyLabel = { en: FAM_LABEL[r.family][0], he: FAM_LABEL[r.family][1] };
    delete r.key;
    return r;
  }
  window.BKThemes = { generate, count: curatedCount + Object.keys(G).reduce((n, k) => n + G[k].places.length, 0), combos };
})();
