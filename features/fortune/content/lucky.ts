// 행운 아이템 풀 (무료 영역).

import type { MoodType } from "@/types/fortune";

// 색은 mood 별로 분리 — 구슬 연기색이 그날 mood 와 어울리게.
// 모든 색은 index.tsx COLOR_MAP + smokePalette LUCKY_SMOKE 에도 등록돼 있어야 함.
export const LUCKY_COLORS_BY_MOOD: Record<MoodType, readonly string[]> = {
  good:    ["노랑", "주황", "코랄", "금색", "분홍", "빨강"],
  normal:  ["라벤더", "보라", "하늘", "민트", "연두", "베이지"],
  caution: ["파랑", "남색", "청록", "쑥색", "잿빛"],
};

export const LUCKY_ITEMS: readonly string[] = [
  "동전", "손수건", "메모지", "거울", "립밤", "이어폰",
  "텀블러", "꽃 한 송이", "초콜릿", "엽서", "스티커", "향수",
  "양말 한 켤레", "키링", "사진 한 장", "책 한 권", "노트",
  "작은 식물", "캔디", "리본",
];

export const LUCKY_DIRECTIONS: readonly string[] = [
  "동쪽", "서쪽", "남쪽", "북쪽", "동남쪽", "남서쪽", "북동쪽", "북서쪽",
];

export const LUCKY_TIMES: readonly string[] = [
  "이른 아침", "오전 10시 무렵", "정오 즈음", "이른 오후",
  "오후 3시 무렵", "해질 무렵", "저녁 7시 즈음", "늦은 밤",
];
