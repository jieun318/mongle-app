import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import InputField from "@/components/ui/InputField";
import PasswordField from "@/components/ui/PasswordField";
import Button from "@/components/ui/Button";

export default function SignupForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const isPasswordValid =
    password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  const isPasswordMatch =
    password === passwordConfirm && passwordConfirm.length > 0;

  return (
    <View style={styles.container}>
      {/* 로고 */}
      <View style={styles.logoWrap}>
        <Image
          source={require("@/assets/images/mongle-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>몽글</Text>
        <Text style={styles.subtitle}>어젯밤 어떤 꿈을 꾸셨나요?</Text>
      </View>

      {/* 입력 폼 */}
      <View style={styles.form}>
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>닉네임</Text>
          <InputField
            placeholder="최대 10자 · 특수문자 제외"
            value={nickname}
            onChangeText={setNickname}
            maxLength={10}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>아이디</Text>
          <InputField
            placeholder="영문으로 입력해주세요"
            value={id}
            onChangeText={setId}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>비밀번호</Text>
          <PasswordField
            placeholder="영문+숫자 조합 8자 이상"
            value={password}
            onChangeText={setPassword}
          />
          {password.length > 0 && (
            <Text style={isPasswordValid ? styles.validText : styles.errorText}>
              {isPasswordValid
                ? "✓ 사용 가능한 비밀번호예요"
                : "영문+숫자 조합 8자 이상이어야 해요"}
            </Text>
          )}
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>비밀번호 확인</Text>
          <PasswordField
            placeholder="비밀번호를 한 번 더 입력해주세요"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
          />
          {passwordConfirm.length > 0 && (
            <Text style={isPasswordMatch ? styles.validText : styles.errorText}>
              {isPasswordMatch
                ? "✓ 비밀번호가 일치해요"
                : "비밀번호가 일치하지 않아요"}
            </Text>
          )}
        </View>

        <Button label="회원가입" onPress={() => router.push("/(auth)/login")} />
      </View>

      {/* 로그인 링크 */}
      <View style={styles.loginRow}>
        <Text style={styles.loginText}>계정이 있으신가요? </Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
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
    paddingVertical: 40,
  },
  logoWrap: { alignItems: "center", marginBottom: 28, gap: 8 },
  logo: { width: 120, height: 120 },
  title: { fontSize: 32, fontWeight: "700", color: "#826c98" },
  subtitle: { fontSize: 16, color: "#615172" },
  form: { width: "100%", gap: 12 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: "#615172" },
  validText: { fontSize: 11, color: "#22c55e", paddingLeft: 4 },
  errorText: { fontSize: 11, color: "#f87171", paddingLeft: 4 },
  loginRow: { flexDirection: "row", marginTop: 24, alignItems: "center" },
  loginText: { fontSize: 13, color: "#B0A8C2" },
  loginLink: { fontSize: 13, color: "#826c98", fontWeight: "700" },
});
