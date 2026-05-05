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
  computeWeeklyHistory,
  listMyDreams,
  type DreamRecord,
  type WeeklyFortuneCard,
} from "@/features/dream/dreams";
import { cardGradeFromLuck } from "@/features/fortune/grade";

interface MonthGroup {
  monthLabel: string;
  cards: WeeklyFortuneCard[];
}

function groupByMonth(cards: WeeklyFortuneCard[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let current: MonthGroup | null = null;
  for (const c of cards) {
    if (!current || current.monthLabel !== c.monthLabel) {
      current = { monthLabel: c.monthLabel, cards: [] };
      groups.push(current);
    }
    current.cards.push(c);
  }
  return groups;
}

export default function FortuneHistoryScreen() {
  const router = useRouter();
  const [dreams, setDreams] = useState<DreamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await listMyDreams();
    if (!error) setDreams(data ?? []);
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

  const cards = useMemo(() => computeWeeklyHistory(dreams), [dreams]);
  const months = useMemo(() => groupByMonth(cards), [cards]);

  return (
    <LinearGradient colors={["#EDE9FF", "#F5F0FF", "#FFF8F0"]} style={{ flex: 1 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>지난 운세</Text>
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
                아직 기록된 운세가 없어요{"\n"}꿈을 기록하면 여기에 모여요
              </Text>
            </View>
          ) : (
            months.map((m) => (
              <View key={m.monthLabel} style={styles.monthGroup}>
                <Text style={styles.monthLabel}>{m.monthLabel}</Text>
                {m.cards.map((c) => {
                  const grade = cardGradeFromLuck(c.avgLuck);
                  return (
                    <View key={c.weekStartYMD} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.range}>{c.rangeLabel}</Text>
                        <View
                          style={[styles.badge, { backgroundColor: grade.bg }]}
                        >
                          <Text style={[styles.badgeText, { color: grade.color }]}>
                            {grade.emoji} {grade.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.summary} numberOfLines={2}>
                        {c.topTitle
                          ? `‘${c.topTitle}’ 외 꿈 ${c.count}개 · 평균 운세 ${c.avgLuck}%`
                          : `꿈 ${c.count}개 · 평균 운세 ${c.avgLuck}%`}
                      </Text>
                    </View>
                  );
                })}
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
  scroll: { padding: 20, paddingTop: 12, paddingBottom: 60, gap: 18 },

  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 48, opacity: 0.7 },
  emptyText: {
    fontFamily: "OnglyphPDH",
    fontSize: 14,
    color: "#9888CC",
    textAlign: "center",
    lineHeight: 22,
  },

  monthGroup: { gap: 8 },
  monthLabel: {
    fontFamily: "OnglyphPDH",
    fontSize: 16,
    color: "#5848A8",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  range: { flex: 1, fontSize: 13, fontWeight: "700", color: "#3828A0" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  summary: { fontSize: 12, color: "#7868B8", lineHeight: 18 },
});
