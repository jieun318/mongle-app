import { CATEGORIES, type DreamItem } from "@/features/dream/dreamData";

// 꿈 사전 검색 — useSearchDreamItems(dreamQueries.ts)가 쓰는 순수 함수.
// React Native 에 의존하지 않아 커버리지 점검 스크립트도 같은 코드를 돌린다.
//
// 2026-10-01 커버리지 점검(자주 찾는 키워드 100개)에서 드러난 문제를 고친다.
// - 표현 차이: "이빨 빠지는"이 "이빨이 몽땅 빠지는 꿈"을, "전 애인"이 "헤어진 연인"을 못 찾음
//   → 띄어쓴 단어를 각각 찾고(모두 포함), "~는" 어미는 어간으로도, 자주 쓰는 말은 동의어로도 찾는다.
// - 한 글자 과다 매칭: "물" 181건(카테고리명 "동물"), "비"(신비/영적), "해"(요약의 "해몽")
//   → 한 글자는 제목의 낱말 시작·키워드 전체 일치에서만, 카테고리는 이름이 통째로 같을 때만.

// 검색어 전체가 이 말이면 다른 말로 바꿔 찾는다 (붙여쓰기·줄임말 포함, 공백 제거 후 비교).
const PHRASE_SYNONYMS: Record<string, string> = {
  전애인: "헤어진 연인",
  전남친: "헤어진 연인",
  전남자친구: "헤어진 연인",
  전여친: "헤어진 연인",
  전여자친구: "헤어진 연인",
  옛애인: "헤어진 연인",
  옛연인: "헤어진 연인",
  헤어진애인: "헤어진 연인",
  돌아가신할머니: "돌아가신",
  돌아가신할아버지: "돌아가신",
  돌아가신부모님: "돌아가신",
  돌아가신엄마: "돌아가신",
  돌아가신아빠: "돌아가신",
  모르는사람: "낯선",
  이빠지는: "이빨 빠지",
};

// 단어 하나를 찾을 때 함께 볼 말 (어간 기준).
const TOKEN_SYNONYMS: Record<string, string[]> = {
  이빨: ["이가", "치아"],
  엄마: ["어머니", "부모"],
  어머니: ["엄마", "부모"],
  아빠: ["아버지", "부모"],
  아버지: ["아빠", "부모"],
  로또: ["복권"],
  장례식: ["장례", "상여", "상복", "문상", "상가"],
  장례: ["상여", "상복", "문상", "상가"],
  모르: ["낯선"],
  출산: ["낳"],
  다치: ["다쳐", "상처"],
  날아다니: ["날아", "하늘을 나", "날개"],
  싸우: ["싸워", "싸움", "다투"],
  홍수: ["큰물", "물이 불어", "물이 차"],
};

