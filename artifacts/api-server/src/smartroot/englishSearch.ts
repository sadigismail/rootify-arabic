import { getAllFormIGlosses, type GlossEntry } from "./form1Lexicon.js";
import { getAllFormIIGlosses } from "./form2lexicon.js";
import { getAllFormIIIGlosses } from "./form3lexicon.js";
import { getAllFormIVGlosses } from "./form4lexicon.js";
import { getAllFormVGlosses } from "./form5lexicon.js";
import { getAllFormVIGlosses } from "./form6lexicon.js";
import { getAllFormVIIGlosses } from "./form7lexicon.js";
import { getAllFormVIIIGlosses } from "./form8lexicon.js";
import { getAllFormXGlosses } from "./form10lexicon.js";

const FORM_LABELS: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
  6: "VI", 7: "VII", 8: "VIII", 10: "X",
};

export interface EnglishSearchResult {
  root: string;
  form: number;
  formLabel: string;
  gloss: string;
  tr: string;
  freq: number;
  ilr: string;
  score: number;
  matchType?: "exact" | "normalized" | "synonym";
}

export interface GroupedSearchResult {
  query: string;
  normalizedQuery: string;
  expandedQueries: string[];
  groups: SearchGroup[];
}

export interface SearchGroup {
  label: string;
  priority: number;
  results: GroupedResultEntry[];
}

export interface GroupedResultEntry {
  root: string;
  form: number;
  formLabel: string;
  gloss: string;
  tr: string;
  freq: number;
  score: number;
  matchType: "exact" | "normalized" | "synonym";
}

let _index: GlossEntry[] | null = null;

function buildIndex(): GlossEntry[] {
  if (_index) return _index;

  const entries: GlossEntry[] = [];

  entries.push(...getAllFormIGlosses());

  const derivedSources: [Record<string, string>, number][] = [
    [getAllFormIIGlosses(), 2],
    [getAllFormIIIGlosses(), 3],
    [getAllFormIVGlosses(), 4],
    [getAllFormVGlosses(), 5],
    [getAllFormVIGlosses(), 6],
    [getAllFormVIIGlosses(), 7],
    [getAllFormVIIIGlosses(), 8],
    [getAllFormXGlosses(), 10],
  ];

  for (const [glosses, form] of derivedSources) {
    for (const [root, gloss] of Object.entries(glosses)) {
      entries.push({ root, form, gloss, tr: "t", freq: 3, ilr: "2" });
    }
  }

  _index = entries;
  return entries;
}

const STOP_WORDS = new Set([
  "to", "a", "an", "the", "be", "is", "are", "was", "were",
  "of", "in", "on", "at", "for", "with", "by", "from",
  "and", "or", "not", "no", "so", "up", "out",
  "it", "its", "this", "that",
]);

