type Range = { start: number; end: number };

type Detector = {
  kind: string;
  find: (text: string) => Range[];
};

const IIN_W1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const IIN_W2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2];

function isIin(value: string): boolean {
  if (!/^\d{12}$/.test(value)) return false;
  const digits = value.split("").map(Number);
  const control = (weights: number[]) =>
    weights.reduce((sum, w, i) => sum + w * digits[i], 0) % 11;

  let check = control(IIN_W1);
  if (check === 10) check = control(IIN_W2);
  return check !== 10 && check === digits[11];
}

function isIban(value: string): boolean {
  const clean = value.replace(/\s/g, "").toUpperCase();
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  let rest = 0;
  for (const ch of rearranged) {
    const code =
      ch >= "0" && ch <= "9" ? ch : String(ch.charCodeAt(0) - 55);
    rest = Number(`${rest}${code}`) % 97;
  }
  return rest === 1;
}

function isCard(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function isKzPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (digits[0] !== "7" && digits[0] !== "8") return false;
  return digits[1] === "7";
}

const NAME_UPPER = "A-ZА-ЯЁӘҒҚҢӨҰҮҺІ";
const NAME_LOWER = "a-zа-яёәғқңөұүһі";
const NAME_WORD = `[${NAME_UPPER}][${NAME_LOWER}]+`;
const NAME_TOKEN = `(?:${NAME_WORD}|[${NAME_UPPER}]\\.)`;
const NAME_RUN = new RegExp(
  `${NAME_TOKEN}(?:[ \\t\\u00a0]*${NAME_TOKEN})*`,
  "g",
);

const STRONG_NAME =
  /(?:ович|овна|евич|евна|ьевич|ьевна|ична|ұлы|улы|қызы|кызы|тегі|ovich|ovna|evich|evna|uly|ұly|kyzy|qyzy|tegi)$/i;
const WEAK_NAME =
  /(?:ов|ев|ёв|ин|ын|ский|цкий|ова|ева|ёва|ина|ына|ская|цкая|бек|бай|хан|енко|швили|ян|оглы|оглу|ov|ev|in|ova|eva|ina|sky|ski|skaya|bek|bay|baev|enko|shvili|yan|oglu)$/i;

function isAnchor(word: string, strongOnly: boolean): boolean {
  if (word.length < 5) return false;
  if (STRONG_NAME.test(word)) return true;
  return !strongOnly && WEAK_NAME.test(word);
}

function findNames(text: string): Range[] {
  const runRe = new RegExp(NAME_RUN.source, NAME_RUN.flags);
  const out: Range[] = [];
  let run: RegExpExecArray | null;

  while ((run = runRe.exec(text)) !== null) {
    const tokenRe = new RegExp(NAME_TOKEN, "g");
    const tokens: { value: string; start: number; end: number }[] = [];
    let token: RegExpExecArray | null;

    while ((token = tokenRe.exec(run[0])) !== null) {
      const start = run.index + token.index;
      tokens.push({ value: token[0], start, end: start + token[0].length });
    }

    if (tokens.length === 1) {
      if (isAnchor(tokens[0].value, true)) out.push(tokens[0]);
      continue;
    }

    const anchors = tokens.map((t) => isAnchor(t.value, false));
    if (!anchors.some(Boolean)) continue;

    const initial = new RegExp(`^[${NAME_UPPER}]\\.$`);
    tokens.forEach((t, i) => {
      if (anchors[i] || anchors[i - 1] || anchors[i + 1] || initial.test(t.value)) {
        out.push(t);
      }
    });
  }

  return out;
}

function scan(
  text: string,
  source: RegExp,
  accept?: (match: RegExpExecArray) => boolean,
  group = 0,
): Range[] {
  const re = new RegExp(source.source, source.flags);
  const out: Range[] = [];
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match[0] === "") {
      re.lastIndex += 1;
      continue;
    }
    if (accept && !accept(match)) continue;

    const value = match[group];
    if (!value) continue;
    const start = group === 0 ? match.index : match.index + match[0].indexOf(value);
    out.push({ start, end: start + value.length });
  }

  return out;
}

