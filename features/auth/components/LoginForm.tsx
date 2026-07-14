import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithKakao, signInWithApple } from "@/features/auth/auth";
import { supabase } from "@/lib/supabase";
import AuthDebugPanel from "@/components/AuthDebugPanel";

// ⚠️ 임시 — 세션 미유지 원인 확인용. 확정되면 false 로 두지 말고 패널째 제거할 것.
const SHOW_AUTH_DEBUG = true;

// 애플 로그인 임시 비활성화 플래그.
// Apple Developer 가입 + Supabase Apple provider 설정이 끝나면 true 로만 바꾸면
// iOS 에서 애플 버튼이 다시 노출된다. (안드로이드는 플래그와 무관하게 항상 숨김)
const APPLE_LOGIN_ENABLED = false;

// 개발용 우회 로그인 — __DEV__ 에서만 노출.
// Supabase 익명 로그인(signInAnonymously)으로 진짜 authenticated 세션을 만들어
// 챗봇/프로필/운세 등 RLS 보호 기능까지 그대로 동작하게 한다.
// (사전 조건: Supabase Dashboard → Authentication → Anonymous Sign-ins 토글 ON)
const DEV_USER_KEY = "auth.devUser";
const DEV_USER = {
  id: "dev-user-001",
  name: "테스트유저",
  email: "dev@mongle.com",
};

export default function LoginForm() {
  const [social, setSocial] = useState<null | "kakao" | "apple">(null);

  const handleSocial = async (provider: "kakao" | "apple") => {
    if (social) return;
    setSocial(provider);
    const { error, canceled } =
      provider === "kakao"
        ? await signInWithKakao()
        : await signInWithApple();
    setSocial(null);
    if (canceled) return;
    if (error) {
      Alert.alert(
        provider === "kakao" ? "카카오 로그인 실패" : "애플 로그인 실패",
        error.message,
      );
      return;
    }
    // 성공 시 이동은 (auth)/_layout 의 세션 리다이렉트가 담당한다.
  };

  const showApple = APPLE_LOGIN_ENABLED && Platform.OS === "ios";

  const handleDevLogin = async () => {
    if (social) return;
    try {
      // raw_user_meta_data.nickname 을 같이 넘기면 handle_new_user 트리거가
      // profiles.nickname 을 "테스트유저"로 채워준다 (없으면 기본 '몽글이').
      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { nickname: DEV_USER.name } },
      });
      if (error) throw error;
      await AsyncStorage.setItem(DEV_USER_KEY, JSON.stringify(DEV_USER));
    } catch (e) {
      Alert.alert(
        "개발 로그인 실패",
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image
          source={require("@/assets/images/mongle-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>몽글</Text>
        <Text style={styles.tagline}>어젯밤 어떤 꿈을 꾸셨나요?</Text>
      </View>

      <View style={styles.socialWrap}>
        <TouchableOpacity
          style={[styles.socialBtn, styles.kakaoBtn]}
          onPress={() => handleSocial("kakao")}
          disabled={social !== null}
          activeOpacity={0.85}
        >
          {social === "kakao" ? (
            <ActivityIndicator color="#3D2B5E" />
          ) : (
            <>
              <Image
                source={require("@/assets/images/kakao.png")}
                style={styles.socialIcon}
              />
              <Text style={styles.kakaoLabel}>카카오로 시작하기</Text>
            </>
          )}
        </TouchableOpacity>

        {showApple && (
          <TouchableOpacity
            style={[styles.socialBtn, styles.appleBtn]}
            onPress={() => handleSocial("apple")}
            disabled={social !== null}
            activeOpacity={0.85}
          >
            {social === "apple" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Image
                  source={require("@/assets/images/apple.png")}
                  style={[styles.socialIcon, styles.appleIcon]}
                />
                <Text style={styles.appleLabel}>Apple로 시작하기</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {__DEV__ && (
          <TouchableOpacity
            onPress={handleDevLogin}
            disabled={social !== null}
            activeOpacity={0.6}
            style={styles.devBtn}
          >
            <Text style={styles.devLabel}>개발용 우회 로그인</Text>
          </TouchableOpacity>
        )}
      </View>

      {SHOW_AUTH_DEBUG && <AuthDebugPanel />}

      <Text style={styles.terms}>
        로그인하면 서비스 이용약관과 개인정보처리방침에{"\n"}동의하는 것으로
        간주됩니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoWrap: { alignItems: "center", marginBottom: 64, gap: -10 },
  logo: { width: 200, height: 200, marginBottom: -15 },
  brand: {
    fontFamily: "OnglyphPDH",
    fontSize: 36,
    color: "#3D2B5E",
    letterSpacing: 2,
  },
  tagline: { fontFamily: "OnglyphPDH", fontSize: 16, color: "#5C4A7A" },

  socialWrap: { width: "100%", gap: 12 },
  socialBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  kakaoBtn: { backgroundColor: "#FEE500" },
  appleBtn: { backgroundColor: "#000" },
  socialIcon: { width: 22, height: 22 },
  appleIcon: { tintColor: "#fff" },
  kakaoLabel: { fontSize: 15, fontWeight: "700", color: "#3D2B5E" },
  appleLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },

  devBtn: { alignItems: "center", paddingVertical: 6 },
  devLabel: { fontSize: 14, color: "#9B8BB4" },

  terms: {
    marginTop: "auto",
    fontSize: 11,
    color: "#9B8BB4",
    textAlign: "center",
    lineHeight: 16,
  },
});