const IRREGULAR_STEMS: Record<string, string> = {
  wrote: "write", written: "write", writing: "write",
  saw: "see", seen: "see", seeing: "see",
  went: "go", gone: "go", going: "go",
  came: "come", coming: "come",
  gave: "give", given: "give", giving: "give",
  took: "take", taken: "take", taking: "take",
  made: "make", making: "make",
  said: "say", saying: "say",
  told: "tell", telling: "tell",
  knew: "know", known: "know", knowing: "know",
  thought: "think", thinking: "think",
  found: "find", finding: "find",
  left: "leave", leaving: "leave",
  felt: "feel", feeling: "feel",
  kept: "keep", keeping: "keep",
  began: "begin", begun: "begin", beginning: "begin",
  spoke: "speak", spoken: "speak", speaking: "speak",
  brought: "bring", bringing: "bring",
  heard: "hear", hearing: "hear",
  sat: "sit", sitting: "sit",
  stood: "stand", standing: "stand",
  held: "hold", holding: "hold",
  led: "lead", leading: "lead",
  understood: "understand", understanding: "understand",
  sent: "send", sending: "send",
  built: "build", building: "build",
  spent: "spend", spending: "spend",
  fell: "fall", fallen: "fall", falling: "fall",
  ran: "run", running: "run",
  taught: "teach", teaching: "teach",
  bought: "buy", buying: "buy",
  fought: "fight", fighting: "fight",
  caught: "catch", catching: "catch",
  drank: "drink", drunk: "drink", drinking: "drink",
  ate: "eat", eaten: "eat", eating: "eat",
  drew: "draw", drawn: "draw", drawing: "draw",
  broke: "break", broken: "break", breaking: "break",
  chose: "choose", chosen: "choose", choosing: "choose",
  drove: "drive", driven: "drive", driving: "drive",
  rode: "ride", ridden: "ride", riding: "ride",
  rose: "rise", risen: "rise", rising: "rise",
  wore: "wear", worn: "wear", wearing: "wear",
  threw: "throw", thrown: "throw", throwing: "throw",
  grew: "grow", grown: "grow", growing: "grow",
  flew: "fly", flown: "fly", flying: "fly",
  hid: "hide", hidden: "hide", hiding: "hide",
  forgave: "forgive", forgiven: "forgive",
  swore: "swear", sworn: "swear",
  shook: "shake", shaken: "shake",
  stole: "steal", stolen: "steal",
  woke: "wake", woken: "wake",
  bore: "bear", borne: "bear", born: "bear",
  tore: "tear", torn: "tear",
  swam: "swim", swum: "swim",
  sang: "sing", sung: "sing",
  rang: "ring", rung: "ring",
  lied: "lie", lying: "lie",
  died: "die", dying: "die",
  tied: "tie", tying: "tie",
};

const SYNONYM_MAP: Record<string, string[]> = {
  see:     ["watch", "observe", "look", "view", "perceive", "witness", "notice"],
  watch:   ["see", "observe", "look", "view"],
  look:    ["see", "watch", "observe", "view", "gaze"],
  observe: ["see", "watch", "look", "monitor"],
  help:    ["assist", "support", "aid"],
  assist:  ["help", "support", "aid"],
  support: ["help", "assist", "aid", "back"],
  write:   ["record", "note", "document", "compose", "inscribe"],
  record:  ["write", "note", "document", "register"],
  document:["write", "record", "note"],
  read:    ["recite", "study", "peruse"],
  go:      ["leave", "depart", "head", "proceed", "move"],
  leave:   ["go", "depart", "exit"],
  depart:  ["go", "leave", "exit"],
  come:    ["arrive", "approach", "reach"],
  arrive:  ["come", "reach"],
  return:  ["come back", "go back", "restore", "revert"],
  speak:   ["talk", "say", "converse", "tell", "utter"],
  talk:    ["speak", "say", "converse", "chat"],
  say:     ["speak", "talk", "tell", "utter", "state"],
  tell:    ["say", "speak", "inform", "notify", "relate"],
  know:    ["understand", "recognize", "realize", "learn"],
  understand: ["know", "comprehend", "grasp", "realize"],
  learn:   ["study", "know", "understand"],
  teach:   ["instruct", "educate", "train", "show"],
  eat:     ["consume", "devour", "feed"],
  drink:   ["sip", "consume", "imbibe"],
  make:    ["create", "produce", "build", "construct", "manufacture"],
  create:  ["make", "produce", "build"],
  use:     ["employ", "utilize", "apply"],
  open:    ["unlock", "uncover", "begin", "start"],
  close:   ["shut", "seal", "end", "finish"],
  begin:   ["start", "commence", "initiate", "open"],
  start:   ["begin", "commence", "initiate"],
  finish:  ["end", "complete", "conclude", "close"],
  end:     ["finish", "complete", "conclude"],
  sit:     ["seat", "settle"],
  stand:   ["rise", "get up"],
  walk:    ["move", "go", "stroll", "march"],
  run:     ["sprint", "dash", "race", "hurry"],
  send:    ["dispatch", "transmit", "deliver"],
  take:    ["grab", "seize", "carry", "hold"],
  give:    ["offer", "provide", "grant", "bestow"],
  find:    ["discover", "locate", "uncover"],
  think:   ["consider", "reflect", "ponder", "contemplate"],
  feel:    ["sense", "perceive", "experience", "touch"],
  hear:    ["listen", "perceive"],
  listen:  ["hear", "attend"],
  break:   ["shatter", "crack", "destroy", "smash"],
  enter:   ["go in", "join", "access"],
  exit:    ["leave", "go out", "depart"],
  fight:   ["battle", "combat", "struggle"],
  kill:    ["slay", "murder"],
  love:    ["adore", "cherish"],
  hate:    ["detest", "despise", "loathe"],
  fear:    ["dread", "be afraid"],
  want:    ["desire", "wish", "need", "seek"],
  ask:     ["question", "inquire", "request", "demand"],
  answer:  ["reply", "respond"],
  carry:   ["bear", "hold", "transport"],
  pull:    ["draw", "drag", "tug"],
  push:    ["shove", "press", "thrust"],
  cut:     ["slice", "sever", "chop"],
  work:    ["labor", "toil", "operate"],
  play:    ["amuse", "enjoy", "perform"],
  sleep:   ["rest", "slumber", "nap"],
  wake:    ["awaken", "rouse", "stir"],
  pray:    ["worship", "supplicate"],
  worship: ["pray", "adore", "venerate"],
};

