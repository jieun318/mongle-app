// 광고 자리 placeholder.
//
// 현재 상태: 빈 View 반환 (광고 SDK 미연동).
// 추후: AdMob banner / 직접 이미지 광고를 slot 키별로 렌더.
//   - slot: "fortune_modal_bottom" 등 위치 구분자
//   - 노출/클릭 트래킹은 이 컴포넌트에서 일원화

import { View } from "react-native";

interface AdSlotProps {
  slot: string;
  height?: number;
}

export default function AdSlot(_: AdSlotProps) {
  return <View />;
}
