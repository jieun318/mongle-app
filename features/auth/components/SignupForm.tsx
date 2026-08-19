import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import PasswordInput from "@/components/ui/PasswordInput";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { signUpWithEmail } from "@/features/auth/auth";
import { showNotice } from "@/lib/dialog";

// 클라이언트 1차 검증용. 최종 판정은 GoTrue 가 하고, 여기선 명백한 오타를
// 서버 왕복 없이 즉시 돌려주는 용도다.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 필수 동의 2개가 모두 켜져야 가입 버튼이 눌린다.
  const agreedAll = agreeTerms && agreePrivacy;
  const canSubmit = agreedAll && !loading;

  // 서버 왕복 전에 잡을 수 있는 것만. 메시지는 auth.ts 의 매핑 문구와
  // 동일하게 맞춰, 클라이언트/서버 어느 쪽에서 걸리든 같은 말이 보이게 한다.
  const validate = (): string | null => {
    if (!EMAIL_RE.test(email.trim())) return "이메일 형식이 올바르지 않아요";
    if (password.length < MIN_PASSWORD_LENGTH)
      return "비밀번호는 8자 이상으로 입력해 주세요";
    if (password !== passwordConfirm) return "비밀번호가 서로 일치하지 않아요";
    return null;
  };

  const handleSubmit = async () => {
    // loading 재확인 — 버튼 disabled 와 별개로 onSubmitEditing 경로도 막는다.
    if (loading || !agreedAll) return;
    const invalid = validate();
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setFormError(null);
    setLoading(true);
    const { error, needsEmailConfirm } = await signUpWithEmail(email, password);
    setLoading(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    if (needsEmailConfirm) {
      // 이 경로엔 세션이 없어 (auth)/_layout 이 움직이지 않는다. 직접 복귀시킨다.
      // (현재 대시보드는 Confirm email OFF 라 여기로 오지 않지만, SMTP 를
      //  붙여 켜는 순간 필요해지므로 남겨둔다.)
      showNotice(
        "가입 신청 완료",
        "메일함에서 인증 링크를 확인해 주세요",
        () => router.replace("/(auth)/login"),
      );
      return;
    }
    // 세션이 바로 생긴 경우엔 화면 이동을 하지 않는다.
    // (auth)/_layout 의 세션 리다이렉트가 (app) 으로 보낸다.
  };

  const renderAgreeRow = (
    checked: boolean,
    onToggle: () => void,
    label: string,
    href: string,
  ) => (
    <View style={styles.agreeRow}>
      <TouchableOpacity
        style={styles.agreeHit}
        onPress={onToggle}
        disabled={loading}
        activeOpacity={0.6}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
          {checked && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={styles.agreeLabel}>
          <Text style={styles.agreeRequired}>[필수] </Text>
          {label}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push(href)}
        disabled={loading}
        activeOpacity={0.6}
        style={styles.agreeViewBtn}
      >
        <Text style={styles.agreeViewLabel}>보기</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="회원가입" fallbackHref="/(auth)/login" />

      <View style={styles.body}>
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
          editable={!loading}
        />
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호 (8자 이상)"
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!loading}
        />
        <PasswordInput
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          placeholder="비밀번호 확인"
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!loading}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />

        <View style={styles.agreeWrap}>
          {renderAgreeRow(
            agreeTerms,
            () => setAgreeTerms((v) => !v),
            "이용약관에 동의합니다",
            "/terms",
          )}
          {renderAgreeRow(
            agreePrivacy,
            () => setAgreePrivacy((v) => !v),
            "개인정보처리방침에 동의합니다",
            "/privacy",
          )}
        </View>

        {formError && <Text style={styles.errorText}>{formError}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.btnDimmed]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#B898F0", "#8868D8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtnGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>가입하기</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", flex: 1, paddingBottom: 40 },

  body: { paddingHorizontal: 24, paddingTop: 28, gap: 10 },

  // LoginForm 과 동일 수치 — 두 화면의 입력/버튼이 같아 보여야 한다.
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
  btnDimmed: { opacity: 0.5 },

  agreeWrap: { gap: 8, marginTop: 6, marginBottom: 2 },
  agreeRow: { flexDirection: "row", alignItems: "center" },
  // 토글 영역만 flex:1 로 넓혀, 옆의 "보기" 링크와 탭 영역이 겹치지 않게 한다.
  agreeHit: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D6CCE8",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#8868D8", borderColor: "#8868D8" },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 16 },
  agreeLabel: { fontSize: 13, color: "#5C4A7A" },
  agreeRequired: { color: "#7868B8", fontWeight: "700" },
  agreeViewBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  agreeViewLabel: {
    fontSize: 12,
    color: "#9B8BB4",
    textDecorationLine: "underline",
  },
});
