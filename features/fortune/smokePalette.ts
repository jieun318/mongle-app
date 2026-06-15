// 연기 팔레트 — 웹/네이티브 공용 (런타임 의존 없음)

export const LUCKY_SMOKE: Record<string, readonly [string, string, string]> = {
  "라벤더": ["#e2d4f5", "#f0e6fa", "#d8c8f0"],
  "보라":   ["#e0c8f5", "#efddfa", "#d8c0f0"],
  "파랑":   ["#cee0f5", "#e6eefa", "#bfd5f0"],
  "하늘":   ["#d8eaf8", "#ecf5fc", "#c8e0f5"],
  "초록":   ["#dff0c8", "#eff7dc", "#d3e8b8"],
  "민트":   ["#cef0dc", "#e2f7e8", "#bee8ce"],
  "연두":   ["#e8f5b8", "#f3f8d4", "#dff0a4"],
  "노랑":   ["#fcefb8", "#fef7d4", "#f9e8a8"],
  "주황":   ["#fcdba8", "#fee8c8", "#f9cc94"],
  "빨강":   ["#f8b8b8", "#fcd2d2", "#f5a8a8"],
  "분홍":   ["#fbd2e2", "#fee0eb", "#f8c8dc"],
  "핑크":   ["#fbd2e2", "#fee0eb", "#f8c8dc"],
  "코랄":   ["#fbcdc0", "#fde0d6", "#f8c0b0"],
  "베이지": ["#f5e8cb", "#fbf2dc", "#efddb8"],
  "금색":   ["#fbe8a4", "#fdf2c8", "#f8de8a"],
  "남색":   ["#c7cfe6", "#dde3f2", "#b8c2de"],
  "청록":   ["#c2e4e2", "#d9efed", "#b0dad7"],
  "쑥색":   ["#dde2c8", "#eaeedb", "#d0d7b6"],
  "잿빛":   ["#dadde1", "#e9ebee", "#cccfd5"],
};

const FALLBACK_SMOKE: readonly [string, string, string] = ["#e2d4f5", "#f0e6fa", "#d8c8f0"];

export function getSmokePalette(luckyColor: string): readonly [string, string, string] {
  return LUCKY_SMOKE[luckyColor] ?? FALLBACK_SMOKE;
}
