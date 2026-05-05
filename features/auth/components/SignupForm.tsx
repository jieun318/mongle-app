import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import InputField from "@/components/ui/InputField";
import PasswordField from "@/components/ui/PasswordField";
import Button from "@/components/ui/Button";
import { signupSchema } from "@/types/authSchema";
import { signUpWithEmail } from "@/features/auth/auth";

export default function SignupForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<{
    nickname?: string;
    email?: string;
    password?: string;
    passwordConfirm?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    const result = signupSchema.safeParse({
      nickname,
      email,
      password,
      passwordConfirm,
    });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        nickname: fieldErrors.nickname?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        passwordConfirm: fieldErrors.passwordConfirm?.[0],
      });
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { data, error } = await signUpWithEmail({
      email: email.trim(),
      password,
      nickname: nickname.trim(),
    });
    setSubmitting(false);
    if (error) {
      const message =
        error.message === "User already registered"
          ? "이미 가입된 이메일이에요"
          : error.message;
      Alert.alert("회원가입 실패", message);
      return;
    }

    // Supabase 기본 설정상 이메일 인증 메일이 발송됨 — 세션은 인증 후 생성
    if (data.session) {
      // 이메일 인증이 꺼져 있는 경우 즉시 로그인됨
      router.replace("/(app)");
    } else {
      Alert.alert(
        "가입 메일을 보냈어요",
        "메일함에서 인증 링크를 눌러주세요. 인증이 끝나면 로그인할 수 있어요.",
        [{ text: "확인", onPress: () => router.replace("/(auth)/login") }],
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
          <Text style={styles.label}>닉네임</Text>
          <InputField
            placeholder="최대 10자 · 특수문자 제외"
            value={nickname}
            onChangeText={setNickname}
            maxLength={10}
          />
          {errors.nickname ? (
            <Text style={styles.errorText}>{errors.nickname}</Text>
          ) : null}
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>이메일</Text>
          <InputField
            placeholder="example@mongle.app"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>비밀번호</Text>
          <PasswordField
            placeholder="영문+숫자 조합 8자 이상"
            value={password}
            onChangeText={setPassword}
          />
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : password.length > 0 ? (
            <Text style={styles.validText}>✓ 사용 가능한 비밀번호예요</Text>
          ) : null}
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>비밀번호 확인</Text>
          <PasswordField
            placeholder="비밀번호를 한 번 더 입력해주세요"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
          />
          {errors.passwordConfirm ? (
            <Text style={styles.errorText}>{errors.passwordConfirm}</Text>
          ) : passwordConfirm.length > 0 && password === passwordConfirm ? (
            <Text style={styles.validText}>✓ 비밀번호가 일치해요</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 8 }}>
          <Button
            label={submitting ? "가입 중..." : "회원가입"}
            onPress={handleSignup}
          />
        </View>
      </View>

      <View style={styles.loginRow}>
        <Text style={styles.loginText}>계정이 있으신가요? </Text>
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.loginLink}>로그인하기</Text>
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
  logoWrap: { alignItems: "center", marginBottom: 28, gap: -10 },
  logo: { width: 200, height: 200, marginBottom: -15 },
  form: { width: "100%", gap: 12 },
  fieldWrap: { gap: 4 },
  label: { fontSize: 12, fontWeight: "700", color: "#5C4A7A" },
  validText: { fontSize: 11, color: "#22c55e", paddingLeft: 4 },
  errorText: { fontSize: 11, color: "#f87171", paddingLeft: 4 },
  loginRow: { flexDirection: "row", marginTop: 24, alignItems: "center" },
  loginText: { fontSize: 13, color: "#9B8BB4" },
  loginLink: { fontSize: 13, color: "#5B3E8F", fontWeight: "700" },
});
