import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Redirect, Stack, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/features/auth/auth";
import { recordConsent, useConsentState } from "@/features/auth/consent";
import { deleteMyAccount } from "@/features/auth/profile";
import AgreeRow from "@/features/auth/components/AgreeRow";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { showNotice } from "@/lib/dialog";

// 카카오 첫 로그인 동의 화면. 카카오 동의 화면은 카카오가 정보를 넘기는 데 대한
// 동의일 뿐이라, 몽글의 약관·개인정보 처리 동의는 여기서 따로 받는다.
// (app)/_layout 이 profiles.terms_agreed_at 이 비어 있으면 이리로 보낸다.
// 항목은 회원가입 폼(SignupForm)과 같아야 한다.
//
// 동의하지 않으면 이미 만들어진 계정(auth.users + profiles)을 지운다 — 동의 없이
// 받은 닉네임·프로필 사진을 남겨둘 근거가 없다.
export default function ConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading } = useSession();
  const consent = useConsentState(session?.user ?? null);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTransfer, setAgreeTransfer] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);

  const agreedAll = agreeTerms && agreePrivacy && agreeTransfer && agreeAge;

  if (!loading && !session) return <Redirect href="/(auth)/login" />;
  // 이미 동의한 계정이 주소로 직접 들어온 경우(웹). 동의 처리 중엔 넘기지 않는다 —
  // recordConsent 가 캐시를 바꾸는 순간 여기서도 리다이렉트가 일어나 replace 와 겹친다.
  if (!busy && consent === "agreed") return <Redirect href="/(app)" />;

  const toggleAll = () => {
    const next = !agreedAll;
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeTransfer(next);
    setAgreeAge(next);
  };

  const handleAgree = async () => {
    if (!agreedAll || busy || !session) return;
    setBusy(true);
    const { error } = await recordConsent(session.user.id);
    if (error) {
      setBusy(false);
      showNotice("저장 실패", "잠시 후 다시 시도해 주세요.");
      return;
    }
    router.replace("/(app)");
  };

  const handleDecline = async () => {
    setConfirmDecline(false);
    if (busy) return;
    setBusy(true);
    const { error } = await deleteMyAccount();
    setBusy(false);
    if (error) {
      showNotice("가입 취소 실패", error.message);
      return;
    }
    router.replace("/(auth)/login");
  };

  return (
    <LinearGradient colors={["#E8DEFF", "#EEF6FF", "#FFF8E7"]} style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "약관 동의", headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <Text style={styles.title}>몽글을 시작하기 전에</Text>
        <Text style={styles.desc}>
          서비스 이용을 위해 아래 항목에 동의해 주세요. 꿈 대화 내용은 AI 해몽을
          위해 국외(미국) 수탁사로 전송돼요.
        </Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.allRow}
            onPress={toggleAll}
            disabled={busy}
            activeOpacity={0.6}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedAll, disabled: busy }}
            accessibilityLabel="전체 동의"
          >
            <View style={[styles.checkbox, agreedAll && styles.checkboxOn]}>
              {agreedAll && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.allLabel}>전체 동의</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.rows}>
            <AgreeRow
              checked={agreeTerms}
              onToggle={() => setAgreeTerms((v) => !v)}
              label="이용약관에 동의합니다"
              href="/terms"
              disabled={busy}
            />
            <AgreeRow
              checked={agreePrivacy}
              onToggle={() => setAgreePrivacy((v) => !v)}
              label="개인정보 수집·이용에 동의합니다"
              href="/privacy"
              disabled={busy}
            />
            <AgreeRow
              checked={agreeTransfer}
              onToggle={() => setAgreeTransfer((v) => !v)}
              label="개인정보 국외 이전에 동의합니다"
              href="/privacy"
              disabled={busy}
            />
            <AgreeRow
              checked={agreeAge}
              onToggle={() => setAgreeAge((v) => !v)}
              label="만 14세 이상입니다"
              disabled={busy}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (!agreedAll || busy) && styles.btnDimmed]}
          onPress={handleAgree}
          disabled={!agreedAll || busy}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#9878E0", "#7458C8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtnGradient}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>동의하고 시작하기</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setConfirmDecline(true)}
          disabled={busy}
          activeOpacity={0.6}
          style={styles.declineBtn}
        >
          <Text style={styles.declineLabel}>동의하지 않음</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDecline}
        title="가입 취소"
        message="동의하지 않으면 몽글을 이용할 수 없어요. 가입이 취소되고 카카오에서 받은 정보도 삭제돼요."
        confirmLabel="가입 취소"
        cancelLabel="돌아가기"
        destructive
        onConfirm={handleDecline}
        onCancel={() => setConfirmDecline(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 16, maxWidth: 520, width: "100%", alignSelf: "center" },
  title: {
    fontFamily: "OnglyphPDH",
    fontSize: 24,
    color: "#3D2B5E",
    textAlign: "center",
  },
  desc: { fontSize: 13, lineHeight: 20, color: "#5C4A7A", textAlign: "center" },

  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  allRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  allLabel: { fontSize: 15, fontWeight: "700", color: "#3D2B5E" },
  divider: { height: 1, backgroundColor: "#EDE6F7" },
  rows: { gap: 10 },
  // AgreeRow 와 같은 체크박스 — 전체 동의만 라벨 스타일이 달라 따로 둔다.
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

  primaryBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  primaryBtnGradient: { paddingVertical: 15, alignItems: "center" },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnDimmed: { opacity: 0.5 },
  declineBtn: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 12 },
  declineLabel: { fontSize: 13, color: "#6B5C82", textDecorationLine: "underline" },
});
