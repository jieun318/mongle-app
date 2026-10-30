import { Redirect, Stack } from "expo-router";
import { ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSession } from "@/features/auth/auth";
import { useConsentState } from "@/features/auth/consent";

// (app) 의 stack — (tabs) 그룹은 4개 메인 탭이 모두 살아있는 상태로 유지되고,
// dream/new 같은 디테일 화면은 어느 탭 위에서든 push 로 얹힌다.
//
// 인증 가드는 여기에 둔다. 네이티브는 app/index.tsx 게이트를 거쳐 들어오지만,
// 웹은 /search 같은 하위 경로 URL 을 주소창에 직접 칠 수 있어 루트 게이트를
// 건너뛴다. (auth)/_layout.tsx 와 대칭 — 세션 여부를 단일 소스로 삼아 선언형으로
// 보낸다.
//
// 동의 가드도 같은 이유로 여기에 둔다. 카카오 첫 로그인은 곧 가입이라 앱 자체
// 동의를 거치지 않은 계정이 생긴다 → /consent 로 보낸다.
export default function AppLayout() {
  const { session, loading } = useSession();
  const consent = useConsentState(session?.user ?? null);

  // loading 중에는 판단을 보류한다. 세션 복원 전에 리다이렉트하면 새로고침마다
  // 로그인 화면이 한 번 스쳐 지나간다.
  if (!loading && !session) return <Redirect href="/(auth)/login" />;

  if (session && consent === "required") return <Redirect href="/consent" />;

  // 동의 여부를 모르는 동안은 탭을 띄우지 않는다 — 홈이 먼저 마운트되면 동의 전에
  // 위치 권한 요청과 날씨·일출 조회가 나간다. app/index.tsx 게이트와 같은 배경.
  if (loading || consent === "pending") {
    return (
      <LinearGradient
        colors={["#E8DEFF", "#EEF6FF", "#FFF8E7"]}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator color="#7B6A9E" />
      </LinearGradient>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      <Stack.Screen name="dream/new" />
      <Stack.Screen name="dream/result" />
    </Stack>
  );
}
