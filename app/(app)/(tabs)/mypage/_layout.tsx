import { Stack } from "expo-router";

// 마이페이지 탭 내부 스택 — index → edit / settings / fortune-history 등을 push
export default function MypageLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
