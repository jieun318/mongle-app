import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function SignupScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isPasswordValid =
    password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  const isPasswordMatch =
    password === passwordConfirm && passwordConfirm.length > 0;

  const handleSignup = () => {
    router.push("/(auth)/login");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
        {/* 닉네임 */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={styles.input}
            placeholder="최대 10자 · 특수문자 제외"
            placeholderTextColor="#C4B8D6"
            value={nickname}
            onChangeText={setNickname}
            maxLength={10}
          />
        </View>

        {/* 아이디 */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>아이디</Text>
          <TextInput
            style={styles.input}
            placeholder="영문으로 입력해주세요"
            placeholderTextColor="#C4B8D6"
            value={id}
            onChangeText={setId}
            autoCapitalize="none"
          />
        </View>

        {/* 비밀번호 */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>비밀번호</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0 }]}
              placeholder="영문+숫자 조합 8자 이상"
              placeholderTextColor="#C4B8D6"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Image
                source={
                  showPassword
                    ? require("@/assets/images/eye.png")
                    : require("@/assets/images/eye-off.png")
                }
                style={styles.eyeIcon}
              />
            </TouchableOpacity>
          </View>
          {password.length > 0 && (
            <Text style={isPasswordValid ? styles.validText : styles.errorText}>
              {isPasswordValid
                ? "✓ 사용 가능한 비밀번호예요"
                : "영문+숫자 조합 8자 이상이어야 해요"}
            </Text>
          )}
        </View>

        {/* 비밀번호 확인 */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>비밀번호 확인</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0 }]}
              placeholder="비밀번호를 한 번 더 입력해주세요"
              placeholderTextColor="#C4B8D6"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              style={styles.eyeBtn}
            >
              <Image
                source={
                  showConfirm
                    ? require("@/assets/images/eye.png")
                    : require("@/assets/images/eye-off.png")
                }
                style={styles.eyeIcon}
              />
            </TouchableOpacity>
          </View>
          {passwordConfirm.length > 0 && (
            <Text style={isPasswordMatch ? styles.validText : styles.errorText}>
              {isPasswordMatch
                ? "✓ 비밀번호가 일치해요"
                : "비밀번호가 일치하지 않아요"}
            </Text>
          )}
        </View>

        {/* 회원가입 버튼 */}
        <TouchableOpacity style={styles.signupBtn} onPress={handleSignup}>
          <Text style={styles.signupBtnText}>회원가입</Text>
        </TouchableOpacity>
      </View>

      {/* 로그인 링크 */}
      <View style={styles.loginRow}>
        <Text style={styles.loginText}>계정이 있으신가요? </Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.loginLink}>로그인하기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#EEE8F8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 28,
    gap: 8,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#826c98",
  },
  subtitle: {
    fontSize: 16,
    color: "#615172",
  },
  form: {
    width: "100%",
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#615172",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#3D3240",
    borderWidth: 1.5,
    borderColor: "#EDE9F0",
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EDE9F0",
    paddingRight: 12,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeIcon: {
    width: 20,
    height: 20,
  },
  validText: {
    fontSize: 11,
    color: "#22c55e",
    paddingLeft: 4,
  },
  errorText: {
    fontSize: 11,
    color: "#f87171",
    paddingLeft: 4,
  },
  signupBtn: {
    width: "100%",
    backgroundColor: "#d8b4fe",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  signupBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#615172",
  },
  loginRow: {
    flexDirection: "row",
    marginTop: 24,
    alignItems: "center",
  },
  loginText: {
    fontSize: 13,
    color: "#B0A8C2",
  },
  loginLink: {
    fontSize: 13,
    color: "#826c98",
    fontWeight: "700",
  },
});