const SANITIZE = /[(),"\\%_]/g;

/** 검색어를 단어 목록으로: '#'·끝의 "꿈" 제거, 공백 정리. */
export function tokenize(raw: string): string[] {
  let q = raw.replace(SANITIZE, " ").trim().replace(/^#+/, "").trim();
  const phrase = PHRASE_SYNONYMS[q.replace(/\s+/g, "")];
  if (phrase) q = phrase;
  q = q.replace(/\s*꿈$/, "").trim(); // "돼지꿈", "돼지 꿈" → "돼지"
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

// "~는/~하는" 어미를 떼어 어간으로 (빠지는 → 빠지, 다치는 → 다치, 날아다니는 → 날아다니).
function stem(token: string): string {
  if (token.length >= 3 && token.endsWith("는")) return token.slice(0, -1);
  return token;
}

/** 단어 하나에 대해 찾아볼 말들 — 원형·어간(어디서든)과 동의어(낱말 시작에서만). */
export function variants(token: string): { text: string; wordStart: boolean }[] {
  const s = stem(token);
  const own = [...new Set([token, s])];
  const syn = [...new Set([...(TOKEN_SYNONYMS[token] ?? []), ...(TOKEN_SYNONYMS[s] ?? [])])].filter(
    (v) => !own.includes(v),
  );
  // 동의어는 짧은 것이 많아("이가", "낳") 낱말 중간에 걸리기 쉽다 — "거북이가"의 "이가".
  return [...own.map((text) => ({ text, wordStart: false })), ...syn.map((text) => ({ text, wordStart: true }))];
}

// 낱말 시작(문자열 처음이거나 공백 뒤)에 v 가 있는지. v 에 공백이 있어도 된다("하늘을 나").
function includesAtWordStart(text: string, v: string): boolean {
  let i = text.indexOf(v);
  while (i >= 0) {
    if (i === 0 || /\s/.test(text[i - 1])) return true;
    i = text.indexOf(v, i + 1);
  }
  return false;
}

// 한 글자 단어는 낱말의 시작에서만 맞춘다 — "동물"의 "물", "신비"의 "비"는 안 걸린다.
// 낱말 시작이라도 다른 뜻의 말이 흔한 경우는 아래 목록으로 뺀다
// ("물리는"은 물이 아니라 물다, "해진"은 해가 아니라 해지다). 금덩이·소떼·산꼭대기처럼
// 그 글자로 시작하는 합성어는 살린다. 코피·첫눈처럼 뒤에 붙는 합성어는 못 찾으므로
// 그런 항목은 keywords 로 보강한다.
const SINGLE_CHAR_STOP = [
  "물리", "물려", "물고기", "물건", "물체", "물어", "물든", "물들",
  "해진", "해몽", "해결", "해석", "해도",
  "소원", "소화", "소리", "소식", "소녀", "소년", "소중",
  "새로", "새끼", "새벽",
  "비행", "비밀", "비는", "비단", "비석", "비슷",
  "금방", "금붕어",
  "달려", "달리", "달아", "달콤",
  "불어", "불러", "불안", "불편",
  "집어", "집중",
  "피하", "피어", "피곤",
  "개미", "개구리",
  "말하", "말을 건", "말씀",
  "산소",
  "눈치",
];
function hasWordStart(text: string, v: string): boolean {
  for (const w of text.split(/\s+/)) {
    if (w.startsWith(v) && !SINGLE_CHAR_STOP.some((s) => w.startsWith(s))) return true;
  }
  return false;
}

/**
 * 항목이 검색어에 얼마나 맞는지. 0 = 안 맞음.
 * 3 = 모든 단어가 제목에, 2 = 제목·키워드·태그로 모든 단어가 맞음, 1 = 요약까지 써야 맞음.
 */
export function scoreItem(item: DreamItem, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const title = item.title.toLowerCase();
  const preview = item.preview.toLowerCase();
  const keywords = item.keywords.map((k) => k.toLowerCase());
  const tags = item.tags.map((t) => t.toLowerCase());
  let worst = 3;
  for (const t of tokens) {
    const vs = variants(t);
    const single = t.length === 1;
    const has = (text: string, v: { text: string; wordStart: boolean }) =>
      v.wordStart ? includesAtWordStart(text, v.text) : text.includes(v.text);
    const inTitle = vs.some((v) => (single ? hasWordStart(title, v.text) : has(title, v)));
    // 한 글자는 키워드와 정확히 같을 때만 — "돼지꿈 해몽" 같은 키워드의 "해몽"에 "해"가 걸리지 않게.
    const inKw =
      vs.some((v) => tags.includes(v.text)) ||
      vs.some((v) => keywords.some((k) => (single ? k === v.text : has(k, v))));
    // 요약 본문은 두 글자 이상일 때만 — 한 글자는 "해몽"의 "해"처럼 엉뚱하게 걸린다.
    const inPreview = !single && vs.some((v) => has(preview, v));
    const s = inTitle ? 3 : inKw ? 2 : inPreview ? 1 : 0;
    if (s === 0) return 0;
    worst = Math.min(worst, s);
  }
  return worst;
}

/** 검색 — 맞는 항목을 점수 높은 순(같으면 id 순)으로. */
export function searchDreams(items: DreamItem[], rawQuery: string): DreamItem[] {
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) return [];
  // 카테고리는 이름(또는 "자연/현상"의 "자연"처럼 / 로 나뉜 부분)이 검색어와 통째로 같을 때만.
  const whole = tokens.join(" ");
  const catIds = new Set(
    CATEGORIES.filter((c) => c.label === whole || c.label.split("/").includes(whole) || c.id === whole).map((c) => c.id),
  );
  const scored: { item: DreamItem; score: number }[] = [];
  for (const item of items) {
    const s = Math.max(scoreItem(item, tokens), catIds.has(item.categoryId) ? 1 : 0);
    if (s > 0) scored.push({ item, score: s });
  }
  scored.sort((a, b) => b.score - a.score || (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0));
  return scored.map((x) => x.item);
}