type SemanticEntry = {
  rootPlain: string;
  group: string;
  priority: number;
};

const SEMANTIC_GROUPS: Record<string, SemanticEntry[]> = {
  see: [
    { rootPlain: "رأى",   group: "Most common",  priority: 1 },
    { rootPlain: "شاهد",  group: "Watching",      priority: 2 },
    { rootPlain: "نظر",   group: "Looking",       priority: 2 },
    { rootPlain: "راقب",  group: "Observing",     priority: 3 },
    { rootPlain: "لاحظ",  group: "Noticing",      priority: 3 },
    { rootPlain: "أبصر",  group: "Perceiving",    priority: 3 },
    { rootPlain: "تأمل",  group: "Contemplating", priority: 4 },
    { rootPlain: "حدق",  group: "Staring",       priority: 4 },
  ],
  write: [
    { rootPlain: "كتب",   group: "Most common",            priority: 1 },
    { rootPlain: "دون",   group: "Recording / noting",     priority: 2 },
    { rootPlain: "سجل",   group: "Recording / registering", priority: 2 },
    { rootPlain: "وثق",   group: "Documenting",            priority: 3 },
    { rootPlain: "ألف",   group: "Composing / authoring",  priority: 3 },
    { rootPlain: "نسخ",   group: "Copying / transcribing", priority: 3 },
    { rootPlain: "خط",    group: "Inscribing",             priority: 4 },
  ],
  help: [
    { rootPlain: "ساعد",  group: "Most common",      priority: 1 },
    { rootPlain: "أعان",  group: "Most common",      priority: 1 },
    { rootPlain: "عاون",  group: "Cooperating",      priority: 2 },
    { rootPlain: "نصر",   group: "Literary / formal", priority: 3 },
    { rootPlain: "أسعف",  group: "Rescuing / aiding", priority: 3 },
    { rootPlain: "أغاث",  group: "Rescuing / aiding", priority: 3 },
  ],
  go: [
    { rootPlain: "ذهب",   group: "Most common",   priority: 1 },
    { rootPlain: "مشى",  group: "Walking",        priority: 2 },
    { rootPlain: "سار",   group: "Moving / proceeding", priority: 2 },
    { rootPlain: "غادر",  group: "Leaving / departing", priority: 2 },
    { rootPlain: "رحل",   group: "Departing",      priority: 3 },
    { rootPlain: "انطلق", group: "Setting out",    priority: 3 },
    { rootPlain: "خرج",   group: "Going out",      priority: 2 },
  ],
  come: [
    { rootPlain: "جاء",   group: "Most common",   priority: 1 },
    { rootPlain: "أتى",   group: "Most common",   priority: 1 },
    { rootPlain: "قدم",   group: "Arriving",       priority: 2 },
    { rootPlain: "وصل",   group: "Reaching",       priority: 2 },
    { rootPlain: "حضر",   group: "Attending / showing up", priority: 2 },
  ],
  return: [
    { rootPlain: "رجع",   group: "Most common",    priority: 1 },
    { rootPlain: "عاد",   group: "Most common",    priority: 1 },
    { rootPlain: "رد",    group: "Giving back",    priority: 2 },
    { rootPlain: "أرجع",  group: "Returning something", priority: 2 },
  ],
  speak: [
    { rootPlain: "تكلم",  group: "Most common",     priority: 1 },
    { rootPlain: "قال",   group: "Saying",           priority: 1 },
    { rootPlain: "حكى",  group: "Narrating",        priority: 2 },
    { rootPlain: "تحدث",  group: "Talking / conversing", priority: 2 },
    { rootPlain: "نطق",   group: "Pronouncing",     priority: 3 },
    { rootPlain: "خاطب",  group: "Addressing",      priority: 3 },
  ],
  say: [
    { rootPlain: "قال",   group: "Most common",    priority: 1 },
    { rootPlain: "تكلم",  group: "Speaking",        priority: 2 },
    { rootPlain: "ذكر",   group: "Mentioning",      priority: 2 },
    { rootPlain: "نطق",   group: "Uttering",        priority: 3 },
  ],
  know: [
    { rootPlain: "عرف",   group: "Most common",       priority: 1 },
    { rootPlain: "علم",   group: "Most common",       priority: 1 },
    { rootPlain: "فهم",   group: "Understanding",     priority: 2 },
    { rootPlain: "أدرك",  group: "Realizing / grasping", priority: 2 },
    { rootPlain: "درى",  group: "Being aware",       priority: 3 },
  ],
  learn: [
    { rootPlain: "تعلم",  group: "Most common",   priority: 1 },
    { rootPlain: "درس",   group: "Studying",       priority: 1 },
    { rootPlain: "عرف",   group: "Getting to know", priority: 2 },
    { rootPlain: "فقه",   group: "Comprehending deeply", priority: 3 },
  ],
  teach: [
    { rootPlain: "علم",   group: "Most common",   priority: 1 },
    { rootPlain: "درس",   group: "Teaching / giving lessons", priority: 1 },
    { rootPlain: "لقن",   group: "Instructing / drilling", priority: 2 },
    { rootPlain: "أدب",   group: "Educating / disciplining", priority: 3 },
  ],
  eat: [
    { rootPlain: "أكل",   group: "Most common",   priority: 1 },
    { rootPlain: "تناول", group: "Consuming",      priority: 2 },
    { rootPlain: "التهم", group: "Devouring",      priority: 3 },
  ],
  drink: [
    { rootPlain: "شرب",   group: "Most common",    priority: 1 },
    { rootPlain: "ارتشف", group: "Sipping",         priority: 3 },
  ],
  read: [
    { rootPlain: "قرأ",   group: "Most common",    priority: 1 },
    { rootPlain: "تلا",   group: "Reciting",        priority: 2 },
    { rootPlain: "طالع",  group: "Perusing / browsing", priority: 2 },
    { rootPlain: "درس",   group: "Studying",        priority: 2 },
  ],
  open: [
    { rootPlain: "فتح",   group: "Most common",   priority: 1 },
    { rootPlain: "كشف",   group: "Uncovering",    priority: 2 },
  ],
  close: [
    { rootPlain: "أغلق",  group: "Most common",   priority: 1 },
    { rootPlain: "سد",    group: "Blocking / sealing", priority: 2 },
    { rootPlain: "أقفل",  group: "Locking",        priority: 2 },
  ],
  begin: [
    { rootPlain: "بدأ",   group: "Most common",    priority: 1 },
    { rootPlain: "شرع",   group: "Commencing",     priority: 2 },
    { rootPlain: "استهل", group: "Initiating / opening", priority: 3 },
  ],
  finish: [
    { rootPlain: "أنهى",  group: "Most common",    priority: 1 },
    { rootPlain: "أتم",   group: "Completing",     priority: 1 },
    { rootPlain: "انتهى", group: "Coming to an end", priority: 2 },
    { rootPlain: "فرغ",   group: "Being done",     priority: 3 },
  ],
  make: [
    { rootPlain: "صنع",   group: "Most common",   priority: 1 },
    { rootPlain: "جعل",   group: "Making / causing", priority: 1 },
    { rootPlain: "عمل",   group: "Working / making", priority: 1 },
    { rootPlain: "أنشأ",  group: "Creating / establishing", priority: 2 },
    { rootPlain: "بنى",   group: "Building",        priority: 2 },
  ],
  sit: [
    { rootPlain: "جلس",   group: "Most common",   priority: 1 },
    { rootPlain: "قعد",   group: "Sitting down",   priority: 2 },
  ],
  stand: [
    { rootPlain: "قام",   group: "Most common",   priority: 1 },
    { rootPlain: "وقف",   group: "Standing / stopping", priority: 1 },
  ],
  take: [
    { rootPlain: "أخذ",   group: "Most common",   priority: 1 },
    { rootPlain: "حمل",   group: "Carrying",       priority: 2 },
    { rootPlain: "نال",   group: "Obtaining",       priority: 3 },
  ],
  give: [
    { rootPlain: "أعطى",  group: "Most common",    priority: 1 },
    { rootPlain: "منح",   group: "Granting",        priority: 2 },
    { rootPlain: "وهب",   group: "Bestowing",       priority: 3 },
  ],
  find: [
    { rootPlain: "وجد",   group: "Most common",    priority: 1 },
    { rootPlain: "اكتشف", group: "Discovering",     priority: 2 },
    { rootPlain: "عثر",   group: "Stumbling upon",  priority: 2 },
  ],
  think: [
    { rootPlain: "فكر",   group: "Most common",    priority: 1 },
    { rootPlain: "ظن",    group: "Supposing / guessing", priority: 2 },
    { rootPlain: "حسب",   group: "Reckoning",       priority: 2 },
    { rootPlain: "تأمل",  group: "Contemplating",   priority: 3 },
  ],
  ask: [
    { rootPlain: "سأل",   group: "Most common",   priority: 1 },
    { rootPlain: "طلب",   group: "Requesting",     priority: 2 },
    { rootPlain: "استفسر", group: "Inquiring",      priority: 3 },
  ],
  fear: [
    { rootPlain: "خاف",   group: "Most common",   priority: 1 },
    { rootPlain: "خشي",   group: "Fearing / dreading", priority: 2 },
    { rootPlain: "رهب",   group: "Being in awe",  priority: 3 },
  ],
  work: [
    { rootPlain: "عمل",   group: "Most common",   priority: 1 },
    { rootPlain: "اشتغل", group: "Being occupied", priority: 2 },
    { rootPlain: "كدح",   group: "Toiling",        priority: 3 },
  ],
  send: [
    { rootPlain: "أرسل",  group: "Most common",   priority: 1 },
    { rootPlain: "بعث",   group: "Dispatching",    priority: 2 },
  ],
  enter: [
    { rootPlain: "دخل",   group: "Most common",   priority: 1 },
    { rootPlain: "ولج",   group: "Entering (literary)", priority: 3 },
  ],
  kill: [
    { rootPlain: "قتل",   group: "Most common",   priority: 1 },
  ],
  sleep: [
    { rootPlain: "نام",   group: "Most common",   priority: 1 },
    { rootPlain: "رقد",   group: "Lying down / resting", priority: 2 },
  ],
  pray: [
    { rootPlain: "صلى",   group: "Most common",   priority: 1 },
    { rootPlain: "دعا",   group: "Supplicating",   priority: 2 },
    { rootPlain: "عبد",   group: "Worshipping",    priority: 2 },
  ],
  love: [
    { rootPlain: "حب",    group: "Most common",   priority: 1 },
    { rootPlain: "عشق",   group: "Passionate love", priority: 2 },
    { rootPlain: "ود",    group: "Liking / wishing well", priority: 2 },
  ],
  hear: [
    { rootPlain: "سمع",   group: "Most common",   priority: 1 },
    { rootPlain: "أصغى",  group: "Listening attentively", priority: 2 },
    { rootPlain: "استمع", group: "Listening",       priority: 2 },
  ],
  use: [
    { rootPlain: "استخدم", group: "Most common",   priority: 1 },
    { rootPlain: "استعمل", group: "Utilizing",      priority: 1 },
  ],
  want: [
    { rootPlain: "أراد",  group: "Most common",   priority: 1 },
    { rootPlain: "رغب",   group: "Desiring",       priority: 2 },
    { rootPlain: "شاء",   group: "Wishing / willing", priority: 2 },
    { rootPlain: "تمنى",  group: "Wishing for",    priority: 3 },
  ],
  carry: [
    { rootPlain: "حمل",   group: "Most common",   priority: 1 },
    { rootPlain: "نقل",   group: "Transporting",   priority: 2 },
  ],
  break: [
    { rootPlain: "كسر",   group: "Most common",   priority: 1 },
    { rootPlain: "حطم",   group: "Smashing / shattering", priority: 2 },
  ],
  fight: [
    { rootPlain: "قاتل",  group: "Most common",    priority: 1 },
    { rootPlain: "حارب",  group: "Waging war",      priority: 2 },
    { rootPlain: "جاهد",  group: "Struggling / striving", priority: 2 },
    { rootPlain: "ناضل",  group: "Struggling (political)", priority: 3 },
  ],
};

