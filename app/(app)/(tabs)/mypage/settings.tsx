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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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
  scheduleDreamReminder,
  cancelDreamReminder,
  requestNotificationPermission,
  FORTUNE_NOTIF_ENABLED_KEY,
  FORTUNE_NOTIF_TIME_KEY,
  DEFAULT_FORTUNE_NOTIF_TIME,
  DREAM_REMINDER_TIME_KEY,
  DEFAULT_DREAM_REMINDER_TIME,
  parseHHMM,
  formatHHMM,
  formatTimeKR,
  timeStringToDate,
} from "@/lib/notifications";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [notify, setNotify] = useState(true);
  const [notifyReminder, setNotifyReminder] = useState(false);
  const [acting, setActing] = useState(false);

  // 운세 알림 / 꿈 리마인드 (로컬 스케줄 — 시간은 AsyncStorage, on/off 는 토글 시점에 expo-notifications 등록)
  const [notifyFortune, setNotifyFortune] = useState(false);
  const [fortuneTime, setFortuneTime] = useState(DEFAULT_FORTUNE_NOTIF_TIME);
  const [reminderTime, setReminderTime] = useState(DEFAULT_DREAM_REMINDER_TIME);
  // 둘 다 같은 picker 컴포넌트 재사용 — 어느 토글에서 열었는지 target 으로 구분
  const [pickerTarget, setPickerTarget] = useState<null | "fortune" | "reminder">(null);
  const [pendingTime, setPendingTime] = useState<Date | null>(null); // iOS 모달용

  // 인앱 confirm 다이얼로그 — Alert.alert / window.confirm 대신 사용.
  // type: 'logout' | 'delete' 로 어떤 액션을 띄울지 구분.
  const [confirmType, setConfirmType] = useState<null | "logout" | "delete">(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profile, prefs] = await Promise.all([
        getMyProfile(),
        AsyncStorage.multiGet([
          FORTUNE_NOTIF_ENABLED_KEY,
          FORTUNE_NOTIF_TIME_KEY,
          DREAM_REMINDER_TIME_KEY,
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
      if (map[DREAM_REMINDER_TIME_KEY]) {
        setReminderTime(map[DREAM_REMINDER_TIME_KEY]!);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 개별 토글 상태를 OS 스케줄러에 반영 — 마스터 ON 복귀나 시간 변경 후 일괄 재등록할 때 사용
  const applyScheduleForFortune = async (): Promise<boolean> => {
    if (!notifyFortune) {
      await cancelDailyFortune();
      return true;
    }
    const { hour, minute } = parseHHMM(fortuneTime);
    return scheduleDailyFortune(hour, minute);
  };

  const applyScheduleForReminder = async (): Promise<boolean> => {
    if (!notifyReminder) {
      await cancelDreamReminder();
      return true;
    }
    const { hour, minute } = parseHHMM(reminderTime);
    return scheduleDreamReminder(hour, minute);
  };

  const handleToggleNotify = async (next: boolean) => {
    if (next) {
      // 마스터 복귀 — 권한 확인 후 개별 토글이 ON 인 항목만 재등록.
      // 개별 토글 상태(DB/AsyncStorage)는 마스터 OFF 동안에도 유지돼 있으므로 그대로 적용.
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "알림 권한 필요",
          "기기 설정에서 몽글의 알림을 허용해 주세요.",
        );
        return;
      }
      await applyScheduleForFortune();
      await applyScheduleForReminder();
    } else {
      // 마스터 OFF — 개별 토글 상태는 보존, OS 스케줄만 전부 취소
      await cancelDailyFortune();
      await cancelDreamReminder();
    }

    setNotify(next);
    const { error } = await updateMyProfile({ notifyEnabled: next });
    if (error) {
      // 롤백: UI + 스케줄 둘 다 원상복구
      setNotify(!next);
      if (next) {
        await cancelDailyFortune();
        await cancelDreamReminder();
      } else {
        await applyScheduleForFortune();
        await applyScheduleForReminder();
      }
      Alert.alert("저장 실패", error.message);
    }
  };

  const handleToggleReminder = async (next: boolean) => {
    if (next) {
      // 마스터가 ON 일 때만 실제 OS 스케줄 등록. OFF 면 상태만 저장하고 마스터 복귀 시 재등록.
      if (notify) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            "알림 권한 필요",
            "기기 설정에서 몽글의 알림을 허용해 주세요.",
          );
          return;
        }
        const { hour, minute } = parseHHMM(reminderTime);
        const ok = await scheduleDreamReminder(hour, minute);
        if (!ok) {
          Alert.alert("스케줄 실패", "잠시 후 다시 시도해 주세요.");
          return;
        }
      }
    } else {
      await cancelDreamReminder();
    }

    setNotifyReminder(next);
    const { error } = await updateMyProfile({ notifyDreamReminder: next });
    if (error) {
      setNotifyReminder(!next);
      if (next) await cancelDreamReminder();
      Alert.alert("저장 실패", error.message);
    }
  };

  const handleToggleFortuneNotify = async (next: boolean) => {
    if (next) {
      // 마스터가 ON 일 때만 실제 OS 스케줄 등록. OFF 면 상태만 저장하고 마스터 복귀 시 재등록.
      if (notify) {
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
      }
      setNotifyFortune(true);
      AsyncStorage.setItem(FORTUNE_NOTIF_ENABLED_KEY, "true").catch(() => {});
    } else {
      await cancelDailyFortune();
      setNotifyFortune(false);
      AsyncStorage.setItem(FORTUNE_NOTIF_ENABLED_KEY, "false").catch(() => {});
    }
  };

  const persistFortuneTime = async (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const newTime = formatHHMM(h, m);
    setFortuneTime(newTime);
    AsyncStorage.setItem(FORTUNE_NOTIF_TIME_KEY, newTime).catch(() => {});
    // 마스터 + 개별 둘 다 ON 일 때만 재스케줄
    if (notify && notifyFortune) {
      await scheduleDailyFortune(h, m);
    }
  };

  const persistReminderTime = async (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const newTime = formatHHMM(h, m);
    setReminderTime(newTime);
    AsyncStorage.setItem(DREAM_REMINDER_TIME_KEY, newTime).catch(() => {});
    if (notify && notifyReminder) {
      await scheduleDreamReminder(h, m);
    }
  };

  const openTimePicker = (target: "fortune" | "reminder") => {
    const current = target === "fortune" ? fortuneTime : reminderTime;
    setPendingTime(timeStringToDate(current));
    setPickerTarget(target);
  };

  const persistPickedTime = async (date: Date) => {
    if (pickerTarget === "fortune") {
      await persistFortuneTime(date);
    } else if (pickerTarget === "reminder") {
      await persistReminderTime(date);
    }
  };

  const handleLogout = () => {
    setConfirmType("logout");
  };

  const handleDeleteAccount = () => {
    setConfirmType("delete");
  };

  const performLogout = async () => {
    setConfirmType(null);
    setActing(true);
    await signOut();
    setActing(false);
    router.replace("/(auth)/login");
  };

  const performDeleteAccount = async () => {
    setConfirmType(null);
    setActing(true);
    const { error } = await deleteMyAccount();
    setActing(false);
    if (error) {
      // 실패 알림은 네이티브 Alert / 웹 window.alert 로. 자주 나는 경로 아님.
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`탈퇴 실패\n\n${error.message}`);
      } else {
        Alert.alert("탈퇴 실패", error.message);
      }
      return;
    }
    router.replace("/(auth)/login");
  };

  return (
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
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
                <Text style={styles.rowDesc}>
                  {IS_EXPO_GO
                    ? "Dev 빌드에서 사용 가능 (Expo Go 미지원)"
                    : "정한 시간에 어젯밤 꿈을 적게 알려줘요"}
                </Text>
              </View>
              <Switch
                value={notifyReminder}
                onValueChange={handleToggleReminder}
                disabled={IS_EXPO_GO || !notify}
                trackColor={{ true: "#B898F0", false: "#D8D0E8" }}
                thumbColor="#fff"
              />
            </View>

            {/* 마스터 OFF 면 시간 행 숨김 — OS 스케줄러에 실제로 등록 안 돼 있으니
                혼란 방지 위해 미노출 */}
            {notify && notifyReminder && !IS_EXPO_GO && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => openTimePicker("reminder")}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>리마인드 시간</Text>
                  </View>
                  <Text style={styles.timeValue}>
                    {(() => {
                      const { hour, minute } = parseHHMM(reminderTime);
                      return formatTimeKR(hour, minute);
                    })()}
                  </Text>
                  <Text style={styles.actionChevron}> ›</Text>
                </TouchableOpacity>
              </>
            )}

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
                disabled={IS_EXPO_GO || !notify}
                trackColor={{ true: "#B898F0", false: "#D8D0E8" }}
                thumbColor="#fff"
              />
            </View>

            {notify && notifyFortune && !IS_EXPO_GO && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => openTimePicker("fortune")}
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
            <Text style={styles.sectionTitle}>약관 및 정책</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push("/privacy")}
            >
              <Text style={styles.actionLabel}>개인정보처리방침</Text>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
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

      <ConfirmDialog
        visible={confirmType === "logout"}
        title="로그아웃"
        message="정말 로그아웃 하시겠어요?"
        confirmLabel="로그아웃"
        cancelLabel="취소"
        destructive
        onConfirm={performLogout}
        onCancel={() => setConfirmType(null)}
      />

      <ConfirmDialog
        visible={confirmType === "delete"}
        title="회원 탈퇴"
        message="탈퇴하면 기록한 모든 꿈과 프로필이 영구 삭제돼요. 정말 진행하시겠어요?"
        confirmLabel="탈퇴하기"
        cancelLabel="취소"
        destructive
        onConfirm={performDeleteAccount}
        onCancel={() => setConfirmType(null)}
      />

      {/* 시간 선택기 — iOS: 모달 + 완료 버튼, Android: 네이티브 다이얼로그.
          target 으로 fortune / reminder 어느 토글에서 열렸는지 구분해 해당 시간 저장. */}
      {pickerTarget !== null &&
        (() => {
          const currentTime =
            pickerTarget === "fortune" ? fortuneTime : reminderTime;
          return Platform.OS === "ios" ? (
            <Modal transparent animationType="fade">
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => {
                  setPickerTarget(null);
                  setPendingTime(null);
                }}
              >
                <View style={styles.iosPickerBackdrop} />
              </TouchableOpacity>
              <View style={styles.iosPickerSheet}>
                <DateTimePicker
                  value={pendingTime ?? timeStringToDate(currentTime)}
                  mode="time"
                  display="spinner"
                  onChange={(_, d) => {
                    if (d) setPendingTime(d);
                  }}
                />
                <TouchableOpacity
                  style={styles.iosPickerDone}
                  onPress={() => {
                    if (pendingTime) persistPickedTime(pendingTime);
                    setPickerTarget(null);
                    setPendingTime(null);
                  }}
                >
                  <Text style={styles.iosPickerDoneText}>완료</Text>
                </TouchableOpacity>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={timeStringToDate(currentTime)}
              mode="time"
              is24Hour
              onChange={(event, d) => {
                setPickerTarget(null);
                if (event.type === "set" && d) {
                  persistPickedTime(d);
                }
              }}
            />
          );
        })()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
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
