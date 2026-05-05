// supabase/scripts/check_dreams.mjs
//   DB의 dream_items.emoji 분포를 출력해 시드가 적용됐는지 확인.
//
// 실행:
//   node supabase/scripts/check_dreams.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

function loadDotEnv() {
  const envPath = resolve(ROOT, ".env");
  let text;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("❌ .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

const { data, error, count } = await supabase
  .from("dream_items")
  .select("id, emoji, title", { count: "exact" })
  .like("id", "crawled-%")
  .order("id");

if (error) {
  console.error("❌ 조회 실패:", error.message);
  process.exit(1);
}

console.log(`📊 crawled-* 항목 수: ${count}`);

const dist = {};
for (const r of data ?? []) {
  dist[r.emoji] = (dist[r.emoji] ?? 0) + 1;
}
const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
console.log("\n=== DB의 emoji 분포 ===");
for (const [e, c] of sorted) console.log(`  ${e} x${c}`);

console.log("\n=== 처음 10건 미리보기 ===");
for (const r of (data ?? []).slice(0, 10)) {
  console.log(`  ${r.emoji}  ${r.title}`);
}
