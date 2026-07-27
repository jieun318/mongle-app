// Play 스토어 폰 스크린샷 후처리기.
//
// 사용법 (프로젝트 루트에서):
//   node assets/store/gen_screenshots.js
//
// 원본(assets/store/screenshots/raw/)은 갤럭시 1080x2220 스크린샷이다.
// 그대로 올리면 비율이 2.06:1 이라 Play 상한(2:1)을 넘어 거부되므로,
// 시스템 UI(상단 상태바 / 하단 안드로이드 네비게이션 바)를 잘라낸다.
//   → 1080x2021 (비율 1.87) 로 규격을 만족하면서 스토어용으로도 깔끔해진다.
//
// 경계값은 이 기기(1080x2220) 스크린샷을 픽셀 스캔해 구한 값:
//   - 상태바: 시계/아이콘이 y≈50 에서 끝남 → 여유 두고 72 까지 제거
//   - 네비바: 앱 배경(240,239,233) → 네비바 배경(253,253,253) 전환점이 y=2093
// 기기가 바뀌면 이 두 값을 다시 재야 한다.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const Jimp = require(path.join(ROOT, "node_modules/jimp-compact"));

const RAW = path.join(__dirname, "screenshots/raw");
const OUT = path.join(__dirname, "screenshots");

const STATUS_BAR_H = 72;
const NAV_BAR_TOP = 2093;
const SRC_W = 1080;
const SRC_H = 2220;

// 스토어 노출 순서 = 가장 강한 화면부터. STORE_LISTING.md §1.3 캡션과 대응.
// 홈(구슬)은 "오늘 운세를 이미 본" 상태라 구슬이 흐려서 마지막에 뒀다.
const PLAN = [
  ["KakaoTalk_20260727_162447783_01.jpg", "01-fortune-modal.png", "오늘의 운세"],
  ["KakaoTalk_20260727_162447783_02.jpg", "02-categories.png", "카테고리 5종"],
  ["KakaoTalk_20260727_161413256_03.jpg", "03-dream-search.png", "꿈 해몽 검색"],
  ["KakaoTalk_20260727_161413256_04.jpg", "04-dream-write.png", "꿈 기록"],
  ["KakaoTalk_20260727_162447783_03.jpg", "05-chatbot.png", "AI 챗봇"],
  ["KakaoTalk_20260727_162447783.jpg", "06-home.png", "홈 — 구슬"],
];

(async () => {
  const cropH = NAV_BAR_TOP - STATUS_BAR_H;
  const ratio = cropH / SRC_W;
  if (ratio > 2) throw new Error(`비율 ${ratio.toFixed(2)} — Play 상한 2:1 초과`);
  console.log(`crop → ${SRC_W}x${cropH} (비율 ${ratio.toFixed(3)})\n`);

  for (const [src, out, label] of PLAN) {
    const p = path.join(RAW, src);
    if (!fs.existsSync(p)) {
      console.log(`⚠️  없음: ${src} — 건너뜀`);
      continue;
    }
    const img = await Jimp.read(p);
    if (img.bitmap.width !== SRC_W || img.bitmap.height !== SRC_H) {
      throw new Error(`${src}: ${img.bitmap.width}x${img.bitmap.height} — 예상 ${SRC_W}x${SRC_H}`);
    }
    img.crop(0, STATUS_BAR_H, SRC_W, cropH);
    const dst = path.join(OUT, out);
    await img.writeAsync(dst);
    const kb = (fs.statSync(dst).size / 1024).toFixed(0);
    console.log(`${out.padEnd(24)} ${label.padEnd(14)} ${kb}KB`);
  }
})();
