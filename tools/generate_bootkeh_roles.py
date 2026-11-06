# tools/build_all_bootkeh_roles.py
# Comprehensive Blood on the Clocktower role database (Trouble Brewing, Bad Moon Rising, Sects & Violets, Crimson Guard, Experimental)
import json
from pathlib import Path

ROLES = [
    # ==================== TOWNSFOLK (תושבי העיירה) ====================
    # --- Trouble Brewing ---
    {
        "id": "washerwoman",
        "type": "townsfolk",
        "name_en": "Washerwoman",
        "name_he": "כובסת",
        "ability_en": "You start knowing that 1 of 2 players is a particular Townsfolk.",
        "ability_he": "אתה מתחיל בידיעה שאחד משני שחקנים הוא תושב עיירה מסוים.",
        "icon": "🧺",
        "editions": ["trouble_brewing"],
        "firstNight": 32, "otherNight": 0
    },
    {
        "id": "librarian",
        "type": "townsfolk",
        "name_en": "Librarian",
        "name_he": "ספרן",
        "ability_en": "You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.)",
        "ability_he": "אתה מתחיל בידיעה שאחד משני שחקנים הוא אאוטסיידר מסוים (או שאין אף אאוטסיידר במשחק).",
        "icon": "📖",
        "editions": ["crimson_guard", "trouble_brewing"],
        "firstNight": 34, "otherNight": 0
    },
    {
        "id": "investigator",
        "type": "townsfolk",
        "name_en": "Investigator",
        "name_he": "חוקר",
        "ability_en": "You start knowing that 1 of 2 players is a particular Minion.",
        "ability_he": "אתה מתחיל בידיעה שאחד משני שחקנים הוא משרת מסוים.",
        "icon": "🔍",
        "editions": ["trouble_brewing"],
        "firstNight": 35, "otherNight": 0
    },
    {
        "id": "chef",
        "type": "townsfolk",
        "name_en": "Chef",
        "name_he": "שף",
        "ability_en": "You start knowing how many pairs of evil players are sitting next to each other.",
        "ability_he": "אתה מתחיל בידיעה כמה זוגות של שחקנים רעים יושבים זה לצד זה במעגל.",
        "icon": "👨‍🍳",
        "editions": ["trouble_brewing"],
        "firstNight": 36, "otherNight": 0
    },
    {
        "id": "empath",
        "type": "townsfolk",
        "name_en": "Empath",
        "name_he": "אמפת",
        "ability_en": "Each night, you learn how many of your 2 alive neighbors are evil.",
        "ability_he": "בכל לילה, אתה מגלה כמה משני השכנים החיים שלך הם רעים (0, 1 או 2).",
        "icon": "💙",
        "editions": ["crimson_guard", "trouble_brewing"],
        "firstNight": 37, "otherNight": 53
    },
    {
        "id": "fortune_teller",
        "type": "townsfolk",
        "name_en": "Fortune Teller",
        "name_he": "מגדת עתידות",
        "ability_en": "Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you.",
        "ability_he": "בכל לילה, בחר 2 שחקנים: אתה מגלה אם לפחות אחד מהם הוא שד. שחקן טוב אחד נרשם לך תמיד כשד (הפתיון).",
        "icon": "🔮",
        "editions": ["trouble_brewing"],
        "firstNight": 38, "otherNight": 54
    },
    {
        "id": "undertaker",
        "type": "townsfolk",
        "name_en": "Undertaker",
        "name_he": "קברן",
        "ability_en": "Each night*, you learn which character died by execution today.",
        "ability_he": "בכל לילה*, אתה מגלה איזה תפקיד הוצא להורג היום בהצבעת העיירה.",
        "icon": "⚰️",
        "editions": ["crimson_guard", "trouble_brewing"],
        "firstNight": 0, "otherNight": 55
    },
    {
        "id": "monk",
        "type": "townsfolk",
        "name_en": "Monk",
        "name_he": "נזיר",
        "ability_en": "Each night*, choose a player (not yourself): they are safe from the Demon tonight.",
        "ability_he": "בכל לילה*, בחר שחקן (לא את עצמך): הוא מוגן מהשד הלילה.",
        "icon": "🕯️",
        "editions": ["crimson_guard", "trouble_brewing"],
        "firstNight": 0, "otherNight": 12
    },
    {
        "id": "ravenkeeper",
        "type": "townsfolk",
        "name_en": "Ravenkeeper",
        "name_he": "שומר העורבים",
        "ability_en": "If you die at night, you are woken to choose a player: you learn their character.",
        "ability_he": "אם אתה מת בלילה, אתה מתעורר ובוחר שחקן: אתה מגלה את תפקידו המדויק.",
        "icon": "🦅",
        "editions": ["trouble_brewing"],
        "firstNight": 0, "otherNight": 52
    },
    {
        "id": "virgin",
        "type": "townsfolk",
        "name_en": "Virgin",
        "name_he": "בתולה",
        "ability_en": "The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.",
        "ability_he": "בפעם הראשונה שאתה מועמד להוצאה להורג, אם המועמד הוא תושב עיירה, הוא מוצא להורג מיד.",
        "icon": "💍",
        "editions": ["crimson_guard", "trouble_brewing"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "slayer",
        "type": "townsfolk",
        "name_en": "Slayer",
        "name_he": "קוטל",
        "ability_en": "Once per game, during the day, publicly choose a player: if they are the Demon, they die.",
        "ability_he": "פעם אחת במשחק, במהלך היום, בחר פומבית שחקן ויורה בו: אם הוא השד, הוא מת במקום.",
        "icon": "🏹",
        "editions": ["crimson_guard", "trouble_brewing"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "soldier",
        "type": "townsfolk",
        "name_en": "Soldier",
        "name_he": "חייל",
        "ability_en": "You are safe from the Demon.",
        "ability_he": "אתה מוגן לחלוטין ממתקפת השד (השד אינו יכול להרוג אותך בלילה).",
        "icon": "🛡️",
        "editions": ["trouble_brewing"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "mayor",
        "type": "townsfolk",
        "name_en": "Mayor",
        "name_he": "ראש העיר",
        "ability_en": "If no-one dies today, execution fails. If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead.",
        "ability_he": "אם איש לא מת היום, ההוצאה להורג נכשלת. אם נותרו רק 3 שחקנים ואין הוצאה להורג, הטובים מנצחים. אם השד תוקף אותך, שחקן אחר עשוי למות במקומך.",
        "icon": "🎩",
        "editions": ["trouble_brewing"],
        "firstNight": 0, "otherNight": 0
    },

    # --- Sects & Violets ---
    {
        "id": "clockmaker",
        "type": "townsfolk",
        "name_en": "Clockmaker",
        "name_he": "יוצר השעונים",
        "ability_en": "You start knowing how many steps from the Demon to its nearest Minion.",
        "ability_he": "אתה מתחיל בידיעה כמה צעדים במעגל מפרידים בין השד למשרת הקרוב ביותר אליו.",
        "icon": "🕰️",
        "editions": ["sects_and_violets"],
        "firstNight": 40, "otherNight": 0
    },
    {
        "id": "dreamer",
        "type": "townsfolk",
        "name_en": "Dreamer",
        "name_he": "חולם",
        "ability_en": "Each night, choose a player (not yourself or Travellers): you learn 1 good and 1 evil character, 1 of which is correct.",
        "ability_he": "בכל לילה, בחר שחקן: אתה מגלה תפקיד אחד טוב ותפקיד אחד רע, שאחד מהם הוא תפקידו האמיתי.",
        "icon": "💭",
        "editions": ["sects_and_violets"],
        "firstNight": 41, "otherNight": 56
    },
    {
        "id": "snake_charmer",
        "type": "townsfolk",
        "name_en": "Snake Charmer",
        "name_he": "לוחש הנחשים",
        "ability_en": "Each night, choose an alive player: a chosen Demon swaps characters & alignments with you & is then poisoned.",
        "ability_he": "בכל לילה, בחר שחקן חי: אם בחרת בשד, אתם מחליפים תפקידים וצדדים, והשד הישן הופך ללוחש נחשים מורעל.",
        "icon": "🐍",
        "editions": ["crimson_guard", "sects_and_violets"],
        "firstNight": 20, "otherNight": 11
    },
    {
        "id": "mathematician",
        "type": "townsfolk",
        "name_en": "Mathematician",
        "name_he": "מתמטיקאי",
        "ability_en": "Each night, you learn how many players' abilities worked abnormally (since dawn) due to another character's ability.",
        "ability_he": "בכל לילה, אתה מגלה כמה שחקנים קיבלו מידע מוטעה או שהיכולת שלהם השתבשה בגלל דמות אחרת (שיכור/מורעל/וורטוקס).",
        "icon": "📐",
        "editions": ["sects_and_violets"],
        "firstNight": 51, "otherNight": 70
    },
    {
        "id": "flowergirl",
        "type": "townsfolk",
        "name_en": "Flowergirl",
        "name_he": "מוכרת הפרחים",
        "ability_en": "Each night*, you learn if a Demon voted today.",
        "ability_he": "בכל לילה*, אתה מגלה האם השד הצביע היום באחת ההצבעות.",
        "icon": "🌸",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 58
    },
    {
        "id": "town_crier",
        "type": "townsfolk",
        "name_en": "Town Crier",
        "name_he": "כרוז העיר",
        "ability_en": "Each night*, you learn if a Minion nominated today.",
        "ability_he": "בכל לילה*, אתה מגלה האם משרת היה זה שהעמיד מישהו להדחה היום.",
        "icon": "📢",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 59
    },
    {
        "id": "oracle",
        "type": "townsfolk",
        "name_en": "Oracle",
        "name_he": "אורקל",
        "ability_en": "Each night*, you learn how many dead players are evil.",
        "ability_he": "בכל לילה*, אתה מגלה כמה מבין השחקנים שכבר מתו הם רעים.",
        "icon": "👁️",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 60
    },
    {
        "id": "savant",
        "type": "townsfolk",
        "name_en": "Savant",
        "name_he": "מלומד (סוואנט)",
        "ability_en": "Each day, you may visit the Storyteller to learn 2 things in private: 1 is true & 1 is false.",
        "ability_he": "בכל יום, תוכל לגשת למספר הסיפורים ולשמוע 2 עובדות: אחת נכונה לחלוטין ואחת שקרית לחלוטין.",
        "icon": "📜",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "seamstress",
        "type": "townsfolk",
        "name_en": "Seamstress",
        "name_he": "תופרת",
        "ability_en": "Once per game, at night, choose 2 players (not yourself): you learn if they are the same alignment.",
        "ability_he": "פעם אחת במשחק, בלילה, בחר 2 שחקנים: אתה מגלה האם הם באותו הצד (שניהם טובים או שניהם רעים).",
        "icon": "🧵",
        "editions": ["sects_and_violets"],
        "firstNight": 43, "otherNight": 61
    },
    {
        "id": "philosopher",
        "type": "townsfolk",
        "name_en": "Philosopher",
        "name_he": "פילוסוף",
        "ability_en": "Once per game, at night, choose a good character: gain that ability. If this character is in play, they are drunk.",
        "ability_he": "פעם אחת במשחק, בלילה, בחר דמות טובה: אתה מקבל את יכולתה. אם הדמות הזו כבר קיימת במשחק, היא הופכת לשיכורה.",
        "icon": "🧪",
        "editions": ["crimson_guard", "sects_and_violets"],
        "firstNight": 2, "otherNight": 2
    },
    {
        "id": "artist",
        "type": "townsfolk",
        "name_en": "Artist",
        "name_he": "אמן",
        "ability_en": "Once per game, during the day, privately ask the Storyteller any yes/no question.",
        "ability_he": "פעם אחת במשחק, במהלך היום, שאל את מספר הסיפורים ביחידות כל שאלת כן/לא שתרצה.",
        "icon": "🎨",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "juggler",
        "type": "townsfolk",
        "name_en": "Juggler",
        "name_he": "להטוטן",
        "ability_en": "On your 1st day, publicly guess up to 5 players' characters. That night, you learn how many you got correct.",
        "ability_he": "ביומך הראשון, נחש פומבית עד 5 תפקידים של שחקנים. בלילה הבא תגלה כמה ניחושים היו נכונים.",
        "icon": "🤹",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 62
    },
    {
        "id": "sage",
        "type": "townsfolk",
        "name_en": "Sage",
        "name_he": "חכם",
        "ability_en": "If the Demon kills you, you learn that 1 of 2 players is that Demon.",
        "ability_he": "אם השד הורג אותך בלילה, אתה מתעורר ומגלה שאחד משני שחקנים הוא השד שהרג אותך.",
        "icon": "🧙‍♂️",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 43
    },

    # --- Bad Moon Rising ---
    {
        "id": "grandmother",
        "type": "townsfolk",
        "name_en": "Grandmother",
        "name_he": "סבתא",
        "ability_en": "You start knowing a good player & their character. If the Demon kills them, you die too.",
        "ability_he": "אתה מתחיל בידיעה מיהו הנכד שלך (שחקן טוב) ומה תפקידו. אם השד הורג אותו, אתה מת יחד איתו מרוב צער.",
        "icon": "👵",
        "editions": ["bad_moon_rising"],
        "firstNight": 39, "otherNight": 51
    },
    {
        "id": "sailor",
        "type": "townsfolk",
        "name_en": "Sailor",
        "name_he": "מלח",
        "ability_en": "Each night, choose an alive player: either you or they are drunk until dusk. You cannot die.",
        "ability_he": "בכל לילה, בחר שחקן חי: אחד מכם משתכר עד הערב. כל עוד אתה פיכח, אינך יכול למות.",
        "icon": "⚓",
        "editions": ["bad_moon_rising"],
        "firstNight": 11, "otherNight": 4
    },
    {
        "id": "chambermaid",
        "type": "townsfolk",
        "name_en": "Chambermaid",
        "name_he": "חדרנית",
        "ability_en": "Each night, choose 2 alive players: you learn how many woke tonight due to their ability.",
        "ability_he": "בכל לילה, בחר 2 שחקנים חיים: אתה מגלה כמה מהם התעוררו הלילה בגלל יכולתם.",
        "icon": "🧹",
        "editions": ["bad_moon_rising"],
        "firstNight": 50, "otherNight": 69
    },
    {
        "id": "exorcist",
        "type": "townsfolk",
        "name_en": "Exorcist",
        "name_he": "מגרש שדים",
        "ability_en": "Each night*, choose a player (different to last night): the Demon, if chosen, learns who you are & doesn't wake tonight.",
        "ability_he": "בכל לילה*, בחר שחקן: אם בחרת בשד, השד מגלה מי אתה ואינו מתעורר הלילה להרוג.",
        "icon": "✝️",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 21
    },
    {
        "id": "innkeeper",
        "type": "townsfolk",
        "name_en": "Innkeeper",
        "name_he": "פונדקאי",
        "ability_en": "Each night*, choose 2 players: they cannot die tonight, but 1 is drunk until dusk.",
        "ability_he": "בכל לילה*, בחר 2 שחקנים: שניהם מוגנים ממוות הלילה, אך אחד מהם משתכר עד הערב.",
        "icon": "🍺",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 9
    },
    {
        "id": "gambler",
        "type": "townsfolk",
        "name_en": "Gambler",
        "name_he": "מהמר",
        "ability_en": "Each night*, choose a player & guess their character: if you guess wrongly, you die.",
        "ability_he": "בכל לילה*, בחר שחקן ונחש את תפקידו: אם טעית בניחוש, אתה מת הלילה.",
        "icon": "🎲",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 10
    },
    {
        "id": "gossip",
        "type": "townsfolk",
        "name_en": "Gossip",
        "name_he": "רכלן",
        "ability_en": "Each day, you may make a public statement. Tonight, if it was true, a player dies.",
        "ability_he": "בכל יום, תוכל להצהיר הצהרה פומבית. אם ההצהרה הייתה אמת, שחקן ימות הלילה באופן מסתורי.",
        "icon": "🗣️",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 38
    },
    {
        "id": "courtier",
        "type": "townsfolk",
        "name_en": "Courtier",
        "name_he": "איש חצר",
        "ability_en": "Once per game, at night, choose a character: they are drunk for 3 nights & 3 days.",
        "ability_he": "פעם אחת במשחק, בלילה, בחר תפקיד: הדמות הזו תהיה שיכורה למשך 3 לילות ו-3 ימים רצופים.",
        "icon": "👑",
        "editions": ["bad_moon_rising"],
        "firstNight": 19, "otherNight": 8
    },
    {
        "id": "professor",
        "type": "townsfolk",
        "name_en": "Professor",
        "name_he": "פרופסור",
        "ability_en": "Once per game, at night*, choose a dead player: if they are a Townsfolk, they are resurrected.",
        "ability_he": "פעם אחת במשחק, בלילה*, בחר שחקן מת: אם הוא היה תושב עיירה, הוא קם לתחייה!",
        "icon": "🔬",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 44
    },
    {
        "id": "minstrel",
        "type": "townsfolk",
        "name_en": "Minstrel",
        "name_he": "טרובדור (זמר נודד)",
        "ability_en": "When a Minion dies by execution, all other players (except Travellers) are drunk until dusk tomorrow.",
        "ability_he": "כאשר משרת מוצא להורג בעיירה, כל השחקנים בעולם משתכרים משמחה עד מחר בערב.",
        "icon": "🎵",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "tea_lady",
        "type": "townsfolk",
        "name_en": "Tea Lady",
        "name_he": "גבירת התה",
        "ability_en": "If both your alive neighbors are good, they cannot die.",
        "ability_he": "אם שני השכנים החיים שלך הם שחקנים טובים, שניהם מוגנים לחלוטין ואינם יכולים למות.",
        "icon": "☕",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "pacifist",
        "type": "townsfolk",
        "name_en": "Pacifist",
        "name_he": "פציפיסט",
        "ability_en": "Executed good players might not die.",
        "ability_he": "שחקנים טובים שמועמדים להוצאה להורג עשויים להינצל ממוות בחסד מספר הסיפורים.",
        "icon": "🕊️",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "fool",
        "type": "townsfolk",
        "name_en": "Fool",
        "name_he": "שוטה",
        "ability_en": "The 1st time you die, you don't.",
        "ability_he": "בפעם הראשונה שאתה אמור למות (בלילה או בהוצאה להורג), אתה פשוט שורד ולא מת.",
        "icon": "🤡",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 0
    },

    # --- Experimental & Crimson Guard Townsfolk ---
    {
        "id": "alsaahir",
        "type": "townsfolk",
        "name_en": "Alsaahir",
        "name_he": "אל-סאהיר",
        "ability_en": "Each day, if you publicly guess which players are Minion(s) and which are Demon(s), good wins.",
        "ability_he": "בכל יום, אם תנחש פומבית במדויק מיהם כל המשרתים ומיהו השד, הטובים מנצחים מיד במשחק!",
        "icon": "🔮",
        "editions": ["crimson_guard", "experimental"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "alchemist",
        "type": "townsfolk",
        "name_en": "Alchemist",
        "name_he": "אלכימאי",
        "ability_en": "You have a Minion ability. When using this, the Storyteller may prompt you to choose differently.",
        "ability_he": "יש לך יכולת של אחד המשרתים במשחק (אך אתה בצד הטוב!).",
        "icon": "🧪",
        "editions": ["crimson_guard", "experimental"],
        "firstNight": 3, "otherNight": 0
    },
    {
        "id": "amnesiac",
        "type": "townsfolk",
        "name_en": "Amnesiac",
        "name_he": "אמנזייק (חסר זיכרון)",
        "ability_en": "You do not know your ability. Each day, privately guess what it is: you learn how accurate you are.",
        "ability_he": "אינך יודע מה היכולת שלך. בכל יום, נחש מה היכולת הסודית שלך ותקבל רמז ממספר הסיפורים.",
        "icon": "❓",
        "editions": ["experimental"],
        "firstNight": 12, "otherNight": 5
    },
    {
        "id": "balloonist",
        "type": "townsfolk",
        "name_en": "Balloonist",
        "name_he": "טייס כדור פורח",
        "ability_en": "Each night, you learn 1 player of each character type, until you have learned all 4. [+1 Outsider]",
        "ability_he": "בכל לילה אתה לומד שחקן מסוג דמות אחר (תושב, אאוטסיידר, משרת, שד) עד שתלמד את כל ה-4. [+אאוטסיידר אחד למשחק]",
        "icon": "🎈",
        "editions": ["experimental"],
        "firstNight": 44, "otherNight": 63
    },
    {
        "id": "bounty_hunter",
        "type": "townsfolk",
        "name_en": "Bounty Hunter",
        "name_he": "צייד ראשים",
        "ability_en": "You start knowing 1 evil player. If the player you know dies, you learn another. [1 Townsfolk is evil]",
        "ability_he": "אתה מתחיל בידיעה מיהו שחקן רע אחד. כשהוא מת, אתה לומד שחקן רע נוסף. [תושב עיירה אחד הופך לרע]",
        "icon": "🎯",
        "editions": ["experimental"],
        "firstNight": 47, "otherNight": 66
    },
    {
        "id": "cult_leader",
        "type": "townsfolk",
        "name_en": "Cult Leader",
        "name_he": "מנהיג כת",
        "ability_en": "Each night, you become the alignment of an alive neighbor. If all living players belong to your cult, your alignment wins.",
        "ability_he": "בכל לילה אתה מקבל את הצד (טוב/רע) של אחד משכניך החיים. אם כל השחקנים החיים הצטרפו לכת שלך, אתה מנצח מיד!",
        "icon": "📿",
        "editions": ["experimental"],
        "firstNight": 48, "otherNight": 67
    },
    {
        "id": "knight",
        "type": "townsfolk",
        "name_en": "Knight",
        "name_he": "אביר",
        "ability_en": "You start knowing 2 players that are not the Demon.",
        "ability_he": "אתה מתחיל בידיעה על 2 שחקנים שאף אחד מהם אינו השד.",
        "icon": "⚔️",
        "editions": ["experimental"],
        "firstNight": 42, "otherNight": 0
    },
    {
        "id": "pixie",
        "type": "townsfolk",
        "name_en": "Pixie",
        "name_he": "פיקסי (פיה שובבה)",
        "ability_en": "You start knowing 1 in-play Townsfolk. If you were mad that you were that character when they die, you gain that ability.",
        "ability_he": "אתה מתחיל בידיעה על תושב עיירה במשחק. אם העמדת פנים שאתה אותה דמות כשהיא מתה, אתה זוכה ביכולת שלה!",
        "icon": "🧚",
        "editions": ["experimental"],
        "firstNight": 30, "otherNight": 0
    },

    # ==================== OUTSIDERS (אאוטסיידרים) ====================
    {
        "id": "butler",
        "type": "outsider",
        "name_en": "Butler",
        "name_he": "משרת אישי",
        "ability_en": "Each night, choose a master. You may only vote if they are voting too.",
        "ability_he": "בכל לילה, בחר לך אדון. מותר לך להצביע בהוצאה להורג אך ורק אם האדון שלך מצביע גם כן.",
        "icon": "🛎️",
        "editions": ["trouble_brewing"],
        "firstNight": 39, "otherNight": 68
    },
    {
        "id": "drunk",
        "type": "outsider",
        "name_en": "Drunk",
        "name_he": "שיכור",
        "ability_en": "You do not know you are the Drunk. You think you are a Townsfolk character, but your ability doesn't work.",
        "ability_he": "אינך יודע שאתה השיכור! אתה משוכנע שאתה תושב עיירה רגיל, אך כל המידע והיכולות שלך משובשים לחלוטין.",
        "icon": "🍺",
        "editions": ["trouble_brewing"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "recluse",
        "type": "outsider",
        "name_en": "Recluse",
        "name_he": "מתבודד",
        "ability_en": "You might register as evil & as a Minion or Demon, even if dead.",
        "ability_he": "בבדיקות מידע אתה עלול להירשם בטעות כרע, כמשרת או אפילו כשד, גם אם אתה מת.",
        "icon": "🏮",
        "editions": ["crimson_guard", "trouble_brewing"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "saint",
        "type": "outsider",
        "name_en": "Saint",
        "name_he": "קדוש",
        "ability_en": "If you die by execution, your team loses.",
        "ability_he": "אם העיירה תוציא אותך להורג בהצבעה, קבוצת הטובים מפסידה מיד במשחק!",
        "icon": "😇",
        "editions": ["trouble_brewing"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "mutant",
        "type": "outsider",
        "name_en": "Mutant",
        "name_he": "מוטנט",
        "ability_en": "If you are 'mad' about being an Outsider, you might be executed.",
        "ability_he": "אם תודה או תרמוז בפומבי שאתה אאוטסיידר, מספר הסיפורים עלול להוציא אותך להורג במקום.",
        "icon": "🧬",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "sweetheart",
        "type": "outsider",
        "name_en": "Sweetheart",
        "name_he": "יקיר העיירה",
        "ability_en": "When you die, 1 player is drunk from now on.",
        "ability_he": "כשאתה מת, שחקן אחד בעיירה הופך לשיכור ומקבל מידע מוטעה למשך שארית המשחק.",
        "icon": "💔",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 42
    },
    {
        "id": "barber",
        "type": "outsider",
        "name_en": "Barber",
        "name_he": "ספר",
        "ability_en": "If you died today or tonight, the Demon may choose 2 players (not themselves) to swap characters.",
        "ability_he": "אם מתת היום או הלילה, השד יכול לבחור 2 שחקנים ולהחליף ביניהם את התפקידים.",
        "icon": "💈",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 41
    },
    {
        "id": "klutz",
        "type": "outsider",
        "name_en": "Klutz",
        "name_he": "שלומיאל",
        "ability_en": "When you learn that you died, publicly choose 1 alive player: if they are evil, your team loses.",
        "ability_he": "ברגע שאתה מגלה שמתת, בחר פומבית שחקן חי אחד: אם הוא שחקן רע, קבוצת הטובים מפסידה מיד!",
        "icon": "🍌",
        "editions": ["crimson_guard", "sects_and_violets"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "goon",
        "type": "outsider",
        "name_en": "Goon",
        "name_he": "בריון",
        "ability_en": "Each night, the 1st player to choose you with their ability is drunk until dusk. You become their alignment.",
        "ability_he": "בכל לילה, השחקן הראשון שבוחר בך משתכר, ואתה הופך לצד שלו (טוב או רע).",
        "icon": "🥊",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "lunatic",
        "type": "outsider",
        "name_en": "Lunatic",
        "name_he": "חולה ירח (מטורף)",
        "ability_en": "You think you are a Demon, but you are not. The Demon knows who you are & who you choose at night.",
        "ability_he": "אתה משוכנע לחלוטין שאתה השד! אך אתה לא. השד האמיתי יודע מי אתה ורואה במי אתה בוחר לתקוף.",
        "icon": "🌙",
        "editions": ["bad_moon_rising"],
        "firstNight": 8, "otherNight": 20
    },
    {
        "id": "tinker",
        "type": "outsider",
        "name_en": "Tinker",
        "name_he": "נפח נודד",
        "ability_en": "You might die at any time.",
        "ability_he": "מספר הסיפורים יכול להחליט שאתה מת פתאום בכל רגע נתון במשחק.",
        "icon": "🔨",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 49
    },
    {
        "id": "moonchild",
        "type": "outsider",
        "name_en": "Moonchild",
        "name_he": "ילד הירח",
        "ability_en": "When you learn that you died, publicly choose 1 alive player. Tonight, if it was a good player, they die.",
        "ability_he": "כשאתה מת, בחר פומבית שחקן חי אחד. אם בחרת בשחקן טוב, הוא ימות הלילה בקללה.",
        "icon": "🌒",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 50
    },
    {
        "id": "damsel",
        "type": "outsider",
        "name_en": "Damsel",
        "name_he": "עלמה במצוקה",
        "ability_en": "All Minions know a Damsel is in play. If a Minion publicly guesses you (once), your team loses.",
        "ability_he": "כל המשרתים יודעים שעלמה במצוקה נמצאת במשחק. אם משרת מנחש פומבית מי את, הטובים מפסידים מיד!",
        "icon": "👠",
        "editions": ["crimson_guard", "experimental"],
        "firstNight": 31, "otherNight": 0
    },
    {
        "id": "heretic",
        "type": "outsider",
        "name_en": "Heretic",
        "name_he": "כופר",
        "ability_en": "Whoever wins, loses & whoever loses, wins, even if you are dead.",
        "ability_he": "כל תנאי הניצחון וההפסד מתהפכים לחלוטין! מי שאמור לנצח מפסיד, ומי שאמור להפסיד מנצח (גם אם אתה מת).",
        "icon": "⚜️",
        "editions": ["crimson_guard", "experimental"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "snitch",
        "type": "outsider",
        "name_en": "Snitch",
        "name_he": "מלשין",
        "ability_en": "Each Minion starts knowing 3 not-in-play characters.",
        "ability_he": "בגללך, כל משרת מתחיל את המשחק בידיעה של 3 תפקידים שאינם במשחק (בלאפים).",
        "icon": "🐀",
        "editions": ["experimental"],
        "firstNight": 7, "otherNight": 0
    },
    {
        "id": "acrobat",
        "type": "outsider",
        "name_en": "Acrobat",
        "name_he": "אקרובט",
        "ability_en": "Each night*, if either of your alive neighbors became drunk or poisoned tonight, you die.",
        "ability_he": "בכל לילה*, אם אחד משכניך החיים הפך לשיכור או מורעל הלילה, אתה נופל ומת.",
        "icon": "🤸",
        "editions": ["experimental"],
        "firstNight": 0, "otherNight": 39
    },

    # ==================== MINIONS (משרתים) ====================
    {
        "id": "poisoner",
        "type": "minion",
        "name_en": "Poisoner",
        "name_he": "מרעיל",
        "ability_en": "Each night, choose a player: they are poisoned tonight and tomorrow day.",
        "ability_he": "בכל לילה, בחר שחקן: הוא מורעל הלילה ובמהלך יום המחרת (היכולת שלו לא פועלת והמידע שלו שקרי).",
        "icon": "🧪",
        "editions": ["trouble_brewing"],
        "firstNight": 17, "otherNight": 7
    },
    {
        "id": "spy",
        "type": "minion",
        "name_en": "Spy",
        "name_he": "מרגל",
        "ability_en": "Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.",
        "ability_he": "בכל לילה אתה רואה את כל ספר הגרימואר (כל התפקידים של כולם!). בבדיקות מידע אתה עלול להירשם כטוב.",
        "icon": "🕵️",
        "editions": ["trouble_brewing"],
        "firstNight": 49, "otherNight": 68
    },
    {
        "id": "scarlet_woman",
        "type": "minion",
        "name_en": "Scarlet Woman",
        "name_he": "האישה בארגמן",
        "ability_en": "If there are 5 or more players alive & the Demon dies, you become the Demon. (Travellers don't count)",
        "ability_he": "אם יש 5 שחקנים חיים או יותר והשד מת, את הופכת מיד לשד החדש במקומו!",
        "icon": "💃",
        "editions": ["trouble_brewing"],
        "firstNight": 0, "otherNight": 19
    },
    {
        "id": "baron",
        "type": "minion",
        "name_en": "Baron",
        "name_he": "הברון",
        "ability_en": "There are extra Outsiders in play. [+2 Outsiders]",
        "ability_he": "הנוכחות שלך מכניסה כאוס לעיירה: נוספים 2 אאוטסיידרים למשחק במקום תושבי עיירה.",
        "icon": "🍷",
        "editions": ["trouble_brewing"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "witch",
        "type": "minion",
        "name_en": "Witch",
        "name_he": "מכשפה",
        "ability_en": "Each night, choose a player: if they nominate tomorrow, they die immediately. If just 3 players live, you lose this ability.",
        "ability_he": "בכל לילה, בחרי שחקן לקלל: אם הוא יעמיד מישהו להדחה מחר, הוא ימות מיד במקום.",
        "icon": "🧙‍♀️",
        "editions": ["sects_and_violets"],
        "firstNight": 24, "otherNight": 14
    },
    {
        "id": "cerenovus",
        "type": "minion",
        "name_en": "Cerenovus",
        "name_he": "סרנובוס (מעוות המחשבות)",
        "ability_en": "Each night, choose a player & a good character: they are 'mad' they are this character tomorrow, or might be executed.",
        "ability_he": "בכל לילה, בחר שחקן ותפקיד טוב: מחר עליו להעמיד פנים שהוא אותה דמות בשיגעון, אחרת יוצא להורג.",
        "icon": "🧠",
        "editions": ["sects_and_violets"],
        "firstNight": 25, "otherNight": 15
    },
    {
        "id": "pit_hag",
        "type": "minion",
        "name_en": "Pit-Hag",
        "name_he": "מכשפת הבור",
        "ability_en": "Each night*, choose a player & a character they become (if not-in-play). If a Demon is made, deaths tonight are arbitrary.",
        "ability_he": "בכל לילה*, בחרי שחקן ותפקיד: הוא הופך לתפקיד שבחרת. אם יצרת שד חדש, מקרי המוות הלילה אקראיים.",
        "icon": "🏺",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 16
    },
    {
        "id": "evil_twin",
        "type": "minion",
        "name_en": "Evil Twin",
        "name_he": "התאום הרע",
        "ability_en": "You & an opposing player know each other. If the good twin is executed, evil wins. Good cannot win while both live.",
        "ability_he": "אתה ותאום טוב מודעים זה לזה. אם התאום הטוב מוצא להורג, הרעים מנצחים! הטובים לא יכולים לנצח כל עוד שניכם חיים.",
        "icon": "👥",
        "editions": ["sects_and_violets"],
        "firstNight": 23, "otherNight": 0
    },
    {
        "id": "godfather",
        "type": "minion",
        "name_en": "Godfather",
        "name_he": "הסנדק",
        "ability_en": "You start knowing which Outsiders are in play. If an Outsider died today, choose a player tonight: they die. [-1 or +1 Outsider]",
        "ability_he": "אתה מתחיל בידיעה מיהם האאוטסיידרים. אם אאוטסיידר מת היום, בחר שחקן הלילה: הוא מת.",
        "icon": "🌹",
        "editions": ["bad_moon_rising"],
        "firstNight": 21, "otherNight": 37
    },
    {
        "id": "devils_advocate",
        "type": "minion",
        "name_en": "Devil's Advocate",
        "name_he": "פרקליט השטן",
        "ability_en": "Each night, choose a living player (different to last night): if executed tomorrow, they don't die.",
        "ability_he": "בכל לילה, בחר שחקן חי (שונה מהלילה הקודם): אם הוא יוצא להורג מחר, הוא שורד ולא מת.",
        "icon": "⚖️",
        "editions": ["crimson_guard", "bad_moon_rising"],
        "firstNight": 22, "otherNight": 13
    },
    {
        "id": "assassin",
        "type": "minion",
        "name_en": "Assassin",
        "name_he": "מתנקש",
        "ability_en": "Once per game, at night*, choose a player: they die, even if for some reason they could not.",
        "ability_he": "פעם אחת במשחק, בלילה*, בחר שחקן: הוא מת בוודאות, אפילו אם יש לו הגנה מוחלטת ממוות.",
        "icon": "🗡️",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 36
    },
    {
        "id": "mastermind",
        "type": "minion",
        "name_en": "Mastermind",
        "name_he": "המוח (מאסטרמיינד)",
        "ability_en": "If the Demon dies by execution (ending the game), play for 1 more day. If a player is executed then, their team loses.",
        "ability_he": "אם השד מת בהוצאה להורג, המשחק נמשך ליום אחד נוסף בהפתעה! אם שחקן טוב מוצא להורג ביום זה, הרעים מנצחים.",
        "icon": "♟️",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "psychopath",
        "type": "minion",
        "name_en": "Psychopath",
        "name_he": "פסיכופת",
        "ability_en": "Each day, before nominations, you may publicly choose a player: they die. If executed, you only die if you lose roshambo.",
        "ability_he": "בכל יום לפני ההדחות, בחר שחקן בפומבי: הוא מת במקום! אם מוציאים אותך להורג, תמות רק אם תפסיד באבן-נייר-ומספריים.",
        "icon": "🪓",
        "editions": ["crimson_guard", "experimental"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "goblin",
        "type": "minion",
        "name_en": "Goblin",
        "name_he": "גובלין",
        "ability_en": "If you publicly claim to be the Goblin when nominated & are executed that day, your team wins.",
        "ability_he": "אם אתה מצהיר פומבית 'אני הגובלין!' כשמעמידים אותך להדחה והעיירה בכל זאת מוציאה אותך להורג, הרעים מנצחים מיד!",
        "icon": "👺",
        "editions": ["crimson_guard", "experimental"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "boomdandy",
        "type": "minion",
        "name_en": "Boomdandy",
        "name_he": "בומדנדי (הפצצה המהלכת)",
        "ability_en": "If you are executed, all but 3 players die. After a 10 to 1 countdown, the player with the most players pointing at them, dies.",
        "ability_he": "אם אתה מוצא להורג, פצצה מתפוצצת וכולם מתים חוץ מ-3 שחקנים! בספירה לאחור של 10 שניות מי שמצביעים עליו מת מיד.",
        "icon": "💣",
        "editions": ["crimson_guard", "experimental"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "marionette",
        "type": "minion",
        "name_en": "Marionette",
        "name_he": "מריונטה (בובת חוטים)",
        "ability_en": "You think you are a good character, but you are not. The Demon knows who you are. You neighbor the Demon. [1 extra Outsider]",
        "ability_he": "אתה משוכנע שאתה שחקן טוב, אך אתה משרת סודי של השד! השד יודע מי אתה, ואתה יושב צמוד לשד במעגל.",
        "icon": "🎭",
        "editions": ["experimental"],
        "firstNight": 10, "otherNight": 0
    },
    {
        "id": "widow",
        "type": "minion",
        "name_en": "Widow",
        "name_he": "אלמנה שחורה",
        "ability_en": "On night 1, look at the Grimoire and choose a player: they are poisoned. A good player knows a Widow is in play.",
        "ability_he": "בלילה הראשון את צופה בכל ספר הגרימואר ומרעילה שחקן אחד. שחקן טוב אחד לומד שהאלמנה במשחק.",
        "icon": "🕷️",
        "editions": ["experimental"],
        "firstNight": 18, "otherNight": 0
    },
    {
        "id": "harpy",
        "type": "minion",
        "name_en": "Harpy",
        "name_he": "הרפיה",
        "ability_en": "Each night, choose 2 players: tomorrow, the 1st player is mad that the 2nd is evil, or 1 or both might die.",
        "ability_he": "בכל לילה, בחרי 2 שחקנים: מחר על השחקן הראשון להעמיד פנים בטירוף שהשני הוא רע, אחרת שניהם עלולים למות.",
        "icon": "🦅",
        "editions": ["experimental"],
        "firstNight": 26, "otherNight": 17
    },

    # ==================== DEMONS (שדים) ====================
    {
        "id": "imp",
        "type": "demon",
        "name_en": "Imp",
        "name_he": "אימפ (שדון)",
        "ability_en": "Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.",
        "ability_he": "בכל לילה*, בחר שחקן: הוא מת. אם הרגת את עצמך בכוונת תחילה, אחד המשרתים שלך הופך לאימפ החדש במקומך!",
        "icon": "😈",
        "editions": ["trouble_brewing"],
        "firstNight": 0, "otherNight": 24
    },
    {
        "id": "fang_gu",
        "type": "demon",
        "name_en": "Fang Gu",
        "name_he": "פאנג גו",
        "ability_en": "Each night*, choose a player: they die. The 1st Outsider this kills becomes an evil Fang Gu & you die instead. [+1 Outsider]",
        "ability_he": "בכל לילה*, בחר שחקן: הוא מת. האאוטסיידר הראשון שתהרוג יהפוך לפאנג גו רע חדש במקומך ואתה תמות במקומו. [+אאוטסיידר למשחק]",
        "icon": "🐺",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 29
    },
    {
        "id": "vigormortis",
        "type": "demon",
        "name_en": "Vigormortis",
        "name_he": "ויגורמורטיס",
        "ability_en": "Each night*, choose a player: they die. Minions you kill keep their ability & poison 1 Townsfolk neighbor. [-1 Outsider]",
        "ability_he": "בכל לילה*, בחר שחקן: הוא מת. משרתים שאתה הורג שומרים על יכולתם מהקבר ומרעילים תושב שכן. [-אאוטסיידר אחד]",
        "icon": "☠️",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 32
    },
    {
        "id": "no_dashii",
        "type": "demon",
        "name_en": "No Dashii",
        "name_he": "נו דאשי",
        "ability_en": "Each night*, choose a player: they die. Your 2 Townsfolk neighbors are poisoned.",
        "ability_he": "בכל לילה*, בחר שחקן: הוא מת. שני תושבי העיירה הקרובים אליך ביותר במעגל מורעלים לצמיתות.",
        "icon": "🐙",
        "editions": ["sects_and_violets"],
        "firstNight": 0, "otherNight": 30
    },
    {
        "id": "vortox",
        "type": "demon",
        "name_en": "Vortox",
        "name_he": "וורטוקס",
        "ability_en": "Each night*, choose a player: they die. Townsfolk abilities yield false info. Each day, if no-one is executed, evil wins.",
        "ability_he": "בכל לילה*, בחר שחקן: הוא מת. כל יכולות תושבי העיירה מניבות מידע שקרי! בכל יום שבו איש אינו מוצא להורג, הרעים מנצחים מיד.",
        "icon": "🌪️",
        "editions": ["crimson_guard", "sects_and_violets"],
        "firstNight": 0, "otherNight": 31
    },
    {
        "id": "pukka",
        "type": "demon",
        "name_en": "Pukka",
        "name_he": "פוקה",
        "ability_en": "Each night, choose a player: they are poisoned. The previously poisoned player dies then becomes healthy.",
        "ability_he": "בכל לילה, בחר שחקן: הוא מורעל. השחקן שהורעל בלילה הקודם מת הלילה מארס ומתנקה מרעל.",
        "icon": "🐍",
        "editions": ["crimson_guard", "bad_moon_rising"],
        "firstNight": 28, "otherNight": 26
    },
    {
        "id": "zombuul",
        "type": "demon",
        "name_en": "Zombuul",
        "name_he": "זומבול",
        "ability_en": "Each night*, if no-one died today, choose a player: they die. The 1st time you die, you live but register as dead.",
        "ability_he": "בכל לילה*, אם איש לא מת היום, בחר שחקן: הוא מת. בפעם הראשונה שמוציאים אותך להורג, אתה נשאר חי אך נחשב מת לעיני כולם.",
        "icon": "🧟",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 25
    },
    {
        "id": "shabaloth",
        "type": "demon",
        "name_en": "Shabaloth",
        "name_he": "שבאלוט (הבולע)",
        "ability_en": "Each night*, choose 2 players: they die. A dead player you chose last night might be regurgitated and brought back to life.",
        "ability_he": "בכל לילה*, בחר 2 שחקנים: שניהם מתים. שחקן שבלעת בלילה הקודם עשוי להיפלט חזרה בחיים.",
        "icon": "🕳️",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 27
    },
    {
        "id": "po",
        "type": "demon",
        "name_en": "Po",
        "name_he": "פו (השד הזועם)",
        "ability_en": "Each night*, you may choose a player: they die. If your last choice was no-one, choose 3 players tonight.",
        "ability_he": "בכל לילה*, בחר שחקן: הוא מת. אם בחרת שלא להרוג איש בלילה הקודם (טעינת זעם), הלילה תוכל לבחור 3 שחקנים שכולם ימותו!",
        "icon": "💥",
        "editions": ["bad_moon_rising"],
        "firstNight": 0, "otherNight": 28
    },
    {
        "id": "ojo",
        "type": "demon",
        "name_en": "Ojo",
        "name_he": "אוז'ו (העין הרואה)",
        "ability_en": "Each night*, choose a character: they die. If they are not in play, the Storyteller chooses who dies.",
        "ability_he": "בכל לילה*, בחר תפקיד: השחקן בעל התפקיד הזה מת. אם התפקיד אינו במשחק, מספר הסיפורים בוחר מי ימות.",
        "icon": "👁️‍🗨️",
        "editions": ["experimental"],
        "firstNight": 0, "otherNight": 33
    },
    {
        "id": "kazali",
        "type": "demon",
        "name_en": "Kazali",
        "name_he": "קזאלי",
        "ability_en": "Each night*, choose a player: they die. [You choose which players are which Minions. -? to +? Outsiders]",
        "ability_he": "בכל לילה*, בחר שחקן: הוא מת. [אתה בעצמך בוחר בלילה הראשון איזה שחקנים יהיו המשרתים שלך!]",
        "icon": "🎎",
        "editions": ["experimental"],
        "firstNight": 1, "otherNight": 34
    },
    {
        "id": "legion",
        "type": "demon",
        "name_en": "Legion",
        "name_he": "לגיון (רבים אנחנו)",
        "ability_en": "Each night*, a player might die. Executions fail if only evil voted. Most players are Legion. [Most players are Legion]",
        "ability_he": "בכל לילה*, שחקן עשוי למות. הוצאות להורג נכשלות אם רק רעים הצביעו. רוב שחקני המשחק הם חלק מהשד לגיון!",
        "icon": "👥",
        "editions": ["experimental"],
        "firstNight": 0, "otherNight": 23
    },
    {
        "id": "al_hadikhia",
        "type": "demon",
        "name_en": "Al-Hadikhia",
        "name_he": "אל-חדיקיה",
        "ability_en": "Each night*, choose 3 players (all players learn who). Each must say in secret if they live or die: if all say live, all die.",
        "ability_he": "בכל לילה*, בחר 3 שחקנים (כולם יודעים מי נבחר). כל אחד בוחר בסתר לחיות או למות: אם כולם בחרו לחיות, כולם מתים!",
        "icon": "🩸",
        "editions": ["experimental"],
        "firstNight": 0, "otherNight": 35
    },
    {
        "id": "riot",
        "type": "demon",
        "name_en": "Riot",
        "name_he": "מהומה (ראיוט)",
        "ability_en": "Nominees die, but may nominate again immediately. On day 3, all Minions become Riot & evil wins if good does not execute today.",
        "ability_he": "כל מי שמועמד מת מיד, אך יכול להעמיד מישהו אחר ברגע מותו. ביום השלישי כל המשרתים הופכים לשדי מהומה!",
        "icon": "🔥",
        "editions": ["experimental"],
        "firstNight": 0, "otherNight": 0
    },
    {
        "id": "leviathan",
        "type": "demon",
        "name_en": "Leviathan",
        "name_he": "לווייתן",
        "ability_en": "If more than 1 good player is executed, evil wins. All players know you are in play. After day 5, evil wins.",
        "ability_he": "אם יותר משחקן טוב אחד מוצא להורג, הרעים מנצחים מיד! כולם יודעים שאתה במשחק. אם עברו 5 ימים, הרעים מנצחים.",
        "icon": "🐋",
        "editions": ["experimental"],
        "firstNight": 0, "otherNight": 0
    }
]

# Standard Game Scripts
SCRIPTS = {
    "crimson_guard": {
        "id": "crimson_guard",
        "name_en": "Return of the Crimson Guard",
        "name_he": "שובו של משמר הארגמן",
        "author": "Sit",
        "roles": [
            "librarian", "empath", "snake_charmer", "undertaker", "monk",
            "alsaahir", "philosopher", "slayer", "alchemist", "virgin",
            "recluse", "klutz", "damsel", "heretic",
            "devils_advocate", "psychopath", "goblin", "boomdandy",
            "pukka", "vortox"
        ]
    },
    "trouble_brewing": {
        "id": "trouble_brewing",
        "name_en": "Trouble Brewing",
        "name_he": "הצרות מתבשלות",
        "author": "The Pandemonium Institute",
        "roles": [
            "washerwoman", "librarian", "investigator", "chef", "empath", "fortune_teller",
            "undertaker", "monk", "ravenkeeper", "virgin", "slayer", "soldier", "mayor",
            "butler", "drunk", "recluse", "saint",
            "poisoner", "spy", "scarlet_woman", "baron",
            "imp"
        ]
    },
    "bad_moon_rising": {
        "id": "bad_moon_rising",
        "name_en": "Bad Moon Rising",
        "name_he": "ירח רע עולה",
        "author": "The Pandemonium Institute",
        "roles": [
            "grandmother", "sailor", "chambermaid", "exorcist", "innkeeper", "gambler",
            "gossip", "courtier", "professor", "minstrel", "tea_lady", "pacifist", "fool",
            "goon", "lunatic", "tinker", "moonchild",
            "godfather", "devils_advocate", "assassin", "mastermind",
            "zombuul", "pukka", "shabaloth", "po"
        ]
    },
    "sects_and_violets": {
        "id": "sects_and_violets",
        "name_en": "Sects & Violets",
        "name_he": "כתות וסיגליות",
        "author": "The Pandemonium Institute",
        "roles": [
            "clockmaker", "dreamer", "snake_charmer", "mathematician", "flowergirl",
            "town_crier", "oracle", "savant", "seamstress", "philosopher", "artist", "juggler", "sage",
            "mutant", "sweetheart", "barber", "klutz",
            "witch", "cerenovus", "pit_hag", "evil_twin",
            "fang_gu", "vigormortis", "no_dashii", "vortox"
        ]
    }
}

# Thematic Flavors
THEMES = [
    {
        "id": "victorian_1800",
        "title_en": "Victorian London 1800",
        "title_he": "לונדון הוויקטוריאנית 1800",
        "desc_en": "Foggy cobblestone alleys, Big Ben striking midnight, gas lanterns flickering as Jack's shadow creeps along Whitechapel.",
        "desc_he": "סמטאות אבן ערפיליות, פעמוני מגדל השעון ביג בן מכים חצות, פנסי גז מהבהבים וצלליות מסתוריות שרוצחות בסתר.",
        "icon": "🇬🇧"
    },
    {
        "id": "alien_riyadh",
        "title_en": "Alien Invasion: Riyadh Dunes",
        "title_he": "מתקפת חייזרים: דיונות ריאד",
        "desc_en": "Futuristic flying saucers over neon skyscrapers and desert sands; body-snatching extraterrestrials hiding among citizens.",
        "desc_he": "צלחות מעופפות מעל גורדי השחקים של ערב הסעודית והמדבר; חייזרים שמשתלטים על מוחות האזרחים ומחופשים לחברים.",
        "icon": "🛸"
    },
    {
        "id": "mongols_kyoto",
        "title_en": "Mongol Conquest of Kyoto",
        "title_he": "המונגולים משתלטים על קיוטו",
        "desc_en": "Samurai strongholds besieged by Mongol infiltrators and dark shamans, honor colliding with shadowy betrayals.",
        "desc_he": "מבצר סמוראים נצור במלחמת צללים, לוחמים מונגולים שחדרו למנזר, שאמאנים אפלים ובגידות ליליות בין לורדים.",
        "icon": "🏹"
    },
    {
        "id": "salem_witch_1692",
        "title_en": "Salem Witch Trials 1692",
        "title_he": "ציד המכשפות בסיילם 1692",
        "desc_en": "Cold wooden chapels, hysterical accusations in the square, and genuine demonic covens hiding in plain sight.",
        "desc_he": "בקתות עץ קפואות במסצ'וסטס, האשמות הדדיות בכיכר הכפר, ופולחן שדים אפל שמסתתר מתחת לעיני הכמרים.",
        "icon": "🧙"
    },
    {
        "id": "space_station_2150",
        "title_en": "Derelict Space Station 2150",
        "title_he": "תחנת חלל נטושה 2150",
        "desc_en": "Oxygen levels depleting, flickering red emergency lights, and a rogue biomechanical parasite mimicking the crew.",
        "desc_he": "רמות חמצן צונחות, אורות חירום אדומים מהבהבים, וטפיל ביו-מכני קטלני שמחסל את אנשי הצוות ומחליף את זהותם.",
        "icon": "🚀"
    },
    {
        "id": "caribbean_pirates_1690",
        "title_en": "Cursed Caribbean Port 1690",
        "title_he": "נמל שודדי הים המקולל 1690",
        "desc_en": "Rum taverns, stormy seas, and ghost pirates rising from Davy Jones' locker with a captain pledged to the abyss.",
        "desc_he": "מסבאות רום סוערות בפורט רויאל, שלדי פיראטים שעולים ממעמקי האוקיינוס וקברניט שהשביע את נשמתו למצולות.",
        "icon": "🏴‍☠️"
    },
    {
        "id": "chicago_gangsters_1929",
        "title_en": "Chicago Speakeasy 1929",
        "title_he": "שיקגו המחתרתית 1929",
        "desc_en": "Jazz clubs behind secret doors, tommy guns in violin cases, and rival mobsters secretly allied with an occult demon.",
        "desc_he": "מועדוני ג'אז מחתרתיים בתקופת היובש, מקלעי טומי בקייסים של כינור, ומאפיונרים שסוגדים לשד של העולם התחתון.",
        "icon": "🎷"
    },
    {
        "id": "ancient_egypt_bc",
        "title_en": "Pharaoh's Tomb: Thebes 1350 BC",
        "title_he": "תבאי: קללת הפרעונים 1350 לפנה״ס",
        "desc_en": "Golden sarcophagi, burning myrrh, and priests of Anubis summoning a bloodthirsty entity to usurp the throne.",
        "desc_he": "מקדשי ענק על שפת הנילוס, לפידי מור בוערים, וכוהנים בוגדים שמנסים להעיר את שד הכאוס אפופיס כדי להפיל את הפרעה.",
        "icon": "🏺"
    },
    {
        "id": "ravenswood_bluff",
        "title_en": "Ravenswood Bluff (Classic)",
        "title_he": "מצוק רייבנסווד (הקלאסי)",
        "desc_en": "The iconic gothic hamlet where the town Storyteller was found impaled on the hands of the clocktower at midnight.",
        "desc_he": "הכפר הגותי האייקוני שבו מספר הסיפורים של העיירה נמצא משופד על מחוגי מגדל השעון בחצות הלילה.",
        "icon": "🏰"
    }
]

# Random Procedural Theme Components for Infinite Themes!
THEME_GENERATOR_DATA = {
    "eras": [
        {"he": "אנגליה הוויקטוריאנית 1888", "en": "Victorian England 1888", "icon": "🎩"},
        {"he": "פריז בתקופת המהפכה 1789", "en": "Revolutionary Paris 1789", "icon": "🥖"},
        {"he": "עיירת כורים מושלגת בקלונדייק 1898", "en": "Klondike Gold Rush 1898", "icon": "⛏️"},
        {"he": "פומפיי ערב התפרצות הוזוב 79 לספירה", "en": "Pompeii Eve of Eruption 79 AD", "icon": "🌋"},
        {"he": "תחנת מחקר מבודדת באנטארקטיקה", "en": "Isolated Antarctic Research Outpost", "icon": "❄️"},
        {"he": "ארמון הסולטן המפואר באיסטנבול 1550", "en": "Sultan's Palace: Istanbul 1550", "icon": "🕌"},
        {"he": "טוקיו העתידנית 2099", "en": "Cyberpunk Neo-Tokyo 2099", "icon": "⚡"},
        {"he": "אי המצורעים ביוון 1930", "en": "Crete Leper Colony 1930", "icon": "🏝️"},
        {"he": "ספינת מהגרים טרופה באמצע האוקיינוס 1912", "en": "Shipwrecked Ocean Liner 1912", "icon": "🚢"},
        {"he": "מנזר בטיבט המושלגת", "en": "Himalayan Tibetan Monastery", "icon": "🏔️"},
        {"he": "איטליה בתקופת הרנסנס: פירנצה 1504", "en": "Renaissance Florence 1504", "icon": "🎨"},
        {"he": "שבטי ויקינגים בפיורדים של נורווגיה 980", "en": "Viking Fjords of Norway 980", "icon": "⚔️"}
    ],
    "demon_threats": [
        {"he": "רוצח בצללים שקורע את קורבנותיו ללא עקבות", "en": "a shadowy killer tearing victims apart without a trace"},
        {"he": "שד עתיק שמשתלט על תודעת השכנים בזה אחר זה", "en": "an ancient fiend consuming neighbors' minds one by one"},
        {"he": "יצור מעוות שמשנה את צורתו ונראה כאחד מאנשי הכפר", "en": "a shapeshifting creature mimicking beloved townsfolk"},
        {"he": "כת סודית שמבצעת קורבנות אדם בלילות ירח מלא", "en": "a secret occult coven performing blood sacrifices under the full moon"},
        {"he": "רוח נקמה שמחפשת להשמיד את צאצאי המשפחות המייסדות", "en": "a vengeful specter seeking to eradicate the founding bloodlines"},
        {"he": "מחלת טירוף מסתורית שגורמת לכולם לפקפק בכל אמת", "en": "a contagion of madness driving everyone to doubt all truth"}
    ]
}

target = Path("assets/bootkeh-data.js")
content = f"""// assets/bootkeh-data.js
// Auto-generated Comprehensive Blood on the Clocktower database for roeetal.com/Bootkeh
// Bilingual (Hebrew & English) - Trouble Brewing, Bad Moon Rising, Sects & Violets, Crimson Guard, Experimental

window.BOOTKEH_ROLES = {json.dumps(ROLES, ensure_ascii=False, indent=2)};

window.BOOTKEH_SCRIPTS = {json.dumps(SCRIPTS, ensure_ascii=False, indent=2)};

window.BOOTKEH_THEMES = {json.dumps(THEMES, ensure_ascii=False, indent=2)};

window.BOOTKEH_THEME_GENERATOR = {json.dumps(THEME_GENERATOR_DATA, ensure_ascii=False, indent=2)};

window.BOOTKEH_PLAYER_DISTRIBUTION = {{
  "5":  {{ "townsfolk": 3, "outsiders": 0, "minions": 1, "demons": 1 }},
  "6":  {{ "townsfolk": 3, "outsiders": 1, "minions": 1, "demons": 1 }},
  "7":  {{ "townsfolk": 5, "outsiders": 0, "minions": 1, "demons": 1 }},
  "8":  {{ "townsfolk": 5, "outsiders": 1, "minions": 1, "demons": 1 }},
  "9":  {{ "townsfolk": 5, "outsiders": 2, "minions": 1, "demons": 1 }},
  "10": {{ "townsfolk": 7, "outsiders": 0, "minions": 2, "demons": 1 }},
  "11": {{ "townsfolk": 7, "outsiders": 1, "minions": 2, "demons": 1 }},
  "12": {{ "townsfolk": 7, "outsiders": 2, "minions": 2, "demons": 1 }},
  "13": {{ "townsfolk": 9, "outsiders": 0, "minions": 3, "demons": 1 }},
  "14": {{ "townsfolk": 9, "outsiders": 1, "minions": 3, "demons": 1 }},
  "15": {{ "townsfolk": 9, "outsiders": 2, "minions": 3, "demons": 1 }}
}};
"""

target.write_text(content, encoding="utf-8")
print(f"Generated {target} with {len(ROLES)} roles, {len(SCRIPTS)} scripts, {len(THEMES)} themes.")