const SENSITIVE_LABELS = [
  "фио",
  "имя",
  "фамили",
  "отчество",
  "дата рождения",
  "место рождения",
  "дата выдачи",
  "срок действия",
  "орган выдачи",
  "дата регистрации",
  "номер",
  "иин",
  "бин",
  "жсн",
  "удостоверени",
  "куәлі",
  "паспорт",
  "адрес",
  "прописка",
  "проживани",
  "местоположение",
  "геолокац",
  "координат",
  "телефон",
  "email",
  "e-mail",
  "почта",
  "семейное положение",
  "супруг",
  "родств",
  "банк",
  "iban",
  "счет",
  "счёт",
  "карт",
  "доход",
  "расход",
  "кредит",
  "платеж",
  "платёж",
  "зарплата",
  "заработная плата",
  "оклад",
  "ипн",
  "налог",
  "табель",
  "договор",
  "полис",
  "страхов",
  "группа крови",
  "аллерг",
  "диагноз",
  "препарат",
  "обследовани",
  "здоров",
  "биометри",
  "отпечат",
  "распознавание лица",
  "голосовой",
  "автомобиль",
  "госномер",
  "номер авто",
  "vin",
  "стс",
  "водительск",
  "категория",
  "telegram",
  "телеграм",
  "instagram",
  "инстаграм",
  "whatsapp",
  "username",
  "никнейм",
  "логин",
  "пароль",
  "код восстановления",
  "секретный вопрос",
  "ответ",
  "ip-адрес",
  "ip адрес",
  "mac",
  "религи",
  "политическ",
  "членство",
  "судимост",
  "семейных отношени",
  "идентификатор",
  "жөн",
  "тегі",
  "туған",
  "күні",
  "берілген",
  "мерзімі",
  "орган",
  "мекенжай",
  "тірке",
  "отбасы",
  "жұбай",
  "балалар",
  "туыс",
  "нөмір",
  "табыс",
  "шығын",
  "несие",
  "төлем",
  "жалақы",
  "салық",
  "сақтандыру",
  "қан тобы",
  "дәрі",
  "тексеру",
  "денсаулық",
  "саусақ",
  "бетті тану",
  "дауыс",
  "көлік",
  "мемлекеттік нөмір",
  "жүргізуші",
  "санат",
  "пайдаланушы",
  "құпия",
  "қалпына",
  "жауап",
  "жауаб",
  "орналас",
  "діни",
  "саяси",
  "көзқарас",
  "мүшелі",
  "соттылы",
  "name",
  "birth",
  "iin",
  "bin",
  "id card",
  "national id",
  "passport",
  "issue",
  "issuing",
  "expiry",
  "expiration",
  "address",
  "phone",
  "email",
  "marital",
  "spouse",
  "children",
  "relationship",
  "family",
  "bank",
  "card",
  "number",
  "income",
  "expense",
  "loan",
  "payment",
  "salary",
  "tax",
  "employee",
  "employment",
  "contract",
  "insurance",
  "policy",
  "health",
  "blood",
  "allerg",
  "diagnos",
  "medicat",
  "prescri",
  "medical",
  "examination",
  "biometric",
  "fingerprint",
  "facial",
  "voice",
  "identifier",
  "vehicle",
  "license",
  "plate",
  "registration",
  "login",
  "password",
  "recovery",
  "question",
  "answer",
  "driver",
  "category",
  "location",
  "religio",
  "politic",
  "membership",
  "criminal",
];

function valueLength(rest: string): number {
  const colon = rest.indexOf(":");
  if (colon === -1) return rest.length;

  const head = rest.slice(0, colon);
  const nextLabel = new RegExp(`\\s[A-Z${NAME_UPPER}]\\S*`, "g");
  let cut = -1;
  let m: RegExpExecArray | null;
  while ((m = nextLabel.exec(head)) !== null) cut = m.index;

  return cut === -1 ? rest.length : cut;
}

export function isSensitiveLabel(text: string): boolean {
  const label = text.trim().replace(/[:№\s]+$/, "").toLowerCase();
  if (!label || label.length > 60) return false;
  return SENSITIVE_LABELS.some((key) => label.includes(key));
}