function stem(word: string): string {
  if (word.length <= 2) return word;
  const irr = IRREGULAR_STEMS[word];
  if (irr) return irr;

  if (word.endsWith("ies") && word.length > 4)
    return word.slice(0, -3) + "y";
  if (word.endsWith("ied") && word.length > 4)
    return word.slice(0, -3) + "y";
  if (word.endsWith("ying"))
    return word.slice(0, -4) + "y";

  if (word.endsWith("sses"))
    return word.slice(0, -2);
  if (word.endsWith("ness"))
    return word.slice(0, -4);
  if (word.endsWith("ment"))
    return word.slice(0, -4);
  if (word.endsWith("tion"))
    return word.slice(0, -4) + "te";
  if (word.endsWith("ation") && word.length > 6)
    return word.slice(0, -5) + "e";

  if (word.endsWith("ing") && word.length > 4) {
    const base = word.slice(0, -3);
    if (/([a-z])\1$/.test(base) && base.length > 2)
      return base.slice(0, -1);
    if (base.length >= 2) return base.endsWith("e") ? base : base;
    return word;
  }

  if (word.endsWith("ed") && word.length > 3) {
    const base = word.slice(0, -2);
    if (/([a-z])\1$/.test(base) && base.length > 2)
      return base.slice(0, -1);
    if (word.endsWith("ied"))
      return word.slice(0, -3) + "y";
    if (base.length >= 2) return base;
    return word;
  }

  if (word.endsWith("er") && word.length > 3) {
    const base = word.slice(0, -2);
    if (/([a-z])\1$/.test(base) && base.length > 2)
      return base.slice(0, -1);
    return base.length >= 2 ? base : word;
  }

  if (word.endsWith("es") && word.length > 3)
    return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3)
    return word.slice(0, -1);

  return word;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w))
    .map(stem);
}

