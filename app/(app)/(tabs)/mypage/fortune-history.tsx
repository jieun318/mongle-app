import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  loadPastWeeksFortunes,
  type PastWeek,
} from "@/features/fortune/dailyFortuneRepo";
import { gradeFromKey } from "@/features/fortune/grade";

interface MonthGroup {
  monthLabel: string;
  weeks: PastWeek[];
}

function groupByMonth(weeks: PastWeek[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let current: MonthGroup | null = null;
  for (const w of weeks) {
    if (!current || current.monthLabel !== w.monthLabel) {
      current = { monthLabel: w.monthLabel, weeks: [] };
      groups.push(current);
    }
    current.weeks.push(w);
  }
  return groups;
}

export default function FortuneHistoryScreen() {
  const router = useRouter();
  const [weeks, setWeeks] = useState<PastWeek[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const w = await loadPastWeeksFortunes();
    setWeeks(w);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const months = useMemo(() => groupByMonth(weeks), [weeks]);

  return (
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>지난 운세 보기</Text>
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
          {months.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌙</Text>
              <Text style={styles.emptyText}>
                아직 지난 운세가 없어요{"\n"}한 주가 지나면 여기에 모여요
              </Text>
            </View>
          ) : (
            months.map((m) => (
              <View key={m.monthLabel} style={styles.monthGroup}>
                <Text style={styles.monthLabel}>{m.monthLabel}</Text>
                {m.weeks.map((w) => (
                  <View key={w.weekStartYMD} style={styles.weekCard}>
                    <Text style={styles.rangeLabel}>{w.rangeLabel}</Text>

                    {/* 월~일 미니 배지 행 */}
                    <View style={styles.miniRow}>
                      {w.days.map((d) => {
                        const grade = gradeFromKey(d.grade);
                        const isEmpty = d.grade === null;
                        return (
                          <View key={d.ymd} style={styles.miniCell}>
                            <Text style={styles.miniWeekday}>
                              {d.weekdayLabel}
                            </Text>
                            <View
                              style={[
                                styles.miniBadge,
                                { backgroundColor: grade.bg },
                                isEmpty && styles.miniBadgeEmpty,
                              ]}
                            >
                              <Text style={styles.miniEmoji}>
                                {grade.emoji}
                              </Text>
                            </View>
                            <Text style={styles.miniDate}>{d.date}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* 운세 본 날만 본문 표시 */}
                    {w.days.some((d) => d.payload) ? (
                      <View style={styles.dayList}>
                        {w.days
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
                ))}
              </View>
            ))
          )}
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
  scroll: { padding: 20, paddingTop: 12, paddingBottom: 60, gap: 20 },

  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 48, opacity: 0.7 },
  emptyText: {
    fontFamily: "OnglyphPDH",
    fontSize: 14,
    color: "#9888CC",
    textAlign: "center",
    lineHeight: 22,
  },

  monthGroup: { gap: 10 },
  monthLabel: {
    fontFamily: "OnglyphPDH",
    fontSize: 16,
    color: "#5848A8",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },

  weekCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  rangeLabel: { fontSize: 13, fontWeight: "700", color: "#3828A0" },

  miniRow: { flexDirection: "row", justifyContent: "space-between" },
  miniCell: { alignItems: "center", gap: 4, flex: 1 },
  miniWeekday: { fontSize: 10, color: "#9888CC" },
  miniBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  miniBadgeEmpty: { backgroundColor: "#F4F0FA" },
  miniEmoji: { fontSize: 15 },
  miniDate: { fontSize: 10, fontWeight: "700", color: "#5848A8" },

  dayList: { gap: 8 },
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
});
