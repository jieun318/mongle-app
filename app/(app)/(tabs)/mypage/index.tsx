import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SettingsIcon, PencilIcon } from "@/components/ui/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import { gradeFromKey } from "@/features/fortune/grade";
import {
  loadThisWeekFortunes,
  type WeekDayFortune,
} from "@/features/fortune/dailyFortuneRepo";
import {
  getAvatarSignedUrl,
  getMyProfile,
  type ProfileRecord,
} from "@/features/auth/profile";

function formatJoinDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} 가입`;
}

export default function MypageScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [week, setWeek] = useState<WeekDayFortune[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false); // 첫 로드 후로는 스피너 안 띄우고 백그라운드 갱신

  const load = useCallback(async () => {
    const [p, wk] = await Promise.all([
      getMyProfile(),
      loadThisWeekFortunes(),
    ]);
    if (!p.error) {
      setProfile(p.data);
      setEmail(p.email);
      // 사진이 있으면 1시간짜리 signed URL 생성
      const url = p.data?.profile_image_url
        ? await getAvatarSignedUrl(p.data.profile_image_url)
        : null;
      setAvatarUrl(url);
    }
    setWeek(wk);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!hasLoadedRef.current) setLoading(true);
      load().finally(() => {
        if (cancelled) return;
        setLoading(false);
        hasLoadedRef.current = true;
      });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  return (
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <TouchableOpacity
          style={styles.gearBtn}
          onPress={() => router.push("/(app)/mypage/settings")}
        >
          <SettingsIcon size={22} color="#5848A8" />
        </TouchableOpacity>
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
          {/* 프로필 카드 */}
          <TouchableOpacity
            style={styles.profileCard}
            activeOpacity={0.85}
            onPress={() => router.push("/(app)/mypage/edit")}
          >
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>
                  {profile?.avatar_emoji ?? "🌙"}
                </Text>
              )}
              <View style={styles.pencilBadge}>
                <PencilIcon size={12} color="#5848A8" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nickname}>
                {profile?.nickname ?? "몽글이"}
              </Text>
              {email ? <Text style={styles.email}>{email}</Text> : null}
              <Text style={styles.joinDate}>
                {formatJoinDate(profile?.created_at)}
              </Text>
            </View>
            <Text style={styles.editChevron}>›</Text>
          </TouchableOpacity>

          {/* 이번 주 운세 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>이번 주 운세</Text>
              <TouchableOpacity
                onPress={() => router.push("/(app)/mypage/fortune-history")}
              >
                <Text style={styles.sectionLink}>지난 운세 보기 ›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {week.map((day) => {
                const grade = gradeFromKey(day.grade);
                const isEmpty = day.grade === null;
                return (
                  <View key={day.ymd} style={styles.weekCell}>
                    <Text style={styles.weekday}>{day.weekdayLabel}</Text>
                    <View
                      style={[
                        styles.weekBadge,
                        { backgroundColor: grade.bg },
                        isEmpty && styles.weekBadgeEmpty,
                      ]}
                    >
                      <Text style={styles.weekBadgeEmoji}>{grade.emoji}</Text>
                    </View>
                    <Text style={styles.weekDate}>{day.date}</Text>
                  </View>
                );
              })}
            </View>

            {/* 이번 주 운세 본문 리스트 — 운세 본 날만 표시 */}
            {week.some((d) => d.payload) ? (
              <View style={styles.dayList}>
                {week
                  .filter((d) => d.payload)
                  .map((d) => {
                    const grade = gradeFromKey(d.grade);
                    return (
                      <View key={d.ymd} style={styles.dayCard}>
                        <View style={styles.dayHead}>
                          <Text style={styles.dayDate}>
                            {d.weekdayLabel} · {d.date}일
                          </Text>
                          <View
                            style={[
                              styles.dayBadge,
                              { backgroundColor: grade.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayBadgeText,
                                { color: grade.color },
                              ]}
                            >
                              {grade.emoji} {grade.label}
                            </Text>
                          </View>
                        </View>
                        {d.payload?.message ? (
                          <Text style={styles.dayMessage}>
                            {d.payload.message}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
              </View>
            ) : null}
          </View>

          {/* 푸터 — 정책 링크 (Play Store 심사·인앱 접근용) */}
          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => router.push("/privacy")}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLinkText}>개인정보처리방침</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <BottomNav active="mypage" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: "OnglyphPDH",
    fontSize: 22,
    color: "#6858B8",
    letterSpacing: 1,
  },
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingTop: 12, paddingBottom: 120, gap: 18 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 36 },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  pencilBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#F0E8FF",
  },
  nickname: { fontSize: 16, fontWeight: "700", color: "#3828A0" },
  email: { fontSize: 11, color: "#9888CC", marginTop: 2 },
  joinDate: { fontSize: 11, color: "#A898D0", marginTop: 4 },
  editChevron: { fontSize: 24, color: "#C0B0E8" },

  section: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "OnglyphPDH",
    fontSize: 15,
    color: "#5848A8",
    letterSpacing: 0.5,
  },
  sectionLink: { fontSize: 11, color: "#8868C8" },

  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekCell: { alignItems: "center", gap: 6, flex: 1 },
  weekday: { fontSize: 11, color: "#9888CC" },
  weekBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  weekBadgeEmpty: { backgroundColor: "#F4F0FA" },
  weekBadgeEmoji: { fontSize: 18 },
  weekDate: { fontSize: 11, fontWeight: "700", color: "#5848A8" },

  dayList: { gap: 8, marginTop: 4 },
  dayCard: {
    backgroundColor: "#F8F6FB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  dayHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dayDate: { fontSize: 12, fontWeight: "700", color: "#5848A8" },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dayBadgeText: { fontSize: 11, fontWeight: "700" },
  dayMessage: { fontSize: 12, color: "#7868B8", lineHeight: 18 },

  footerLink: { alignItems: "center", paddingVertical: 8, marginTop: 4 },
  footerLinkText: {
    fontSize: 12,
    color: "#A898D0",
    textDecorationLine: "underline",
  },
});
