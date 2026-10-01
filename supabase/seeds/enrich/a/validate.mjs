// A 묶음 재작성 결과 검증. 사용: node validate.mjs [out-1.json out-2.json ...]
// 인자를 안 주면 이 폴더의 out-*.json 전부를 input.json 과 대조한다.
import fs from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
// INPUT=rejudge-input.json 처럼 다른 입력을 대조할 수 있다.
const input = JSON.parse(fs.readFileSync(path.join(dir, process.env.INPUT || "input.json"), "utf8"));
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(dir).filter((f) => /^out-\d+\.json$/.test(f)).map((f) => path.join(dir, f));
const outs = files.flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const byId = Object.fromEntries(input.map((i) => [i.id, i]));
const only = new Set(outs.map((o) => o.id));
const scope = process.argv.slice(2).length ? input.filter((i) => only.has(i.id)) : input;

const sent = (d) => (d.trim().match(/[^.!?。]+[.!?。]+(?=\s|$)|[^.!?。]+$/g) || []).map((s) => s.trim()).filter(Boolean);
const bigr = (s) => { s = s.replace(/\s+/g, ""); const o = new Set(); for (let i = 0; i < s.length - 1; i++) o.add(s.slice(i, i + 2)); return o; };
const ovl = (x, y) => { const A = bigr(x), B = bigr(y); let n = 0; for (const v of A) if (B.has(v)) n++; return n / Math.max(1, Math.min(A.size, B.size)); };
const NEG = /손실|근심|걱정|우환|불행|경고|조심|주의|어긋|잃|사고|병|다툼|해롭|흉|위험|막히|막혀|실패|구설|손해|불화|흩어|좌절|시련|어려움|재앙|이별|상처|불안|낭패|틀어|무너|빠져나|기울/;

const fails = [];
const seen = new Map();
for (const o of outs) seen.set(o.id, (seen.get(o.id) || 0) + 1);
for (const [id, n] of seen) if (n > 1) fails.push([id, `중복 출력 ${n}회`]);
for (const o of outs) if (!byId[o.id]) fails.push([o.id, "input 에 없는 id"]);

for (const it of scope) {
  const o = outs.find((x) => x.id === it.id);
  const f = (m) => fails.push([it.id, m]);
  if (!o) { f("출력 없음"); continue; }
  const d = String(o.description_new || "");
  const ss = sent(d);
  if (ss.length < 3 || ss.length > 4) f(`문장 수 ${ss.length}`);
  if (!ss.every((s) => /다\.$/.test(s))) f("'~다.'로 끝나지 않는 문장");
  if (/요\.|니다\.|습니다/.test(d)) f("해요체/합쇼체 섞임");

  let summary = it.preview;
  if (it.rewrite_preview) {
    const p = String(o.preview_new || "").trim();
    if (!p) f("크롤링 요약 누락");
    else {
      if (p.length < 20 || p.length > 35) f(`요약 길이 ${p.length}자`);
      if (!/(꿈|길몽|흉몽)$/.test(p)) f("요약이 ~꿈/~길몽/~흉몽으로 끝나지 않음");
      if (ss[0] && ovl(p, ss[0]) >= 0.5) f(`요약≈본문 첫 문장 (${ovl(p, ss[0]).toFixed(2)})`);
      if (it.badge === "길몽" && /흉몽$/.test(p)) f("길몽 항목 요약이 흉몽");
      if (it.badge === "흉몽" && /길몽$/.test(p)) f("흉몽 항목 요약이 길몽");
      summary = p;
    }
  } else if (o.preview_new) f("크롤링이 아닌데 요약을 바꿈");
  if (d.includes(summary)) f("본문에 요약 문장이 그대로 들어감");
  const mo = Math.max(0, ...ss.map((s) => ovl(summary, s)));
  if (mo >= 0.6) f(`요약 반복 (최대 겹침 ${mo.toFixed(2)})`);

  if (it.badge === "흉몽" && !ss.some((s) => NEG.test(s))) f("흉몽인데 흉한 해석 문장 없음");
  if (it.badge === "길몽" && /흉몽/.test(d)) f("길몽인데 본문에 '흉몽'");
  if (it.badge === "흉몽" && /길몽/.test(d)) f("흉몽인데 본문에 '길몽'");
  if (it.badge === "보통" && /길몽|흉몽/.test(d)) f("판정 미확정 항목에 길몽/흉몽 단정");

  // allow_cond_s4: 재판정 항목은 조건부의 흉한 경우를 4문장에서 가볍게 언급해도 된다(사용자 지시).
  const condScope = it.allow_cond_s4 ? ss.slice(2, 3) : ss.slice(2);
  for (const c of it.conditions) {
    const ct = `${c.if ?? c.condition ?? ""} ${c.then ?? ""}`.trim();
    for (const s of condScope) {
      const v = ovl(c.if ?? c.condition ?? "", s);
      if (v >= 0.5) f(`조건 반복 (${v.toFixed(2)}): "${(c.if ?? c.condition).slice(0, 24)}"`);
    }
    void ct;
  }
}

const bad = new Set(fails.map((x) => x[0]));
for (const [id, m] of fails) console.log(`FAIL ${id.padEnd(14)} ${m}`);
console.log(`\n검증 ${scope.length}건 · 통과 ${scope.length - bad.size} · 실패 ${bad.size}`);
process.exitCode = bad.size ? 1 : 0;
