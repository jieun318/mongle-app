// B 묶음(0021) 신규 항목·키워드 변경 검증. 사용: node validate.mjs <dict-now.json>
//   dict-now.json: 지금 운영 DB 의 dream_items 전체(anon REST 로 받은 것).
import fs from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const root = path.resolve(dir, "../../../..");
const dict = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const byId = Object.fromEntries(dict.map((i) => [i.id, i]));
const items = JSON.parse(fs.readFileSync(path.join(dir, "new.json"), "utf8"));
const kwChanges = JSON.parse(fs.readFileSync(path.join(dir, "keywords.json"), "utf8"));

// lib/luck.ts 의 기준값을 그대로 읽는다(규칙이 바뀌면 검증도 따라간다).
const luckSrc = fs.readFileSync(path.join(root, "lib/luck.ts"), "utf8");
const GOOD = Number(luckSrc.match(/LUCK_GOOD_MIN = (\d+)/)[1]);
const BAD = Number(luckSrc.match(/LUCK_BAD_MAX = (\d+)/)[1]);
const byLuck = (n) => (n >= GOOD ? "길몽" : n <= BAD ? "흉몽" : "보통");

const sent = (d) => (d.trim().match(/[^.!?。]+[.!?。]+(?=\s|$)|[^.!?。]+$/g) || []).map((s) => s.trim()).filter(Boolean);
const bigr = (s) => { s = s.replace(/\s+/g, ""); const o = new Set(); for (let i = 0; i < s.length - 1; i++) o.add(s.slice(i, i + 2)); return o; };
const ovl = (x, y) => { const A = bigr(x), B = bigr(y); let n = 0; for (const v of A) if (B.has(v)) n++; return n / Math.max(1, Math.min(A.size, B.size)); };
const NEG = /손실|손해|근심|걱정|조심|주의|잃|다툼|막히|실패|구설|불화|좌절|어려움|불안|부담|견제/;
// 겁주지 않는 톤 — 사고·납치·수술 꿈에서 쓰지 않을 말
const SCARY = /죽음|사망|목숨|피투성이|끔찍|참혹|재앙|화를 입|큰 화|불길|액운이 닥/;
const MOODS = new Set(dict.flatMap((d) => d.mood_tags ?? []).filter((t) => typeof t === "string"));
const CATS = new Set(dict.map((d) => d.category_id));

const fails = [];
const f = (id, m) => fails.push([id, m]);
const titles = new Set(dict.map((d) => d.title));
const seen = new Set();
for (const it of items) {
  const id = it.id;
  if (seen.has(id)) f(id, "id 중복"); seen.add(id);
  if (byId[id]) f(id, "이미 DB 에 있는 id");
  if (!id.startsWith(it.category_id + "-")) f(id, "id 접두어와 category_id 불일치");
  if (!CATS.has(it.category_id)) f(id, "없는 카테고리");
  if (titles.has(it.title)) f(id, "DB 에 같은 제목 있음"); titles.add(it.title);
  if (!/꿈$/.test(it.title)) f(id, "제목이 ~꿈으로 끝나지 않음");
  if (!it.emoji) f(id, "emoji 없음");

  // 판정: lib/luck.ts 점수 규칙 = 의도한 배지 = 앱 badgeOf(태그·is_lucky) 결과
  if (byLuck(it.luck_index) !== it.badge) f(id, `점수 ${it.luck_index} → ${byLuck(it.luck_index)} (의도 ${it.badge})`);
  const hasG = it.tags.includes("길몽"), hasB = it.tags.includes("흉몽");
  if (it.badge === "길몽" && (!hasG || hasB)) f(id, "길몽인데 tags 가 맞지 않음");
  if (it.badge === "흉몽" && (!hasB || hasG)) f(id, "흉몽인데 tags 가 맞지 않음");
  if (it.badge === "보통" && (hasG || hasB || it.tags.includes("태몽"))) f(id, "보통인데 길몽·흉몽·태몽 태그");

  const d = it.description;
  const ss = sent(d);
  if (ss.length < 3 || ss.length > 4) f(id, `문장 수 ${ss.length}`);
  if (!ss.every((s) => /다\.$/.test(s))) f(id, "'~다.'로 끝나지 않는 문장");
  if (/요\.|니다\.|습니다/.test(d)) f(id, "해요체/합쇼체 섞임");
  const p = it.preview;
  if (p.length < 20 || p.length > 35) f(id, `요약 길이 ${p.length}자`);
  if (!/(꿈|길몽|흉몽)$/.test(p)) f(id, "요약이 ~꿈/~길몽/~흉몽으로 끝나지 않음");
  if (it.badge === "길몽" && !/길몽$/.test(p)) f(id, "길몽인데 요약이 길몽으로 끝나지 않음");
  if (it.badge === "흉몽" && !/흉몽$/.test(p)) f(id, "흉몽인데 요약이 흉몽으로 끝나지 않음");
  if (it.badge === "보통" && /길몽|흉몽/.test(p + d)) f(id, "보통인데 길몽/흉몽 단정");
  if (it.badge === "길몽" && /흉몽/.test(d)) f(id, "길몽인데 본문에 '흉몽'");
  if (it.badge === "흉몽" && /길몽/.test(d)) f(id, "흉몽인데 본문에 '길몽'");
  if (it.badge === "흉몽" && !ss.some((s) => NEG.test(s))) f(id, "흉몽인데 주의 문장 없음");
  if (d.includes(p)) f(id, "본문에 요약 문장이 그대로 들어감");
  const mo = Math.max(0, ...ss.map((s) => ovl(p, s)));
  if (mo >= 0.6) f(id, `요약 반복 (최대 겹침 ${mo.toFixed(2)})`);
  if (/납치|교통사고|수술/.test(it.title) && SCARY.test(p + d)) f(id, `겁주는 표현: ${(p + d).match(SCARY)[0]}`);

  if (!Array.isArray(it.conditions) || it.conditions.length < 1) f(id, "conditions 없음");
  for (const c of it.conditions) {
    if (!c.if || !c.then) f(id, "conditions 형식 {if, then}");
    for (const s of ss.slice(2)) { const v = ovl(c.if, s); if (v >= 0.5) f(id, `조건 반복 (${v.toFixed(2)}): ${c.if}`); }
  }
  for (const m of it.mood_tags) if (!MOODS.has(m)) f(id, `처음 쓰는 mood_tag: ${m}`);
  if (it.keywords.length < 3) f(id, "keywords 3개 미만");
}

for (const k of kwChanges) {
  const cur = byId[k.id];
  if (!cur) { f(k.id, "키워드 변경 대상이 DB 에 없음"); continue; }
  for (const r of k.remove) if (!cur.keywords.includes(r)) f(k.id, `지울 키워드가 없음: ${r}`);
  for (const a of k.add) if (cur.keywords.includes(a)) f(k.id, `이미 있는 키워드: ${a}`);
}

const bad = new Set(fails.map((x) => x[0]));
for (const [id, m] of fails) console.log(`FAIL ${id.padEnd(14)} ${m}`);
const dist = items.reduce((a, i) => ((a[i.badge] = (a[i.badge] || 0) + 1), a), {});
console.log(`\n신규 ${items.length}건 (${Object.entries(dist).map(([k, v]) => `${k} ${v}`).join(" · ")}) · 키워드 변경 ${kwChanges.length}건 · 실패 ${bad.size}`);
process.exitCode = bad.size ? 1 : 0;