function glossWords(gloss: string): string[] {
  return gloss
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w))
    .map(stem);
}

function freqScore(freq: number): number {
  return (5 - Math.min(freq, 4)) * 2;
}

function formScore(form: number): number {
  return form === 1 ? 4 : 0;
}

function ilrScore(ilr: string): number {
  const map: Record<string, number> = {
    "0+": 6, "1": 5, "1+": 4, "2": 3, "2+": 2, "3": 1, "3+": 0,
  };
  return map[ilr] ?? 0;
}

let _synonymStemMap: Map<string, string[]> | null = null;

function getSynonymStemMap(): Map<string, string[]> {
  if (_synonymStemMap) return _synonymStemMap;
  _synonymStemMap = new Map();
  for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
    const stemmedKey = stem(key.toLowerCase());
    const existing = _synonymStemMap.get(stemmedKey) || [];
    for (const s of syns) {
      const stemmedSyn = tokenize(s);
      for (const ss of stemmedSyn) {
        if (!existing.includes(ss)) existing.push(ss);
      }
    }
    _synonymStemMap.set(stemmedKey, existing);
    if (stemmedKey !== key.toLowerCase()) {
      const existingRaw = _synonymStemMap.get(key.toLowerCase()) || [];
      for (const s of syns) {
        const stemmedSyn = tokenize(s);
        for (const ss of stemmedSyn) {
          if (!existingRaw.includes(ss)) existingRaw.push(ss);
        }
      }
      _synonymStemMap.set(key.toLowerCase(), existingRaw);
    }
  }
  return _synonymStemMap;
}

