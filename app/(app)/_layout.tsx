import { Stack } from "expo-router";

export default function AppLayout() {
  // 하단 탭 4개 (홈/검색/보관함/마이페이지) 는 router.replace 로 이동하므로
  // 슬라이드 애니메이션을 끄고 즉시 전환되게 한다. 상세 화면(검색결과/카테고리/
  // 꿈 기록/프로필 편집 등) 은 기본 슬라이드 애니메이션을 그대로 사용.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"          options={{ animation: "none" }} />
      <Stack.Screen name="search/index"   options={{ animation: "none" }} />
      <Stack.Screen name="storage/index"  options={{ animation: "none" }} />
      <Stack.Screen name="mypage/index"   options={{ animation: "none" }} />
    </Stack>
  );
}
