// assets/bootkeh-data.js
// Auto-generated Blood on the Clocktower database for roeetal.com/Bootkeh
// Bilingual (Hebrew & English)

window.BOOTKEH_ROLES = [
  {
    "id": "librarian",
    "type": "townsfolk",
    "name_en": "Librarian",
    "name_he": "ספרן",
    "ability_en": "You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.)",
    "ability_he": "אתה מתחיל בידיעה שאחד משני שחקנים הוא אאוטסיידר מסוים (או שאין אף אאוטסיידר במשחק).",
    "icon": "📖",
    "editions": [
      "crimson_guard",
      "trouble_brewing"
    ],
    "firstNight": 34,
    "otherNight": 0,
    "reminders": [
      "Outsider",
      "Wrong"
    ],
    "flavor_prompt": "Who is the Outsider?"
  },
  {
    "id": "empath",
    "type": "townsfolk",
    "name_en": "Empath",
    "name_he": "אמפת",
    "ability_en": "Each night, you learn how many of your 2 alive neighbors are evil.",
    "ability_he": "בכל לילה, אתה מגלה כמה משני השכנים החיים שלך הם רעים (0, 1 או 2).",
    "icon": "💙",
    "editions": [
      "crimson_guard",
      "trouble_brewing"
    ],
    "firstNight": 37,
    "otherNight": 53,
    "reminders": [],
    "flavor_prompt": "Show fingers: 0, 1, or 2."
  },
  {
    "id": "snake_charmer",
    "type": "townsfolk",
    "name_en": "Snake Charmer",
    "name_he": "לוחש הנחשים",
    "ability_en": "Each night, choose an alive player: a chosen Demon swaps characters & alignments with you & is then poisoned.",
    "ability_he": "בכל לילה, בחר שחקן חי: אם הוא השד, אתם מחליפים תפקידים וצדדים (אתה הופך לשד רע והוא ללוחש נחשים טוב ומורעל).",
    "icon": "🐍",
    "editions": [
      "crimson_guard",
      "sects_and_violets"
    ],
    "firstNight": 20,
    "otherNight": 11,
    "reminders": [
      "Poisoned"
    ],
    "flavor_prompt": "Choose a player."
  },
  {
    "id": "undertaker",
    "type": "townsfolk",
    "name_en": "Undertaker",
    "name_he": "קברן",
    "ability_en": "Each night*, you learn which character died by execution today.",
    "ability_he": "בכל לילה (מלבד הראשון), אתה לומד איזה תפקיד הוצא להורג היום בעיירה.",
    "icon": "⛏️",
    "editions": [
      "crimson_guard",
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 55,
    "reminders": [
      "Executed"
    ],
    "flavor_prompt": "Show executed character token."
  },
  {
    "id": "monk",
    "type": "townsfolk",
    "name_en": "Monk",
    "name_he": "נזיר",
    "ability_en": "Each night*, choose a player (not yourself): they are safe from the Demon tonight.",
    "ability_he": "בכל לילה (מלבד הראשון), בחר שחקן שאינו אתה: הוא מוגן מהשד הלילה.",
    "icon": "⚓",
    "editions": [
      "crimson_guard",
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 12,
    "reminders": [
      "Protected"
    ],
    "flavor_prompt": "Choose a player to protect."
  },
  {
    "id": "alsaahir",
    "type": "townsfolk",
    "name_en": "Alsaahir",
    "name_he": "אל-סאהיר",
    "ability_en": "Each day, if you publicly guess which players are Minion(s) and which are Demon(s), good wins.",
    "ability_he": "בכל יום, אם תנחש בקול ופומבית מי הם כל המשרתים ומי הם השד(ים), הטובים מנצחים מיד.",
    "icon": "💨",
    "editions": [
      "crimson_guard",
      "experimental"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Public guess during day."
  },
  {
    "id": "philosopher",
    "type": "townsfolk",
    "name_en": "Philosopher",
    "name_he": "פילוסוף",
    "ability_en": "Once per game, at night, choose a good character: gain that ability. If this character is in play, they are drunk.",
    "ability_he": "פעם במשחק, בלילה, בחר דמות טובה: אתה מקבל את יכולתה. אם אותה דמות כבר במשחק, היא הופכת לשיכורה.",
    "icon": "🔍",
    "editions": [
      "crimson_guard",
      "sects_and_violets"
    ],
    "firstNight": 2,
    "otherNight": 2,
    "reminders": [
      "Drunk",
      "Is the Philosopher"
    ],
    "flavor_prompt": "Choose a good character to become."
  },
  {
    "id": "slayer",
    "type": "townsfolk",
    "name_en": "Slayer",
    "name_he": "צייד השדים (קוטל)",
    "ability_en": "Once per game, during the day, publicly choose a player: if they are the Demon, they die.",
    "ability_he": "פעם אחת במשחק, במהלך היום, הצהר פומבית על שחקן שברצונך לחסל: אם הוא השד, הוא מת מיד.",
    "icon": "🏹",
    "editions": [
      "crimson_guard",
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [
      "No ability"
    ],
    "flavor_prompt": "Shoots during day."
  },
  {
    "id": "alchemist",
    "type": "townsfolk",
    "name_en": "Alchemist",
    "name_he": "אלכימאי",
    "ability_en": "You have a Minion ability. When using this, the Storyteller may prompt you to choose differently.",
    "ability_he": "יש לך יכולת של משרת (טוב עם כוח של רע!). בעת השימוש בה, מספר הסיפורים עשוי לבקש ממך לבחור מחדש.",
    "icon": "🧪",
    "editions": [
      "crimson_guard",
      "experimental"
    ],
    "firstNight": 3,
    "otherNight": 3,
    "reminders": [
      "Is the Alchemist"
    ],
    "flavor_prompt": "Learns Minion ability."
  },
  {
    "id": "virgin",
    "type": "townsfolk",
    "name_en": "Virgin",
    "name_he": "בתולה טהורה",
    "ability_en": "The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.",
    "ability_he": "בפעם הראשונה שאתה מועמד להוצאה להורג, אם המועמד המציע הוא איש עיירה, הוא מוצא להורג מיד במקומך.",
    "icon": "💍",
    "editions": [
      "crimson_guard",
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [
      "No ability"
    ],
    "flavor_prompt": "Triggers on nomination."
  },
  {
    "id": "washerwoman",
    "type": "townsfolk",
    "name_en": "Washerwoman",
    "name_he": "כובסת",
    "ability_en": "You start knowing that 1 of 2 players is a particular Townsfolk.",
    "ability_he": "אתה מתחיל בידיעה שאחד משני שחקנים הוא איש עיירה מסוים.",
    "icon": "🧺",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 33,
    "otherNight": 0,
    "reminders": [
      "Townsfolk",
      "Wrong"
    ],
    "flavor_prompt": "Show 1 Townsfolk token and 2 players."
  },
  {
    "id": "investigator",
    "type": "townsfolk",
    "name_en": "Investigator",
    "name_he": "חוקר",
    "ability_en": "You start knowing that 1 of 2 players is a particular Minion.",
    "ability_he": "אתה מתחיל בידיעה שאחד משני שחקנים הוא משרת מסוים.",
    "icon": "🔎",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 35,
    "otherNight": 0,
    "reminders": [
      "Minion",
      "Wrong"
    ],
    "flavor_prompt": "Show 1 Minion token and 2 players."
  },
  {
    "id": "chef",
    "type": "townsfolk",
    "name_en": "Chef",
    "name_he": "שף",
    "ability_en": "You start knowing how many pairs of evil players are sitting next to each other.",
    "ability_he": "אתה מתחיל בידיעה כמה זוגות של שחקנים רעים יושבים זה לצד זה במעגל.",
    "icon": "👨‍🍳",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 36,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Show number of evil neighbor pairs."
  },
  {
    "id": "fortune_teller",
    "type": "townsfolk",
    "name_en": "Fortune Teller",
    "name_he": "מגדת עתידות",
    "ability_en": "Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you.",
    "ability_he": "בכל לילה, בחר 2 שחקנים: אתה מגלה אם מישהו מהם הוא שד (כן/לא). יש שחקן טוב אחד שנרשם כשד עבורך (Red Herring).",
    "icon": "🔮",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 38,
    "otherNight": 54,
    "reminders": [
      "Red herring"
    ],
    "flavor_prompt": "Nod yes if either is Demon or Red Herring."
  },
  {
    "id": "ravenkeeper",
    "type": "townsfolk",
    "name_en": "Ravenkeeper",
    "name_he": "שומר העורבים",
    "ability_en": "If you die at night, you are woken to choose a player: you learn their character.",
    "ability_he": "אם אתה נרצח בלילה, אתה מתעורר ובוחר שחקן: אתה מגלה במדויק את הדמות שלו.",
    "icon": "🦅",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 52,
    "reminders": [],
    "flavor_prompt": "If killed tonight, wakes to learn a player's character."
  },
  {
    "id": "soldier",
    "type": "townsfolk",
    "name_en": "Soldier",
    "name_he": "חייל",
    "ability_en": "You are safe from the Demon.",
    "ability_he": "אתה מוגן לחלוטין ממתקפת השד (השד לא יכול להרוג אותך בלילה).",
    "icon": "🛡️",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Immune to Demon kills."
  },
  {
    "id": "mayor",
    "type": "townsfolk",
    "name_en": "Mayor",
    "name_he": "ראש העיר",
    "ability_en": "If no-one is executed on day 3+, good wins. If you die at night, another player might die instead.",
    "ability_he": "אם רק 3 שחקנים בחיים ואף אחד לא הוצא להורג, הטובים מנצחים. אם נרצחת בלילה, שחקן אחר עשוי למות במקומך.",
    "icon": "🎩",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Night death can bounce to another player."
  },
  {
    "id": "clockmaker",
    "type": "townsfolk",
    "name_en": "Clockmaker",
    "name_he": "שען",
    "ability_en": "You start knowing how many steps from the Demon to the nearest Minion.",
    "ability_he": "אתה מתחיל בידיעה כמה צעדים במעגל מפרידים בין השד למשרת הקרוב אליו ביותר.",
    "icon": "🕰️",
    "editions": [
      "sects_and_violets"
    ],
    "firstNight": 32,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Show number of steps between Demon and nearest Minion."
  },
  {
    "id": "dreamer",
    "type": "townsfolk",
    "name_en": "Dreamer",
    "name_he": "חולם בהקיץ",
    "ability_en": "Each night, choose an alive player: you learn 1 good and 1 evil character, 1 of which is correct.",
    "ability_he": "בכל לילה, בחר שחקן חי: אתה לומד דמות טובה אחת ודמות רעה אחת, אחת מהן היא הדמות האמיתית שלו.",
    "icon": "💭",
    "editions": [
      "sects_and_violets"
    ],
    "firstNight": 39,
    "otherNight": 56,
    "reminders": [],
    "flavor_prompt": "Show 1 good and 1 evil character."
  },
  {
    "id": "artist",
    "type": "townsfolk",
    "name_en": "Artist",
    "name_he": "אמן",
    "ability_en": "Once per game, during the day, privately ask the Storyteller any yes/no question.",
    "ability_he": "פעם במשחק, ביום, שאל את מספר הסיפורים שאלה פרטית של כן/לא וקבל תשובת אמת.",
    "icon": "🎨",
    "editions": [
      "sects_and_violets"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [
      "No ability"
    ],
    "flavor_prompt": "Asks 1 yes/no question."
  },
  {
    "id": "juggler",
    "type": "townsfolk",
    "name_en": "Juggler",
    "name_he": "להטוטן",
    "ability_en": "On your 1st day, publicly guess up to 5 players' characters. That night, you learn how many were correct.",
    "ability_he": "ביום הראשון, נחש בפומבי עד 5 דמויות של שחקנים. בלילה תגלה כמה ניחושים היו נכונים.",
    "icon": "🤹",
    "editions": [
      "sects_and_violets"
    ],
    "firstNight": 0,
    "otherNight": 57,
    "reminders": [
      "Correct"
    ],
    "flavor_prompt": "Show number of correct guesses."
  },
  {
    "id": "recluse",
    "type": "outsider",
    "name_en": "Recluse",
    "name_he": "מתבודד",
    "ability_en": "You might register as evil & as a Minion or Demon, even if dead.",
    "ability_he": "אתה טוב, אך עלול להירשם כרע וכמשרת או כשד בבדיקות מידע, גם אם אתה מת.",
    "icon": "🏮",
    "editions": [
      "crimson_guard",
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "May register as evil / Minion / Demon."
  },
  {
    "id": "klutz",
    "type": "outsider",
    "name_en": "Klutz",
    "name_he": "שלומיאל (מגושם)",
    "ability_en": "When you learn that you died, publicly choose 1 alive player: if they are evil, your team loses.",
    "ability_he": "כשאתה מגלה שמתת, בחר בקול שחקן חי אחד: אם בחרת בשחקן רע, הקבוצה הטובה מפסידה מיד!",
    "icon": "🍌",
    "editions": [
      "crimson_guard",
      "sects_and_violets"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Publicly picks a player upon death."
  },
  {
    "id": "damsel",
    "type": "outsider",
    "name_en": "Damsel",
    "name_he": "עלמה במצוקה",
    "ability_en": "All Minions know a Damsel is in play. If a Minion publicly guesses you (once), your team loses.",
    "ability_he": "כל המשרתים יודעים שעלמה במצוקה נמצאת במשחק. אם משרת מנחש פומבית מי את (פעם אחת), הקבוצה הטובה מפסידה!",
    "icon": "👠",
    "editions": [
      "crimson_guard",
      "experimental"
    ],
    "firstNight": 30,
    "otherNight": 0,
    "reminders": [
      "Guess used"
    ],
    "flavor_prompt": "Wake minions and tell them a Damsel is in play."
  },
  {
    "id": "heretic",
    "type": "outsider",
    "name_en": "Heretic",
    "name_he": "כופר",
    "ability_en": "Whoever wins, loses & whoever loses, wins, even if you are dead.",
    "ability_he": "תנאי הניצחון הפוכים לחלוטין! מי שאמור לנצח מפסיד, ומי שאמור להפסיד מנצח (אפילו אם מתת).",
    "icon": "☩",
    "editions": [
      "crimson_guard",
      "experimental"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Inverts win conditions."
  },
  {
    "id": "butler",
    "type": "outsider",
    "name_en": "Butler",
    "name_he": "משרת אישי (באטלר)",
    "ability_en": "Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.",
    "ability_he": "בכל לילה, בחר אדון (שחקן אחר): מחר מותר לך להצביע בהוצאה להורג אך ורק אם האדון שלך מצביע גם הוא.",
    "icon": "👔",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 40,
    "otherNight": 59,
    "reminders": [
      "Master"
    ],
    "flavor_prompt": "Picks their Master."
  },
  {
    "id": "drunk",
    "type": "outsider",
    "name_en": "Drunk",
    "name_he": "שיכור",
    "ability_en": "You do not know you are the Drunk. You think you are a Townsfolk character, but your ability doesn't work.",
    "ability_he": "אתה לא יודע שאתה השיכור! אתה חושב שאתה איש עיירה מסוים, אך יכולתך מזויפת ולא עובדת באמת.",
    "icon": "🍺",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [
      "Is the Drunk"
    ],
    "flavor_prompt": "Storyteller gives false info to Drunk."
  },
  {
    "id": "saint",
    "type": "outsider",
    "name_en": "Saint",
    "name_he": "קדוש",
    "ability_en": "If you die by execution, your team loses.",
    "ability_he": "אם העיירה מוציאה אותך להורג ביום, הקבוצה הטובה מפסידה מיד במשחק!",
    "icon": "😇",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Execution loses game for Good."
  },
  {
    "id": "mutant",
    "type": "outsider",
    "name_en": "Mutant",
    "name_he": "מוטנט",
    "ability_en": "If you are 'mad' about being an Outsider, you might be executed by the Storyteller.",
    "ability_he": "אסור לך לטעון או לרמוז שאתה אאוטסיידר. אם תעשה כן, מספר הסיפורים עלול להוציא אותך להורג במקום.",
    "icon": "🧬",
    "editions": [
      "sects_and_violets"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Madness rule applies."
  },
  {
    "id": "devils_advocate",
    "type": "minion",
    "name_en": "Devil's Advocate",
    "name_he": "סנגור השטן",
    "ability_en": "Each night, choose a living player (different to last night): if executed tomorrow, they don't die.",
    "ability_he": "בכל לילה, בחר שחקן חי (שונה מהלילה הקודם): אם יוציאו אותו להורג מחר, הוא שורד ולא ימות.",
    "icon": "⚖️",
    "editions": [
      "crimson_guard",
      "bad_moon_rising"
    ],
    "firstNight": 22,
    "otherNight": 13,
    "reminders": [
      "Survives execution"
    ],
    "flavor_prompt": "Protects a player from execution."
  },
  {
    "id": "psychopath",
    "type": "minion",
    "name_en": "Psychopath",
    "name_he": "פסיכופת",
    "ability_en": "Each day, before nominations, you may publicly choose a player: they die. If executed, you only die if you lose roshambo.",
    "ability_he": "בכל יום, לפני תחילת ההצבעות, אתה רשאי לחסל שחקן בפומבי. אם מוציאים אותך להורג, אתה מת רק אם אתה מפסיד באבן-נייר-ומספריים לשחקן שהציע אותך!",
    "icon": "🪓",
    "editions": [
      "crimson_guard",
      "experimental"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Day killer + Roshambo execution defense."
  },
  {
    "id": "goblin",
    "type": "minion",
    "name_en": "Goblin",
    "name_he": "גובלין",
    "ability_en": "If you publicly claim to be the Goblin when nominated & are executed that day, your team wins.",
    "ability_he": "אם מעמידים אותך להוצאה להורג ואתה מכריז בקול שאתה הגובלין, ואז מוציאים אותך להורג בכל זאת - הרוע מנצח מיד!",
    "icon": "👺",
    "editions": [
      "crimson_guard",
      "experimental"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [
      "Claimed"
    ],
    "flavor_prompt": "Wins if executed after claim."
  },
  {
    "id": "boomdandy",
    "type": "minion",
    "name_en": "Boomdandy",
    "name_he": "בומדנדי (פצצה מתקתקת)",
    "ability_en": "If you are executed, all but 3 players die. After a 10 to 1 countdown, the player with the most players pointing at them, dies.",
    "ability_he": "אם העיירה מוציאה אותך להורג, פצצה מתפוצצת וכל השחקנים מתים מלבד 3! בספירה מ-10 ל-1 כל השורדים מצביעים, ומי שמקבל הכי הרבה אצבעות מופנות אליו - מת גם הוא.",
    "icon": "💣",
    "editions": [
      "crimson_guard",
      "experimental"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "reminders": [],
    "flavor_prompt": "Bomb explosion upon execution."
  },
  {
    "id": "poisoner",
    "type": "minion",
    "name_en": "Poisoner",
    "name_he": "מרעיל",
    "ability_en": "Each night, choose a player: they are poisoned tonight and tomorrow day.",
    "ability_he": "בכל לילה, בחר שחקן: הוא מורעל לאורך כל הלילה וכל יום המחרת (יכולתו נכשלת או מניבה שקרים).",
    "icon": "🧪",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 17,
    "otherNight": 8,
    "reminders": [
      "Poisoned"
    ],
    "flavor_prompt": "Choose a player to poison."
  },
  {
    "id": "spy",
    "type": "minion",
    "name_en": "Spy",
    "name_he": "מרגל",
    "ability_en": "Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.",
    "ability_he": "בכל לילה, אתה מסתכל בגרימואר של מספר הסיפורים ורואה את כל התפקידים! אתה עשוי להירשם כטוב בבדיקות.",
    "icon": "🕵️",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 47,
    "otherNight": 63,
    "reminders": [],
    "flavor_prompt": "Show the Grimoire."
  },
  {
    "id": "scarlet_woman",
    "type": "minion",
    "name_en": "Scarlet Woman",
    "name_he": "האישה באדום",
    "ability_en": "If there are 5 or more players alive & the Demon dies, you become the Demon.",
    "ability_he": "אם יש 5 שחקנים חיים או יותר והשד מת, את הופכת מיד לשד החדש והמשחק ממשיך!",
    "icon": "💃",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 19,
    "reminders": [
      "Is the Demon"
    ],
    "flavor_prompt": "Becomes Demon if original Demon dies."
  },
  {
    "id": "baron",
    "type": "minion",
    "name_en": "Baron",
    "name_he": "ברון",
    "ability_en": "There are extra Outsiders in play. [+2 Outsiders]",
    "ability_he": "הנוכחות שלך מכניסה עוד בלאגן לעיירה: נוספים 2 אאוטסיידרים למשחק במקום 2 אנשי עיירה. [+2 אאוטסיידרים]",
    "icon": "🏰",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 0,
    "setupMod": {
      "outsiders": 2,
      "townsfolk": -2
    },
    "reminders": [],
    "flavor_prompt": "Setup modification: +2 Outsiders."
  },
  {
    "id": "witch",
    "type": "minion",
    "name_en": "Witch",
    "name_he": "מכשפה",
    "ability_en": "Each night, choose a player: if they nominate tomorrow, they die immediately.",
    "ability_he": "בכל לילה, קלל שחקן: אם הוא יציע מחר מישהו להוצאה להורג, הוא ימות מיד במקום.",
    "icon": "🧙‍♀️",
    "editions": [
      "sects_and_violets"
    ],
    "firstNight": 24,
    "otherNight": 14,
    "reminders": [
      "Cursed"
    ],
    "flavor_prompt": "Curse a player."
  },
  {
    "id": "godfather",
    "type": "minion",
    "name_en": "Godfather",
    "name_he": "הסנדק",
    "ability_en": "You start knowing which Outsiders are in play. If an Outsider died today, choose a player tonight: they die. [-1 or +1 Outsider]",
    "ability_he": "אתה יודע אילו אאוטסיידרים במשחק. אם אאוטסיידר מת היום, בלילה אתה רשאי לחסל שחקן נוסף.",
    "icon": "🥀",
    "editions": [
      "bad_moon_rising"
    ],
    "firstNight": 21,
    "otherNight": 38,
    "reminders": [
      "Died today",
      "Dead"
    ],
    "flavor_prompt": "Bonus kill if Outsider died."
  },
  {
    "id": "assassin",
    "type": "minion",
    "name_en": "Assassin",
    "name_he": "מתנקש",
    "ability_en": "Once per game, at night*, choose a player: they die, even if for some reason they could not.",
    "ability_he": "פעם במשחק, בלילה, בחר שחקן: הוא מת ללא תנאי, תוך עקיפת כל הגנה אפשרית (נזיר, חייל וכו').",
    "icon": "🗡️",
    "editions": [
      "bad_moon_rising"
    ],
    "firstNight": 0,
    "otherNight": 39,
    "reminders": [
      "No ability"
    ],
    "flavor_prompt": "Unstoppable kill."
  },
  {
    "id": "pukka",
    "type": "demon",
    "name_en": "Pukka",
    "name_he": "פוקה",
    "ability_en": "Each night, choose a player: they are poisoned. The previously poisoned player dies then becomes healthy.",
    "ability_he": "בכל לילה, בחר שחקן: הוא נהיה מורעל. השחקן שהורעל בלילה הקודם מת מהרעל, ואז הרעל מסתיים.",
    "icon": "🐍",
    "editions": [
      "crimson_guard",
      "bad_moon_rising"
    ],
    "firstNight": 28,
    "otherNight": 26,
    "reminders": [
      "Poisoned",
      "Dead"
    ],
    "flavor_prompt": "Poisons tonight, kills previous poisoned player."
  },
  {
    "id": "vortox",
    "type": "demon",
    "name_en": "Vortox",
    "name_he": "וורטוקס",
    "ability_en": "Each night*, choose a player: they die. Townsfolk abilities yield false info. Each day, if no-one is executed, evil wins.",
    "ability_he": "בכל לילה*, בחר שחקן להרוג. יכולות אנשי העיירה מניבות תמיד מידע כוזב ושגוי! בכל יום שבו אף אחד לא מוצא להורג, הרוע מנצח מיד!",
    "icon": "🌪️",
    "editions": [
      "crimson_guard",
      "sects_and_violets"
    ],
    "firstNight": 0,
    "otherNight": 30,
    "reminders": [
      "Dead"
    ],
    "flavor_prompt": "False info for all Townsfolk + execute daily or evil wins."
  },
  {
    "id": "imp",
    "type": "demon",
    "name_en": "Imp",
    "name_he": "אימפ (שדון)",
    "ability_en": "Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.",
    "ability_he": "בכל לילה (מלבד הראשון), בחר שחקן: הוא מת. אם בחרת להתאבד, אחד המשרתים שלך הופך לאימפ החדש במקומך!",
    "icon": "😈",
    "editions": [
      "trouble_brewing"
    ],
    "firstNight": 0,
    "otherNight": 24,
    "reminders": [
      "Dead"
    ],
    "flavor_prompt": "Choose a player to die (starpass if self)."
  },
  {
    "id": "fang_gu",
    "type": "demon",
    "name_en": "Fang Gu",
    "name_he": "פאנג גו",
    "ability_en": "Each night*, choose a player: they die. The 1st Outsider this kills becomes an evil Fang Gu & you die instead. [+1 Outsider]",
    "ability_he": "בכל לילה*, בחר שחקן: הוא מת. האאוטסיידר הראשון שתוקפים הופך לשד פאנג גו רע במקומך, ואתה מת במקומו! [+1 אאוטסיידר]",
    "icon": "🦎",
    "editions": [
      "sects_and_violets"
    ],
    "firstNight": 0,
    "otherNight": 27,
    "setupMod": {
      "outsiders": 1,
      "townsfolk": -1
    },
    "reminders": [
      "Dead",
      "Once"
    ],
    "flavor_prompt": "Jumps to Outsider on first Outsider hit."
  },
  {
    "id": "no_dashii",
    "type": "demon",
    "name_en": "No Dashii",
    "name_he": "נו דאשי",
    "ability_en": "Each night*, choose a player: they die. Your 2 Townsfolk neighbors are poisoned.",
    "ability_he": "בכל לילה*, בחר שחקן להרוג. שני שכניך אנשי העיירה הקרובים ביותר אליך במעגל מורעלים לצמיתות.",
    "icon": "👹",
    "editions": [
      "sects_and_violets"
    ],
    "firstNight": 0,
    "otherNight": 28,
    "reminders": [
      "Poisoned",
      "Dead"
    ],
    "flavor_prompt": "Townsfolk neighbors poisoned."
  },
  {
    "id": "zombuul",
    "type": "demon",
    "name_en": "Zombuul",
    "name_he": "זומבול",
    "ability_en": "Each night*, if no-one died today, choose a player: they die. The 1st time you die, you live but register as dead.",
    "ability_he": "בכל לילה*, אם איש לא מת היום, בחר שחקן: הוא מת. בפעם הראשונה שאתה מוצא להורג, אתה נשאר חי אך נחשב מת לעיני כולם.",
    "icon": "🧟",
    "editions": [
      "bad_moon_rising"
    ],
    "firstNight": 0,
    "otherNight": 25,
    "reminders": [
      "Died today",
      "Dead"
    ],
    "flavor_prompt": "Lives once after execution."
  }
];

window.BOOTKEH_SCRIPTS = {
  "crimson_guard": {
    "id": "crimson_guard",
    "name_en": "Return of the Crimson Guard",
    "name_he": "שובו של משמר הארגמן",
    "author": "Sit",
    "roles": [
      "librarian",
      "empath",
      "snake_charmer",
      "undertaker",
      "monk",
      "alsaahir",
      "philosopher",
      "slayer",
      "alchemist",
      "virgin",
      "recluse",
      "klutz",
      "damsel",
      "heretic",
      "devils_advocate",
      "psychopath",
      "goblin",
      "boomdandy",
      "pukka",
      "vortox"
    ]
  },
  "trouble_brewing": {
    "id": "trouble_brewing",
    "name_en": "Trouble Brewing",
    "name_he": "הצרות מתבשלות",
    "author": "The Pandemonium Institute",
    "roles": [
      "washerwoman",
      "librarian",
      "investigator",
      "chef",
      "empath",
      "fortune_teller",
      "undertaker",
      "monk",
      "ravenkeeper",
      "virgin",
      "slayer",
      "soldier",
      "mayor",
      "butler",
      "drunk",
      "recluse",
      "saint",
      "poisoner",
      "spy",
      "scarlet_woman",
      "baron",
      "imp"
    ]
  },
  "sects_and_violets": {
    "id": "sects_and_violets",
    "name_en": "Sects & Violets",
    "name_he": "כתות וסיגליות",
    "author": "The Pandemonium Institute",
    "roles": [
      "clockmaker",
      "dreamer",
      "snake_charmer",
      "philosopher",
      "artist",
      "juggler",
      "mutant",
      "klutz",
      "witch",
      "devils_advocate",
      "vortox",
      "no_dashii",
      "fang_gu"
    ]
  }
};

window.BOOTKEH_THEMES = [
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
    "id": "ravenswood_bluff",
    "title_en": "Ravenswood Bluff (Classic)",
    "title_he": "מצוק רייבנסווד (הקלאסי)",
    "desc_en": "The iconic gothic hamlet where the Storyteller found the town Storyteller murdered on the hands of the clocktower.",
    "desc_he": "הכפר הגותי האייקוני שבו מספר הסיפורים של העיירה נמצא משופד על מחוגי מגדל השעון בחצות הלילה.",
    "icon": "🏰"
  }
];

window.BOOTKEH_PLAYER_DISTRIBUTION = {
  "5":  { "townsfolk": 3, "outsiders": 0, "minions": 1, "demons": 1 },
  "6":  { "townsfolk": 3, "outsiders": 1, "minions": 1, "demons": 1 },
  "7":  { "townsfolk": 5, "outsiders": 0, "minions": 1, "demons": 1 },
  "8":  { "townsfolk": 5, "outsiders": 1, "minions": 1, "demons": 1 },
  "9":  { "townsfolk": 5, "outsiders": 2, "minions": 1, "demons": 1 },
  "10": { "townsfolk": 7, "outsiders": 0, "minions": 2, "demons": 1 },
  "11": { "townsfolk": 7, "outsiders": 1, "minions": 2, "demons": 1 },
  "12": { "townsfolk": 7, "outsiders": 2, "minions": 2, "demons": 1 },
  "13": { "townsfolk": 9, "outsiders": 0, "minions": 3, "demons": 1 },
  "14": { "townsfolk": 9, "outsiders": 1, "minions": 3, "demons": 1 },
  "15": { "townsfolk": 9, "outsiders": 2, "minions": 3, "demons": 1 }
};