export function expandEnglishQueryWithSynonyms(query: string): string[] {
  const stemmed = tokenize(query);
  if (stemmed.length === 0) return [];

  const synMap = getSynonymStemMap();
  const expanded = new Set<string>();
  for (const t of stemmed) {
    const syns = synMap.get(t);
    if (syns) {
      for (const s of syns) {
        expanded.add(s);
      }
    }
  }

  for (const t of stemmed) expanded.delete(t);
  return Array.from(expanded);
}

interface ScoredCandidate {
  root: string;
  form: number;
  formLabel: string;
  gloss: string;
  tr: string;
  freq: number;
  ilr: string;
  score: number;
  matchType: "exact" | "normalized" | "synonym";
}

function scoreEntry(
  entry: GlossEntry,
  primaryTokens: string[],
  synonymTokens: string[],
): ScoredCandidate | null {
  const gWords = glossWords(entry.gloss);
  if (gWords.length === 0) return null;

  let matchScore = 0;
  let matchType: "exact" | "normalized" | "synonym" = "synonym";

  const exactFull = primaryTokens.every(t => gWords.includes(t));
  if (exactFull) {
    matchScore += 20;
    if (primaryTokens.length === gWords.length) matchScore += 5;
    matchType = "exact";
  } else {
    let matched = 0;
    for (const t of primaryTokens) {
      if (gWords.includes(t)) {
        matched++;
        matchScore += 6;
        matchType = matchType === "synonym" ? "normalized" : matchType;
      } else {
        for (const gw of gWords) {
          if (gw.startsWith(t) || t.startsWith(gw)) {
            matched++;
            matchScore += 3;
            matchType = matchType === "synonym" ? "normalized" : matchType;
            break;
          }
        }
      }
    }

    if (matched === 0 && synonymTokens.length > 0) {
      for (const s of synonymTokens) {
        if (gWords.includes(s)) {
          matched++;
          matchScore += 4;
        } else {
          for (const gw of gWords) {
            if (gw.startsWith(s) || s.startsWith(gw)) {
              matched++;
              matchScore += 2;
              break;
            }
          }
        }
      }
    }

    if (matched === 0) return null;
  }

  const totalScore =
    matchScore +
    freqScore(entry.freq) +
    formScore(entry.form) +
    ilrScore(entry.ilr);

  return {
    root: entry.root,
    form: entry.form,
    formLabel: FORM_LABELS[entry.form] || String(entry.form),
    gloss: entry.gloss,
    tr: entry.tr,
    freq: entry.freq,
    ilr: entry.ilr,
    score: totalScore,
    matchType,
  };
}

