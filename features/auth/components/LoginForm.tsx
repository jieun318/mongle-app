import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  signInWithKakao,
  signInWithApple,
  signInWithEmail,
} from "@/features/auth/auth";
import { showNotice } from "@/lib/dialog";
import { supabase } from "@/lib/supabase";

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
  const router = useRouter();
  const [social, setSocial] = useState<null | "kakao" | "apple">(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 소셜/이메일 중 하나라도 진행 중이면 전부 잠근다.
  const busy = emailLoading || social !== null;

  const handleEmailLogin = async () => {
    if (busy) return;
    // 빈 값은 GoTrue 왕복 없이 여기서 막는다.
    if (!email.trim() || !password) {
      setFormError("이메일과 비밀번호를 모두 입력해 주세요");
      return;
    }
    setFormError(null);
    setEmailLoading(true);
    const { error } = await signInWithEmail(email, password);
    setEmailLoading(false);
    if (error) {
      // 소셜과 달리 입력 폼이 바로 위에 있으니, 다이얼로그보다 인라인이
      // 어디를 고쳐야 하는지 분명하다. 메시지는 auth.ts 에서 이미 한국어.
      setFormError(error.message);
      return;
    }
    // 성공 시 이동은 (auth)/_layout 의 세션 리다이렉트가 담당한다.
  };

  const handleSocial = async (provider: "kakao" | "apple") => {
    if (busy) return;
    setFormError(null);
    setSocial(provider);
    const { error, canceled } =
      provider === "kakao"
        ? await signInWithKakao()
        : await signInWithApple();
    setSocial(null);
    if (canceled) return;
    if (error) {
      // Alert.alert 는 react-native-web 에서 빈 함수라 웹에선 아무것도 안 뜬다.
      // 로그인 실패는 웹(카카오 풀페이지 redirect)에서도 나는 경로라 인앱
      // 다이얼로그로 알린다.
      showNotice(
        provider === "kakao" ? "카카오 로그인 실패" : "애플 로그인 실패",
        error.message,
      );
      return;
    }
    // 성공 시 이동은 (auth)/_layout 의 세션 리다이렉트가 담당한다.
  };

  const showApple = APPLE_LOGIN_ENABLED && Platform.OS === "ios";

  const handleDevLogin = async () => {
    if (busy) return;
    try {
      // raw_user_meta_data.nickname 을 같이 넘기면 handle_new_user 트리거가
      // profiles.nickname 을 "테스트유저"로 채워준다 (없으면 기본 '몽글이').
      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { nickname: DEV_USER.name } },
      });
      if (error) throw error;
      await AsyncStorage.setItem(DEV_USER_KEY, JSON.stringify(DEV_USER));
    } catch (e) {
      showNotice(
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

      {/* ── 이메일 로그인 (메인 CTA) ── */}
      <View style={styles.emailWrap}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="이메일"
          placeholderTextColor="#C4B8D6"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          placeholderTextColor="#C4B8D6"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          editable={!busy}
          onSubmitEditing={handleEmailLogin}
          returnKeyType="go"
        />

        {formError && <Text style={styles.errorText}>{formError}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDimmed]}
          onPress={handleEmailLogin}
          disabled={busy}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#B898F0", "#8868D8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtnGradient}
          >
            {emailLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>로그인</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          disabled={busy}
          activeOpacity={0.6}
          style={styles.signupBtn}
        >
          <Text style={styles.signupLabel}>회원가입</Text>
        </TouchableOpacity>
      </View>

      {/* ── 구분선 ── */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>간편 로그인</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialWrap}>
        <TouchableOpacity
          style={[styles.socialBtn, styles.kakaoBtn]}
          onPress={() => handleSocial("kakao")}
          disabled={busy}
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
            disabled={busy}
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
            disabled={busy}
            activeOpacity={0.6}
            style={styles.devBtn}
          >
            <Text style={styles.devLabel}>개발용 우회 로그인</Text>
          </TouchableOpacity>
        )}
      </View>

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
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoWrap: { alignItems: "center", marginBottom: 24 },
  logo: { width: 132, height: 132, marginBottom: -10 },
  brand: {
    fontFamily: "OnglyphPDH",
    fontSize: 30,
    color: "#3D2B5E",
    letterSpacing: 2,
  },
  tagline: { fontFamily: "OnglyphPDH", fontSize: 16, color: "#5C4A7A" },

  emailWrap: { width: "100%", gap: 10 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#3D2B5E",
    borderWidth: 1.5,
    borderColor: "#EDE9F0",
  },
  errorText: { fontSize: 12, color: "#D9534F", paddingHorizontal: 2 },
  primaryBtn: { borderRadius: 16, overflow: "hidden", marginTop: 2 },
  primaryBtnGradient: { paddingVertical: 15, alignItems: "center" },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnDimmed: { opacity: 0.6 },
  signupBtn: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 12 },
  signupLabel: {
    fontSize: 13,
    color: "#7868B8",
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  dividerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E3DAF2" },
  dividerLabel: { fontSize: 12, color: "#9B8BB4", fontWeight: "600" },

  socialWrap: { width: "100%", gap: 10 },
  socialBtn: {
    width: "100%",
    height: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  kakaoBtn: { backgroundColor: "#FEE500" },
  appleBtn: { backgroundColor: "#000" },
  socialIcon: { width: 19, height: 19 },
  appleIcon: { tintColor: "#fff" },
  kakaoLabel: { fontSize: 14, fontWeight: "700", color: "#3D2B5E" },
  appleLabel: { fontSize: 14, fontWeight: "700", color: "#fff" },

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
