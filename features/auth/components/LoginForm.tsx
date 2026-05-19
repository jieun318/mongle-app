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
import { useRouter } from "expo-router";
import { useState } from "react";
import { signInWithKakao, signInWithApple } from "@/features/auth/auth";

// 애플 로그인 임시 비활성화 플래그.
// Apple Developer 가입 + Supabase Apple provider 설정이 끝나면 true 로만 바꾸면
// iOS 에서 애플 버튼이 다시 노출된다. (안드로이드는 플래그와 무관하게 항상 숨김)
const APPLE_LOGIN_ENABLED = false;

export default function LoginForm() {
  const router = useRouter();
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
    router.replace("/(app)");
  };

  const showApple = APPLE_LOGIN_ENABLED && Platform.OS === "ios";

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

  terms: {
    marginTop: "auto",
    fontSize: 11,
    color: "#9B8BB4",
    textAlign: "center",
    lineHeight: 16,
  },
});
