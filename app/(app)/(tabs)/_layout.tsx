import { Tabs } from "expo-router";

// 4개 메인 탭 — 한 번 mount 후 계속 살아있어 상태/애니메이션 보존.
// BottomNav 가 따로 그려주므로 expo-router 기본 탭바는 숨긴다.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        animation: "none",
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="storage" />
      <Tabs.Screen name="mypage" />
    </Tabs>
  );
}
