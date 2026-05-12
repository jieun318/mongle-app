import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";

// Expo Go 에서는 expo-notifications + datetimepicker 풀 지원 안 됨
// dev client 또는 standalone 빌드에서만 운세 알림 활성화
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";
import {
  deleteMyAccount,
  getMyProfile,
  updateMyProfile,
} from "@/features/auth/profile";
import { signOut } from "@/features/auth/auth";
import {
  scheduleDailyFortune,
  cancelDailyFortune,
  requestNotificationPermission,
  FORTUNE_NOTIF_ENABLED_KEY,
  FORTUNE_NOTIF_TIME_KEY,
  DEFAULT_FORTUNE_NOTIF_TIME,
  parseHHMM,
  formatHHMM,
  formatTimeKR,
  timeStringToDate,
} from "@/lib/notifications";

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notify, setNotify] = useState(true);
  const [notifyReminder, setNotifyReminder] = useState(false);
  const [acting, setActing] = useState(false);

  // 운세 알림 (로컬 스케줄)
  const [notifyFortune, setNotifyFortune] = useState(false);
  const [fortuneTime, setFortuneTime] = useState(DEFAULT_FORTUNE_NOTIF_TIME);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingTime, setPendingTime] = useState<Date | null>(null); // iOS 모달용

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profile, prefs] = await Promise.all([
        getMyProfile(),
        AsyncStorage.multiGet([
          FORTUNE_NOTIF_ENABLED_KEY,
          FORTUNE_NOTIF_TIME_KEY,
        ]),
      ]);
      if (cancelled) return;
      if (profile.data) {
        setNotify(profile.data.notify_enabled);
        setNotifyReminder(profile.data.notify_dream_reminder);
      }
      const map = Object.fromEntries(prefs) as Record<string, string | null>;
      setNotifyFortune(map[FORTUNE_NOTIF_ENABLED_KEY] === "true");
      if (map[FORTUNE_NOTIF_TIME_KEY]) {
        setFortuneTime(map[FORTUNE_NOTIF_TIME_KEY]!);
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

  const handleToggleFortuneNotify = async (next: boolean) => {
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "알림 권한 필요",
          "기기 설정에서 몽글의 알림을 허용해 주세요.",
        );
        return;
      }
      const { hour, minute } = parseHHMM(fortuneTime);
      const ok = await scheduleDailyFortune(hour, minute);
      if (!ok) {
        Alert.alert("스케줄 실패", "잠시 후 다시 시도해 주세요.");
        return;
      }
      setNotifyFortune(true);
      AsyncStorage.setItem(FORTUNE_NOTIF_ENABLED_KEY, "true").catch(() => {});
    } else {
      await cancelDailyFortune();
      setNotifyFortune(false);
      AsyncStorage.setItem(FORTUNE_NOTIF_ENABLED_KEY, "false").catch(() => {});
    }
  };

  const persistTime = async (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const newTime = formatHHMM(h, m);
    setFortuneTime(newTime);
    AsyncStorage.setItem(FORTUNE_NOTIF_TIME_KEY, newTime).catch(() => {});
    if (notifyFortune) {
      await scheduleDailyFortune(h, m);
    }
  };

  const openTimePicker = () => {
    setPendingTime(timeStringToDate(fortuneTime));
    setShowTimePicker(true);
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
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
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

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>운세 알림</Text>
                <Text style={styles.rowDesc}>
                  {IS_EXPO_GO
                    ? "Dev 빌드에서 사용 가능 (Expo Go 미지원)"
                    : "매일 정한 시간에 오늘의 운세를 알려줘요"}
                </Text>
              </View>
              <Switch
                value={notifyFortune}
                onValueChange={handleToggleFortuneNotify}
                disabled={IS_EXPO_GO}
                trackColor={{ true: "#B898F0", false: "#D8D0E8" }}
                thumbColor="#fff"
              />
            </View>

            {notifyFortune && !IS_EXPO_GO && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.row}
                  onPress={openTimePicker}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>알림 시간</Text>
                  </View>
                  <Text style={styles.timeValue}>
                    {(() => {
                      const { hour, minute } = parseHHMM(fortuneTime);
                      return formatTimeKR(hour, minute);
                    })()}
                  </Text>
                  <Text style={styles.actionChevron}> ›</Text>
                </TouchableOpacity>
              </>
            )}
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

      {/* 시간 선택기 — iOS: 모달 + 완료 버튼, Android: 네이티브 다이얼로그 */}
      {showTimePicker &&
        (Platform.OS === "ios" ? (
          <Modal transparent animationType="fade">
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setShowTimePicker(false)}
            >
              <View style={styles.iosPickerBackdrop} />
            </TouchableOpacity>
            <View style={styles.iosPickerSheet}>
              <DateTimePicker
                value={pendingTime ?? timeStringToDate(fortuneTime)}
                mode="time"
                display="spinner"
                onChange={(_, d) => {
                  if (d) setPendingTime(d);
                }}
              />
              <TouchableOpacity
                style={styles.iosPickerDone}
                onPress={() => {
                  setShowTimePicker(false);
                  if (pendingTime) persistTime(pendingTime);
                  setPendingTime(null);
                }}
              >
                <Text style={styles.iosPickerDoneText}>완료</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={timeStringToDate(fortuneTime)}
            mode="time"
            is24Hour
            onChange={(event, d) => {
              setShowTimePicker(false);
              if (event.type === "set" && d) {
                persistTime(d);
              }
            }}
          />
        ))}
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

  timeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6858B8",
  },

  iosPickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iosPickerSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  iosPickerDone: {
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  iosPickerDoneText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7868C8",
  },
});
