import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSession } from "@/features/auth/auth";
import WebLanding from "@/components/WebLanding";

// 네이티브: 세션 유무에 따라 앱/로그인으로 즉시 분기하는 게이트 화면.
// 웹: 루트(/)는 공개 랜딩 페이지 — 앱 셸로 바로 튕기면 서비스가 뭔지 알 수 없어
//     Google Play 조직 웹사이트 인증에서 확인할 근거가 없다. 진입은 CTA 로.
export default function Index() {
  const router = useRouter();
  const { session, loading } = useSession();
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (loading) return;
    // 웹 루트는 세션이 있어도 리다이렉트하지 않는다. 앱으로 튕기면
    //  (1) 세션 해소(localStorage 읽기 + 토큰 갱신) 전까지 랜딩이 잠깐 그려졌다
    //      사라져 깜빡이고,
    //  (2) 로그인된 사람은 이 페이지를 영영 못 읽는다 — 공개 소개·사업자 정보
    //      페이지인데 개발자 본인조차 확인할 수 없게 된다.
    // 진입은 세션 여부에 따라 문구가 바뀌는 CTA 하나로 통일한다.
    if (isWeb) return;
    router.replace(session ? "/(app)" : "/(auth)/login");
  }, [session, loading, isWeb, router]);

  // loading 중에도 랜딩을 그린다 — 정적 익스포트 HTML 에 소개 문구가 그대로
  // 담겨야 JS 를 실행하지 않는 크롤러·심사자도 내용을 볼 수 있다.
  if (isWeb) return <WebLanding hasSession={!loading && !!session} />;

  return (
    <LinearGradient
      colors={["#E8DEFF", "#EEF6FF", "#FFF8E7"]}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <ActivityIndicator color="#7B6A9E" />
      <View />
    </LinearGradient>
  );
}
