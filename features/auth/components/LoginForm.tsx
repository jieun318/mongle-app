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
import InputField from "@/components/ui/InputField";
import PasswordField from "@/components/ui/PasswordField";
import Button from "@/components/ui/Button";
import { loginSchema } from "@/types/authSchema";
import {
  signInWithEmail,
  signInWithKakao,
  signInWithApple,
} from "@/features/auth/auth";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLogin, setKeepLogin] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
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

  const handleLogin = async () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setSubmitting(false);
    if (error) {
      const message =
        error.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않아요"
          : error.message === "Email not confirmed"
            ? "이메일 인증이 필요해요. 메일함을 확인해주세요"
            : error.message;
      Alert.alert("로그인 실패", message);
      return;
    }
    router.replace("/(app)");
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image
          source={require("@/assets/images/mongle-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text
          style={{
            fontFamily: "OnglyphPDH",
            fontSize: 36,
            color: "#3D2B5E",
            letterSpacing: 2,
          }}
        >
          몽글
        </Text>
        <Text
          style={{ fontFamily: "OnglyphPDH", fontSize: 16, color: "#5C4A7A" }}
        >
          어젯밤 어떤 꿈을 꾸셨나요?
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.fieldWrap}>
          <InputField
            placeholder="이메일을 입력해주세요"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.fieldWrap}>
          <PasswordField
            placeholder="비밀번호를 입력해주세요"
            value={password}
            onChangeText={setPassword}
          />
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}
        </View>

        <View style={styles.optionRow}>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setKeepLogin(!keepLogin)}
          >
            <View style={[styles.checkbox, keepLogin && styles.checkboxActive]}>
              {keepLogin ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>로그인 유지</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgotText}>비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>

        <Button label={submitting ? "로그인 중..." : "로그인"} onPress={handleLogin} />
      </View>

      <View style={styles.socialWrap}>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.divider} />
        </View>
        <View style={styles.socialBtns}>
          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: "#FEE500" }]}
            onPress={() => handleSocial("kakao")}
            disabled={social !== null}
            activeOpacity={0.85}
          >
            {social === "kakao" ? (
              <ActivityIndicator color="#3D2B5E" />
            ) : (
              <Image
                source={require("@/assets/images/kakao.png")}
                style={styles.socialIcon}
              />
            )}
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: "#fff" }]}
              onPress={() => handleSocial("apple")}
              disabled={social !== null}
              activeOpacity={0.85}
            >
              {social === "apple" ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Image
                  source={require("@/assets/images/apple.png")}
                  style={styles.socialIcon}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>아직 계정이 없으신가요? </Text>
        <TouchableOpacity onPress={() => router.replace("/(auth)/signup")}>
          <Text style={styles.signupLink}>회원가입하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    paddingTop: 40,
  },
  logoWrap: { alignItems: "center", marginBottom: 55, gap: -10 },
  logo: { width: 200, height: 200, marginBottom: -15 },
  form: { width: "100%", gap: 12 },
  fieldWrap: { gap: 4 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#C4B8D6",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#7B6A9E", borderColor: "#7B6A9E" },
  checkmark: { color: "#fff", fontSize: 11, fontWeight: "700" },
  checkLabel: { fontSize: 13, color: "#5C4A7A" },
  forgotText: { fontSize: 13, color: "#9B8BB4" },
  errorText: { fontSize: 11, color: "#f87171", paddingLeft: 4 },
  socialWrap: { width: "100%", marginTop: 24, gap: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: "#d8b4fe" },
  dividerText: { fontSize: 12, color: "#9B8BB4" },
  socialBtns: { flexDirection: "row", justifyContent: "center", gap: 16 },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: { width: 40, height: 40 },
  signupRow: { flexDirection: "row", marginTop: 24, alignItems: "center" },
  signupText: { fontSize: 13, color: "#9B8BB4" },
  signupLink: { fontSize: 13, color: "#5B3E8F", fontWeight: "700" },
});
