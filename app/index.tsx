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
    if (isWeb || loading) return;
    router.replace(session ? "/(app)" : "/(auth)/login");
  }, [session, loading, isWeb, router]);

  if (isWeb) return <WebLanding hasSession={!!session} />;

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
