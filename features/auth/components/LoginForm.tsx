import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import InputField from "@/components/ui/InputField";
import PasswordField from "@/components/ui/PasswordField";
import Button from "@/components/ui/Button";

export default function LoginForm() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [keepLogin, setKeepLogin] = useState(false);

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
        <InputField
          placeholder="아이디를 입력해주세요"
          value={id}
          onChangeText={setId}
        />
        <PasswordField
          placeholder="비밀번호를 입력해주세요"
          value={password}
          onChangeText={setPassword}
        />

        {/* 로그인 유지 + 비밀번호 찾기 */}
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setKeepLogin(!keepLogin)}
          >
            <View style={[styles.checkbox, keepLogin && styles.checkboxActive]}>
              {keepLogin && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>로그인 유지</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgotText}>비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>

        <Button label="로그인" onPress={() => router.push("/(app)")} />
      </View>

      {/* 소셜 로그인 */}
      <View style={styles.socialWrap}>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.divider} />
        </View>
        <View style={styles.socialBtns}>
          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: "#FEE500" }]}
          >
            <Image
              source={require("@/assets/images/kakao.png")}
              style={styles.socialIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: "#000" }]}
          >
            <Image
              source={require("@/assets/images/apple.png")}
              style={styles.socialIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 회원가입 링크 */}
      <View style={styles.signupRow}>
        <Text style={styles.signupText}>아직 계정이 없으신가요? </Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
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
    paddingVertical: 40,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  logo: { width: 120, height: 120 },
  title: { fontSize: 32, fontWeight: "700", color: "#826c98" },
  subtitle: { fontSize: 16, color: "#615172" },
  form: { width: "100%", gap: 12 },
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
  checkLabel: { fontSize: 13, color: "#615172" },
  forgotText: { fontSize: 13, color: "#B0A8C2" },
  socialWrap: { width: "100%", marginTop: 24, gap: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: "#d8b4fe" },
  dividerText: { fontSize: 12, color: "#B0A8C2" },
  socialBtns: { flexDirection: "row", justifyContent: "center", gap: 16 },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: { width: 28, height: 28 },
  signupRow: { flexDirection: "row", marginTop: 24, alignItems: "center" },
  signupText: { fontSize: 13, color: "#B0A8C2" },
  signupLink: { fontSize: 13, color: "#826c98", fontWeight: "700" },
});
