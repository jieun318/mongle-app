import { Platform } from "react-native";

// 오래된 안드로이드에서 최신 이모지가 네모(□)로 깨지는 것을 막는다.
//
// 안드로이드는 기기에 들어 있는 이모지 폰트(Noto Color Emoji)로만 이모지를 그려서,
// 그 OS 버전 이후에 추가된 이모지는 그리지 못한다. Android 9(API 28, 갤럭시 S8 등)는
// Emoji 11 까지, Android 10(API 29)은 Emoji 12 까지 …. 그래서 기본은 원래 이모지를 쓰고,
// 그 이모지를 처음 탑재한 API 보다 낮은 기기에서만 대체 이모지로 바꿔 그린다.
//
// - 사전 데이터·AI 메타(꿈 대표 이모지)·채팅 문구에 실제로 쓰이는 Emoji 12+ 는 FALLBACK 에
//   의미가 가까운 Emoji 11 이하 이모지를 지정했다.
// - 그 밖의 Emoji 12+ (AI 가 새로 고른 것 등)는 DEFAULT_FALLBACK 으로 그린다.
// - iOS·웹은 손대지 않는다(iOS 배포 안 함, 웹은 OS 폰트가 최신).
//
// SINCE_API 는 생성 파일 — 유니코드 emoji-test.txt (18.0, 2026-04-30,) 기준,
// 피부색 변형 제외 283개. 다시 만들려면 scripts/gen-emoji-compat.mjs 를 돌린다(이 파일을 직접 고치지 말 것,
// FALLBACK 은 고쳐도 된다).

/** 대체표에 없는 최신 이모지를 그릴 때 */
const DEFAULT_FALLBACK = "🌙";

/** Emoji 12 이상 → 오래된 기기에서 대신 그릴 이모지 (Emoji 11 이하) */
export const FALLBACK: Record<string, string> = {
  "🩸": "🔴",
  "🪂": "😱",
  "🩹": "🤕",
  "🪱": "🐛",
  "🪞": "🖼️",
  "🪜": "🧗",
  "🪙": "💰",
  "🪨": "⛰️",
  "🧑‍💼": "💼",
  "🧑‍🤝‍🧑": "👫",
  "🫐": "🍒",
  "🟠": "🍊",
  "🦪": "🐚",
  "🤍": "🌼",
  "🐦‍⬛": "🐦",
  "🪟": "🏠",
  "🥷": "🕵️",
  "🪦": "⚰️",
  "🪲": "🐞",
  "🪢": "🧶",
};

/** 이 API 레벨부터 기본 탑재된 이모지(VS16 제거, 공백 구분) */
const SINCE_API: Record<number, string> = {
  29: "🥱 🤎 🤍 🤏 🦾 🦿 🦻 🧏 🧏‍♂ 🧏‍♀ 🧍 🧍‍♂ 🧍‍♀ 🧎 🧎‍♂ 🧎‍♀ 👨‍🦯 👩‍🦯 👨‍🦼 👩‍🦼 👨‍🦽 👩‍🦽 🧑‍🤝‍🧑 🦧 🦮 🐕‍🦺 🦥 🦦 🦨 🦩 🦪 🧄 🧅 🧇 🧆 🧈 🧃 🧉 🧊 🛕 🦽 🦼 🛺 🪂 🪐 🤿 🪀 🪁 🦺 🥻 🩱 🩲 🩳 🩰 🪕 🪔 🪓 🦯 🩸 🩹 🩺 🪑 🪒 🟠 🟡 🟢 🟣 🟤 🟥 🟧 🟨 🟩 🟦 🟪 🟫",
  30: "🥲 🥸 🤌 🫀 🫁 🧑‍🦰 🧑‍🦱 🧑‍🦳 🧑‍🦲 🧑‍⚕ 🧑‍🎓 🧑‍🏫 🧑‍⚖ 🧑‍🌾 🧑‍🍳 🧑‍🔧 🧑‍🏭 🧑‍💼 🧑‍🔬 🧑‍💻 🧑‍🎤 🧑‍🎨 🧑‍✈ 🧑‍🚀 🧑‍🚒 🥷 🤵‍♂ 🤵‍♀ 👰‍♂ 👰‍♀ 👩‍🍼 👨‍🍼 🧑‍🍼 🧑‍🎄 🧑‍🦯 🧑‍🦼 🧑‍🦽 🫂 🐈‍⬛ 🦬 🦣 🦫 🐻‍❄ 🦤 🪶 🦭 🪲 🪳 🪰 🪱 🪴 🫐 🫒 🫑 🫓 🫔 🫕 🫖 🧋 🪨 🪵 🛖 🛻 🛼 🪄 🪅 🪆 🪡 🪢 🩴 🪖 🪗 🪘 🪙 🪃 🪚 🪛 🪝 🪜 🛗 🪞 🪟 🪠 🪤 🪣 🪥 🪦 🪧 ⚧ 🏳‍⚧",
  31: "😶‍🌫 😮‍💨 😵‍💫 ❤‍🔥 ❤‍🩹 🧔‍♂ 🧔‍♀",
  33: "🫠 🫢 🫣 🫡 🫥 🫤 🥹 🫱 🫲 🫳 🫴 🫰 🫵 🫶 🫦 🫅 🫃 🫄 🧌 🪸 🪷 🪹 🪺 🫘 🫗 🫙 🛝 🛞 🛟 🪩 🪫 🩼 🩻 🫧 🪬 🪪 🟰",
  34: "🫨 🩷 🩵 🩶 🫷 🫸 🫎 🫏 🪽 🐦‍⬛ 🪿 🪼 🪻 🫚 🫛 🪭 🪮 🪇 🪈 🪯 🛜",
  35: "🙂‍↔ 🙂‍↕ 🚶‍➡ 🚶‍♀‍➡ 🚶‍♂‍➡ 🧎‍➡ 🧎‍♀‍➡ 🧎‍♂‍➡ 🧑‍🦯‍➡ 👨‍🦯‍➡ 👩‍🦯‍➡ 🧑‍🦼‍➡ 👨‍🦼‍➡ 👩‍🦼‍➡ 🧑‍🦽‍➡ 👨‍🦽‍➡ 👩‍🦽‍➡ 🏃‍➡ 🏃‍♀‍➡ 🏃‍♂‍➡ 🧑‍🧑‍🧒 🧑‍🧑‍🧒‍🧒 🧑‍🧒 🧑‍🧒‍🧒 🐦‍🔥 🍋‍🟩 🍄‍🟫 ⛓‍💥",
  36: "🫫 🫩 🫪 🫯 🫹 🫺 🫈 🧑‍🩰 🫆 🫍 🫌 🪾 🫝 🫜 🛘 🛙 🪋 🪊 🪉 🪎 🪌 🪍 🪏 🫟 🇨🇶",
};

