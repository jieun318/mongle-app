import { Stack } from "expo-router";

// (app) 의 stack — (tabs) 그룹은 4개 메인 탭이 모두 살아있는 상태로 유지되고,
// dream/new 같은 디테일 화면은 어느 탭 위에서든 push 로 얹힌다.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      <Stack.Screen name="dream/new" />
    </Stack>
  );
}
