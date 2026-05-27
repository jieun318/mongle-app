// 웹 카카오 로그인 OAuth 콜백.
//
// 흐름:
//   1) signInWithKakaoWeb 이 redirectTo 로 이 페이지를 지정한다.
//   2) Supabase 가 풀페이지 redirect 로 ?code=... 를 달고 여기로 돌아온다.
//   3) lib/supabase.ts 의 detectSessionInUrl=true 가 자동으로 code 를 세션으로 교환.
//   4) onAuthStateChange 가 발화 → useSession 의 session 갱신 → /(app) 으로 이동.
//
// 네이티브에선 호출될 일이 없다 (deep link 콜백은 expo-web-browser 가 가로채는 구조).

import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/features/auth/auth";

const TIMEOUT_MS = 8000;

export default function AuthCallback() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace("/(app)");
    } else if (timedOut) {
      router.replace("/(auth)/login");
    }
  }, [session, loading, timedOut, router]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color="#7868C8" />
      <Text style={styles.text}>
        {timedOut ? "로그인 처리에 실패했어요" : "로그인 처리 중이에요..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F3FF",
    gap: 12,
  },
  text: { fontSize: 14, color: "#5C4A7A" },
});