export function maskAll(text: string): string {
  return text.replace(/\S/g, "*");
}

function findLabeledValues(text: string): Range[] {
  const out: Range[] = [];
  let offset = 0;

  for (const line of text.split("\n")) {
    const colon = line.indexOf(":");
    if (colon > 0 && colon <= 60) {
      const head = line.slice(0, colon).toLowerCase();
      const label = head.slice(head.lastIndexOf(",") + 1);
      if (SENSITIVE_LABELS.some((key) => label.includes(key))) {
        const rest = line.slice(colon + 1);
        const lead = rest.length - rest.trimStart().length;
        const value = rest.slice(lead, lead + valueLength(rest.slice(lead)));
        const trimmed = value.trimEnd();
        if (trimmed) {
          const start = offset + colon + 1 + lead;
          out.push({ start, end: start + trimmed.length });
        }
      }
    }
    offset += line.length + 1;
  }

  return out;
}

const DETECTORS: Detector[] = [
  {
    kind: "iban",
    find: (text) =>
      scan(text, /\bKZ[\dA-Z]{18}\b/gi, (m) => isIban(m[0])),
  },
  {
    kind: "card",
    find: (text) =>
      scan(text, /\b\d{4}(?:[ -]?\d{4}){2,4}\b/g, (m) => isCard(m[0])),
  },
  {
    kind: "iin",
    find: (text) => scan(text, /\b\d{12}\b/g, (m) => isIin(m[0])),
  },
  {
    kind: "phone",
    find: (text) =>
      scan(
        text,
        /(?:\+7|\b8)[\s\-().]*(?:\d[\s\-().]*){10}/g,
        (m) => isKzPhone(m[0]),
      ),
  },
  {
    kind: "email",
    find: (text) => scan(text, /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g),
  },
  {
    kind: "ip",
    find: (text) =>
      scan(
        text,
        /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        (m) => m[0].split(".").every((part) => Number(part) < 256),
      ),
  },
  {
    kind: "token",
    find: (text) =>
      scan(text, /\beyJ[\w-]+\.[\w-]+\.[\w-]+|\bsk-[A-Za-z0-9]{16,}/g),
  },
  {
    kind: "plate",
    find: (text) =>
      scan(text, /(?<![0-9A-Za-zА-Яа-я])\d{3}\s?[A-ZА-Я]{3}\s?\d{2}(?![0-9A-Za-zА-Яа-я])/g),
  },
  {
    kind: "docId",
    find: (text) =>
      scan(
        text,
        /(?:удостоверени\w*|уд\.|паспорт\w*|куәлі\w*)[^\d\n]{0,24}(\d{8,9})/gi,
        undefined,
        1,
      ),
  },
  {
    kind: "cvv",
    find: (text) => scan(text, /(?:cvv2?|cvc2?)[^\d\n]{0,8}(\d{3,4})/gi, undefined, 1),
  },
  {
    kind: "name",
    find: findNames,
  },
  {
    kind: "date",
    find: (text) =>
      scan(text, /\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g),
  },
  {
    kind: "coords",
    find: (text) =>
      scan(text, /-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/g),
  },
  {
    kind: "mac",
    find: (text) => scan(text, /\b[\dA-F]{2}(?::[\dA-F]{2}){5}\b/gi),
  },
  {
    kind: "handle",
    find: (text) => scan(text, /(?<![\w@./])@[A-Za-z\d_.]{3,}/g),
  },
  {
    kind: "vin",
    find: (text) =>
      scan(
        text,
        /\b[A-HJ-NPR-Z\d]{17}\b/g,
        (m) => /\d{2}/.test(m[0]) && /[A-Z]{2}/.test(m[0]),
      ),
  },
  {
    kind: "label",
    find: findLabeledValues,
  },
];

export function maskSensitive(text: string): string {
  const found: Range[] = [];
  for (const detector of DETECTORS) found.push(...detector.find(text));
  if (found.length === 0) return text;

  const chars = text.split("");
  for (const { start, end } of found) {
    for (let i = start; i < end; i += 1) {
      if (!/\s/.test(chars[i])) chars[i] = "*";
    }
  }

  return chars.join("");
}
