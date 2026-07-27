// Play 스토어 그래픽 이미지(1024x500) 생성기.
//
// 사용법 (프로젝트 루트에서):
//   node assets/store/gen_feature_graphic.js
//   → assets/store/feature-graphic.html 생성
//   그 다음 헤드리스 브라우저로 캡처:
//   & "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe" `
//       --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
//       --window-size=1024,500 --virtual-time-budget=5000 `
//       --screenshot="assets/store/raw.png" --user-data-dir="$env:TEMP\mongle-shot" `
//       "file:///<절대경로>/assets/store/feature-graphic.html"
//   마지막으로 24-bit PNG 로 평탄화 → play-feature-1024x500.png
//
// 한글 텍스트 합성이 필요해 jimp 만으로는 안 되고 브라우저 렌더를 쓴다.
// 브랜드 폰트/마스코트는 data URI 로 인라인해 외부 로드 없이 렌더된다.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const Jimp = require(path.join(ROOT, "node_modules/jimp-compact"));

(async () => {
  // 1) 마스코트 알파 바운딩 박스로 크롭.
  //    mongi0.png(494x505)는 캐릭터 실측이 187x221 밖에 안 돼 확대 시 뭉개진다.
  //    adaptive-icon.png(1024x1024, 알파)가 같은 캐릭터를 훨씬 크게 담고 있어
  //    스토어 아이콘(icon.png)과도 같은 포즈라 브랜드 일관성이 맞는다.
  const img = await Jimp.read(path.join(ROOT, "assets/images/adaptive-icon.png"));
  const { width: W, height: H, data } = img.bitmap;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  const ALPHA_MIN = 8; // 거의 투명한 안티에일리어싱 픽셀은 무시
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > ALPHA_MIN) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("adaptive-icon.png: 불투명 픽셀을 찾지 못했습니다");
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad);
  maxY = Math.min(H - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  console.log(`mascot bbox: ${minX},${minY} ${cw}x${ch} (원본 ${W}x${H})`);
  img.crop(minX, minY, cw, ch);
  const mascotB64 = (await img.getBufferAsync(Jimp.MIME_PNG)).toString("base64");

  // 2) 브랜드 폰트 인라인 (앱과 동일한 OnglyphPDH)
  const fontB64 = fs
    .readFileSync(path.join(ROOT, "assets/fonts/OnglyphPDH.ttf"))
    .toString("base64");

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<style>
  @font-face {
    font-family: "OnglyphPDH";
    src: url(data:font/ttf;base64,${fontB64}) format("truetype");
    font-display: block;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1024px; height: 500px; overflow: hidden; }
  .stage {
    position: relative; width: 1024px; height: 500px;
    font-family: "OnglyphPDH", sans-serif;
    background:
      radial-gradient(120% 140% at 82% 52%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 46%),
      linear-gradient(135deg, #F8F3FF 0%, #EADEF8 42%, #D3C0F2 74%, #BCACEC 100%);
    overflow: hidden;
  }
  /* 은은한 광채 — 마스코트 뒤 구슬 느낌 */
  .glow {
    position: absolute; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,.92) 0%, rgba(240,232,255,.55) 42%, rgba(212,196,244,0) 72%);
  }
  .glow-main { width: 460px; height: 460px; right: 96px; top: 20px; }
  .glow-soft { width: 300px; height: 300px; left: -70px; bottom: -110px;
    background: radial-gradient(circle, rgba(255,255,255,.5) 0%, rgba(255,255,255,0) 70%); }
  /* 반짝임 */
  .star { position: absolute; color: #fff; opacity: .85;
    text-shadow: 0 0 12px rgba(255,255,255,.9); }
  /* Play 가 일부 배치에서 가장자리를 크롭하므로 텍스트는 안쪽으로 들여쓴다. */
  .copy { position: absolute; left: 94px; top: 50%; transform: translateY(-50%); }
  .brand {
    font-size: 116px; line-height: 1.02; color: #5838A0;
    letter-spacing: 12px; text-shadow: 0 4px 18px rgba(255,255,255,.75);
  }
  .rule { width: 92px; height: 5px; border-radius: 3px; margin: 22px 0 20px;
    background: linear-gradient(90deg, #8E6ED6, rgba(142,110,214,0)); }
  .tag { font-size: 38px; color: #6B4CB0; letter-spacing: 1.5px; }
  .sub { font-size: 25px; color: #7A5FB8; letter-spacing: 1px; margin-top: 12px; }
  /* 원본이 상반신에서 잘린 "빼꼼" 포즈라 캔버스 하단에 붙여 의도된 크롭으로 읽히게 한다. */
  .mascot { position: absolute; right: 92px; bottom: 0; height: 366px;
    filter: drop-shadow(0 16px 30px rgba(88,56,160,.22)); }
</style></head>
<body><div class="stage">
  <div class="glow glow-main"></div>
  <div class="glow glow-soft"></div>
  <div class="star" style="left:520px; top:66px;  font-size:26px;">✦</div>
  <div class="star" style="left:614px; top:150px; font-size:15px; opacity:.7;">✦</div>
  <div class="star" style="left:940px; top:112px; font-size:20px; opacity:.75;">✦</div>
  <div class="star" style="left:452px; top:392px; font-size:17px; opacity:.6;">✦</div>
  <div class="star" style="left:872px; top:404px; font-size:13px; opacity:.55;">✦</div>
  <div class="copy">
    <div class="brand">몽글</div>
    <div class="rule"></div>
    <div class="tag">매일의 운세와 꿈 해몽</div>
    <div class="sub">AI와 나누는 마음 한 조각</div>
  </div>
  <img class="mascot" src="data:image/png;base64,${mascotB64}" alt="">
</div></body></html>`;

  const htmlPath = path.join(__dirname, "feature-graphic.html");
  fs.writeFileSync(htmlPath, html);
  console.log("html:", htmlPath, (html.length / 1024 / 1024).toFixed(2) + "MB");
})();
