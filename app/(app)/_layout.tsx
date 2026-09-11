import { Redirect, Stack } from "expo-router";
import { useSession } from "@/features/auth/auth";

// (app) 의 stack — (tabs) 그룹은 4개 메인 탭이 모두 살아있는 상태로 유지되고,
// dream/new 같은 디테일 화면은 어느 탭 위에서든 push 로 얹힌다.
//
// 인증 가드는 여기에 둔다. 네이티브는 app/index.tsx 게이트를 거쳐 들어오지만,
// 웹은 /search 같은 하위 경로 URL 을 주소창에 직접 칠 수 있어 루트 게이트를
// 건너뛴다. (auth)/_layout.tsx 와 대칭 — 세션 여부를 단일 소스로 삼아 선언형으로
// 보낸다.
export default function AppLayout() {
  const { session, loading } = useSession();

  // loading 중에는 판단을 보류한다. 세션 복원 전에 리다이렉트하면 새로고침마다
  // 로그인 화면이 한 번 스쳐 지나간다.
  if (!loading && !session) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      <Stack.Screen name="dream/new" />
    </Stack>
  );
}
