// lib/emojiCompat.ts 생성기 — emoji-test.txt(유니코드 공식)에서 Emoji 12 이상을 API 레벨별로 묶는다.
// 사용: curl -o emoji-test.txt https://unicode.org/Public/emoji/latest/emoji-test.txt
//       node scripts/gen-emoji-compat.mjs emoji-test.txt
import fs from "node:fs";
if (!process.argv[2]) throw new Error("사용: node scripts/gen-emoji-compat.mjs <emoji-test.txt>");
const src = fs.readFileSync(process.argv[2], "utf8");
const date = (src.match(/# Date: (\S+)/) || [])[1];
const verLine = (src.match(/# Version: (\S+)/) || [])[1];

// 이모지 버전 → 처음 기본 탑재한 안드로이드 API (Noto Color Emoji 기준)
const apiOf = (v) => (v >= 16 ? 36 : v >= 15.1 ? 35 : v >= 15 ? 34 : v >= 14 ? 33 : v >= 13.1 ? 31 : v >= 12.1 ? 30 : v >= 12 ? 29 : 0);
const SKIN = /[\u{1F3FB}-\u{1F3FF}]/u;
const byApi = {};
let n = 0;
for (const line of src.split("\n")) {
  const m = line.match(/^[0-9A-F ]+;\s*fully-qualified\s*#\s*(\S+)\s+E(\d+\.\d+)/);
  if (!m) continue;
  const e = m[1].replace(/\uFE0F/g, "");
  const api = apiOf(Number(m[2]));
  if (!api || SKIN.test(e)) continue; // 피부색 변형은 기본형으로 판정한다(아래 compat 에서 제거)
  (byApi[api] ||= new Set()).add(e);
  n++;
}

// 사전·프롬프트·채팅에서 실제로 쓰는 Emoji 12+ 와 그 대체(Emoji 11 이하) — 의미가 가까운 것으로.
const FALLBACK = {
  "\u{1FA78}": "🔴", // 🩸 피 → 빨간 원
  "\u{1FA82}": "😱", // 🪂 낙하산(추락·떨어지는 꿈)
  "\u{1FA79}": "🤕", // 🩹 반창고(상처가 아무는 꿈)
  "\u{1FAB1}": "🐛", // 🪱 지렁이
  "\u{1FA9E}": "🖼️", // 🪞 거울
  "\u{1FA9C}": "🧗", // 🪜 사다리(계단을 오르는 꿈)
  "\u{1FA99}": "💰", // 🪙 동전(금덩이)
  "\u{1FAA8}": "⛰️", // 🪨 바위(흙·땅)
  "\u{1F9D1}\u200D\u{1F4BC}": "💼", // 🧑‍💼 사무직(높은 관리)
  "\u{1F9D1}\u200D\u{1F91D}\u200D\u{1F9D1}": "👫", // 🧑‍🤝‍🧑 손잡은 사람들(옛 친구)
  "\u{1FAD0}": "🍒", // 🫐 블루베리(대추)
  "\u{1F7E0}": "🍊", // 🟠 주황 원(붉은 감)
  "\u{1F9AA}": "🐚", // 🦪 굴(조개 속 진주)
  "\u{1F90D}": "🌼", // 🤍 흰 하트(하얀 박꽃)
  "\u{1F426}\u200D\u2B1B": "🐦", // 🐦‍⬛ 검은 새(까마귀)
  "\u{1FA9F}": "🏠", // 🪟 창문
  "\u{1F977}": "🕵️", // 🥷 닌자(도둑)
  "\u{1FAA6}": "⚰️", // 🪦 묘비(무덤가)
  "\u{1FAB2}": "🐞", // 🪲 딱정벌레(벌레)
  "\u{1FAA2}": "🧶", // 🪢 매듭(동아줄)
};
for (const k of Object.keys(FALLBACK)) {
  if (!Object.values(byApi).some((s) => s.has(k))) throw new Error("대체표 키가 Emoji 12+ 목록에 없음: " + k);
}
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const lines = Object.keys(byApi).sort((a, b) => a - b).map((api) => `  ${api}: "${esc([...byApi[api]].join(" "))}",`);
const fb = Object.entries(FALLBACK).map(([k, v]) => `  "${k}": "${v}",`).join("\n");

const out = `import { Platform } from "react-native";

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
// SINCE_API 는 생성 파일 — 유니코드 emoji-test.txt (${verLine ?? "latest"}, ${date ?? ""}) 기준,
// 피부색 변형 제외 ${n}개. 다시 만들려면 scripts/gen-emoji-compat.mjs 를 돌린다(이 파일을 직접 고치지 말 것,
// FALLBACK 은 고쳐도 된다).

/** 대체표에 없는 최신 이모지를 그릴 때 */
const DEFAULT_FALLBACK = "🌙";

/** Emoji 12 이상 → 오래된 기기에서 대신 그릴 이모지 (Emoji 11 이하) */
export const FALLBACK: Record<string, string> = {
${fb}
};

/** 이 API 레벨부터 기본 탑재된 이모지(VS16 제거, 공백 구분) */
const SINCE_API: Record<number, string> = {
${lines.join("\n")}
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

const strip = (e: string) => e.replace(/\\uFE0F/g, "").replace(/[\\u{1F3FB}-\\u{1F3FF}]/gu, "");

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
      while (j < text.length && /[\\uFE0F\\u{1F3FB}-\\u{1F3FF}]/u.test(String.fromCodePoint(text.codePointAt(j)!))) {
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
`;
const target = new URL("../lib/emojiCompat.ts", import.meta.url);
fs.writeFileSync(target, out);
console.log(`생성: ${n}개, API별`, Object.fromEntries(Object.entries(byApi).map(([k, s]) => [k, s.size])), `파일 ${fs.statSync(target).size}B`);