function stripDiacritics(s: string): string {
  return s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, "");
}

function findSemanticGroup(root: string, queryKey: string): SemanticEntry | undefined {
  const groups = SEMANTIC_GROUPS[queryKey];
  if (!groups) return undefined;
  const plain = stripDiacritics(root);
  return groups.find(g => g.rootPlain === plain || stripDiacritics(g.rootPlain) === plain);
}

export function groupEnglishSearchResults(
  candidates: ScoredCandidate[],
  queryKey: string,
): SearchGroup[] {
  const seen = new Set<string>();
  const groupMap = new Map<string, { priority: number; results: GroupedResultEntry[] }>();

  for (const c of candidates) {
    const key = c.root + "|" + c.form;
    if (seen.has(key)) continue;
    seen.add(key);

    const sem = findSemanticGroup(c.root, queryKey);
    const groupLabel = sem?.group ?? (c.matchType === "synonym" ? "Related meanings" : "Other results");
    const groupPriority = sem?.priority ?? (c.matchType === "exact" ? 1 : c.matchType === "normalized" ? 2 : 5);

    if (!groupMap.has(groupLabel)) {
      groupMap.set(groupLabel, { priority: groupPriority, results: [] });
    }
    const g = groupMap.get(groupLabel)!;

    g.results.push({
      root: c.root,
      form: c.form,
      formLabel: c.formLabel,
      gloss: c.gloss,
      tr: c.tr,
      freq: c.freq,
      score: c.score,
      matchType: c.matchType,
    });
  }

  const groups: SearchGroup[] = [];
  for (const [label, data] of groupMap) {
    data.results.sort((a, b) => b.score - a.score);
    groups.push({
      label,
      priority: data.priority,
      results: data.results.slice(0, 5),
    });
  }

  groups.sort((a, b) => a.priority - b.priority || b.results[0]?.score - a.results[0]?.score);

  return groups;
}