const DEVICE_API =
  Platform.OS === "android" && typeof Platform.Version === "number" ? Platform.Version : Number.POSITIVE_INFINITY;

let minApi: Map<string, number> | null = null;
let byFirst: Map<string, string[]> | null = null;
function index() {
  if (minApi) return;
  minApi = new Map();
  byFirst = new Map();
  for (const [api, list] of Object.entries(SINCE_API)) {
    for (const e of list.split(" ")) {
      minApi.set(e, Number(api));
      const first = String.fromCodePoint(e.codePointAt(0)!);
      const arr = byFirst.get(first) ?? [];
      arr.push(e);
      byFirst.set(first, arr);
    }
  }
  // 긴 시퀀스(ZWJ)부터 맞춰 본다.
  for (const arr of byFirst.values()) arr.sort((a, b) => b.length - a.length);
}

const strip = (e: string) => e.replace(/\uFE0F/g, "").replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");

/** 이 기기에서 그릴 수 있는 이모지로 — 이모지 하나(데이터의 대표 이모지 등)에 쓴다. */
export function compatEmoji(emoji: string, deviceApi: number = DEVICE_API): string {
  if (!emoji || deviceApi >= 36) return emoji;
  index();
  const key = strip(emoji);
  const need = minApi!.get(key);
  if (!need || deviceApi >= need) return emoji;
  return FALLBACK[key] ?? DEFAULT_FALLBACK;
}

/** 문장 안의 이모지를 이 기기에서 그릴 수 있는 것으로 — 채팅 말풍선 등. */
export function compatText(text: string, deviceApi: number = DEVICE_API): string {
  if (!text || deviceApi >= 36) return text;
  index();
  let out = "";
  let i = 0;
  while (i < text.length) {
    const cp = text.codePointAt(i)!;
    const first = String.fromCodePoint(cp);
    const cands = byFirst!.get(first);
    let matched = "";
    if (cands) {
      const rest = strip(text.slice(i, i + 24));
      matched = cands.find((c) => rest.startsWith(c)) ?? "";
    }
    if (matched) {
      // 원문에서 VS16·피부색까지 포함한 길이만큼 건너뛴다.
      let j = i;
      let consumed = "";
      while (j < text.length && strip(consumed) !== matched) {
        const ch = String.fromCodePoint(text.codePointAt(j)!);
        consumed += ch;
        j += ch.length;
      }
      while (j < text.length && /[\uFE0F\u{1F3FB}-\u{1F3FF}]/u.test(String.fromCodePoint(text.codePointAt(j)!))) {
        j += String.fromCodePoint(text.codePointAt(j)!).length;
      }
      out += compatEmoji(matched, deviceApi);
      i = j;
    } else {
      out += first;
      i += first.length;
    }
  }
  return out;
}
