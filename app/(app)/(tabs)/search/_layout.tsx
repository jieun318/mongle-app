import { Stack } from "expo-router";

// 검색 탭 내부 스택 — index → results / [category] 등 디테일 화면을 push 로 띄움
export default function SearchLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