export function searchEnglishGrouped(query: string, limit = 30): GroupedSearchResult {
  const normalizedQuery = query.trim().toLowerCase();
  const primaryTokens = tokenize(query);
  if (primaryTokens.length === 0) {
    return { query, normalizedQuery, expandedQueries: [], groups: [] };
  }

  const synonymTokens = expandEnglishQueryWithSynonyms(query);
  const allExpandedWords = synonymTokens.length > 0
    ? synonymTokens.map(s => s)
    : [];

  const index = buildIndex();
  const candidates: ScoredCandidate[] = [];

  for (const entry of index) {
    const result = scoreEntry(entry, primaryTokens, synonymTokens);
    if (result) candidates.push(result);
  }

  candidates.sort((a, b) => b.score - a.score);
  const topCandidates = candidates.slice(0, limit);

  const queryKey = primaryTokens.length === 1 ? primaryTokens[0] : normalizedQuery;
  const groups = groupEnglishSearchResults(topCandidates, queryKey);

  return {
    query,
    normalizedQuery,
    expandedQueries: allExpandedWords,
    groups,
  };
}

export function searchEnglish(query: string, limit = 20): EnglishSearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const index = buildIndex();
  const results: EnglishSearchResult[] = [];

  for (const entry of index) {
    const gWords = glossWords(entry.gloss);
    if (gWords.length === 0) continue;

    let matchScore = 0;

    const exactFull = tokens.every(t => gWords.includes(t));
    if (exactFull) {
      matchScore += 20;
      if (tokens.length === gWords.length) matchScore += 5;
    } else {
      let matched = 0;
      for (const t of tokens) {
        if (gWords.includes(t)) {
          matched++;
          matchScore += 6;
        } else {
          for (const gw of gWords) {
            if (gw.startsWith(t) || t.startsWith(gw)) {
              matched++;
              matchScore += 3;
              break;
            }
          }
        }
      }
      if (matched === 0) continue;
    }

    const totalScore =
      matchScore +
      freqScore(entry.freq) +
      formScore(entry.form) +
      ilrScore(entry.ilr);

    results.push({
      root: entry.root,
      form: entry.form,
      formLabel: FORM_LABELS[entry.form] || String(entry.form),
      gloss: entry.gloss,
      tr: entry.tr,
      freq: entry.freq,
      ilr: entry.ilr,
      score: totalScore,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function isEnglishInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const latinCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  return latinCount / trimmed.replace(/\s/g, "").length > 0.5;
}
