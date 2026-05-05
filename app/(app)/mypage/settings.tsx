import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  deleteMyAccount,
  getMyProfile,
  updateMyProfile,
} from "@/features/auth/profile";
import { signOut } from "@/features/auth/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notify, setNotify] = useState(true);
  const [notifyReminder, setNotifyReminder] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await getMyProfile();
      if (cancelled) return;
      if (data) {
        setNotify(data.notify_enabled);
        setNotifyReminder(data.notify_dream_reminder);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleNotify = async (next: boolean) => {
    setNotify(next);
    const { error } = await updateMyProfile({ notifyEnabled: next });
    if (error) {
      setNotify(!next);
      Alert.alert("저장 실패", error.message);
    }
  };

  const handleToggleReminder = async (next: boolean) => {
    setNotifyReminder(next);
    const { error } = await updateMyProfile({ notifyDreamReminder: next });
    if (error) {
      setNotifyReminder(!next);
      Alert.alert("저장 실패", error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          setActing(true);
          await signOut();
          setActing(false);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "회원 탈퇴",
      "탈퇴하면 기록한 모든 꿈과 프로필이 영구 삭제돼요.\n정말 진행하시겠어요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: async () => {
            setActing(true);
            const { error } = await deleteMyAccount();
            setActing(false);
            if (error) {
              Alert.alert("탈퇴 실패", error.message);
              return;
            }
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  };

  return (
    <LinearGradient colors={["#EDE9FF", "#F5F0FF", "#FFF8F0"]} style={{ flex: 1 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>설정</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#7868C8" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>알림</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>알림</Text>
                <Text style={styles.rowDesc}>몽글 앱의 알림을 받아요</Text>
              </View>
              <Switch
                value={notify}
                onValueChange={handleToggleNotify}
                trackColor={{ true: "#B898F0", false: "#D8D0E8" }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>꿈 기록 리마인드</Text>
                <Text style={styles.rowDesc}>아침마다 어젯밤 꿈을 적게 알려줘요</Text>
              </View>
              <Switch
                value={notifyReminder}
                onValueChange={handleToggleReminder}
                trackColor={{ true: "#B898F0", false: "#D8D0E8" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>계정</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleLogout}
              disabled={acting}
            >
              <Text style={styles.actionLabel}>로그아웃</Text>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDeleteAccount}
              disabled={acting}
            >
              <Text style={[styles.actionLabel, styles.danger]}>회원 탈퇴</Text>
              <Text style={[styles.actionChevron, styles.danger]}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
    gap: 4,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 26, color: "#8878CC", lineHeight: 26 },
  headerText: {
    fontFamily: "OnglyphPDH",
    fontSize: 18,
    color: "#6858B8",
    letterSpacing: 0.5,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingTop: 12, paddingBottom: 60, gap: 14 },

  section: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  sectionTitle: {
    fontFamily: "OnglyphPDH",
    fontSize: 14,
    color: "#5848A8",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: "600", color: "#3828A0" },
  rowDesc: { fontSize: 11, color: "#9888CC", marginTop: 2 },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  actionLabel: { fontSize: 14, fontWeight: "600", color: "#3828A0" },
  actionChevron: { fontSize: 18, color: "#C0B0E8" },
  danger: { color: "#D85858" },

  divider: { height: 1, backgroundColor: "rgba(180,160,230,0.18)" },
});
