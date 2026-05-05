import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { DreamRecord } from "@/features/dream/dreams";

interface Props {
  dream: DreamRecord;
  onPress: () => void;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

export default function RecordedDreamCard({ dream, onPress }: Props) {
  const isAi = dream.source === "ai";
  const userTurn = isAi
    ? dream.chat_preview.find((t) => t.role === "user")
    : null;

  // 스냅샷 컬럼이 비어있으면 join 된 dream_items 마스터에서 채움
  const item = dream.dream_item;
  const emoji = dream.emoji || item?.emoji || "";
  const moodTags =
    dream.mood_tags && dream.mood_tags.length > 0
      ? dream.mood_tags
      : (item?.mood_tags ?? []);
  const luckIndex =
    dream.luck_index || item?.luck_index || 0;
  const isWarning = dream.is_warning || item?.is_warning || false;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.sourceBadge,
            isAi ? styles.sourceBadgeAi : styles.sourceBadgeCard,
          ]}
        >
          <Text
            style={[
              styles.sourceBadgeText,
              isAi ? styles.sourceBadgeTextAi : styles.sourceBadgeTextCard,
            ]}
          >
            {isAi ? "🤖 AI 챗봇" : "🔮 카드 해몽"}
          </Text>
        </View>
        <Text style={styles.date}>{formatDate(dream.dream_date)}</Text>
      </View>

      <View style={styles.titleRow}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          {dream.title}
        </Text>
      </View>

      {isAi && userTurn ? (
        <View style={styles.bubbleRow}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText} numberOfLines={2}>
              {userTurn.text}
            </Text>
          </View>
        </View>
      ) : dream.content ? (
        <Text style={styles.preview} numberOfLines={2}>
          {dream.content}
        </Text>
      ) : null}

      {moodTags.length > 0 ? (
        <View style={styles.tagRow}>
          {moodTags.slice(0, 3).map((t) => (
            <View
              key={t.label}
              style={[styles.tag, { backgroundColor: t.bg }]}
            >
              <Text style={[styles.tagText, { color: t.color }]}>
                {t.emoji} {t.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.luckRow}>
        <Text style={styles.luckLabel}>
          {isWarning ? "흉몽 지수" : "길운 지수"}
        </Text>
        <Text style={styles.luckValue}>{luckIndex}%</Text>
      </View>
      <View style={styles.progressBg}>
        <LinearGradient
          colors={isWarning ? ["#F0B898", "#D88868"] : ["#B898F0", "#8868D8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${luckIndex}%` }]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceBadgeCard: { backgroundColor: "#EFE8FF" },
  sourceBadgeAi: { backgroundColor: "#E0F0FF" },
  sourceBadgeText: { fontSize: 11, fontWeight: "700" },
  sourceBadgeTextCard: { color: "#7868C8" },
  sourceBadgeTextAi: { color: "#3878C8" },
  date: { fontSize: 11, color: "#9888CC" },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  emoji: { fontSize: 20 },
  title: { flex: 1, fontSize: 14, fontWeight: "700", color: "#3828A0" },

  preview: { fontSize: 12, color: "#7868B8", lineHeight: 18 },

  bubbleRow: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "85%",
    backgroundColor: "#7868C8",
    borderRadius: 14,
    borderBottomRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleText: { fontSize: 12, color: "#fff", lineHeight: 18 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, fontWeight: "600" },

  luckRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  luckLabel: { fontSize: 11, fontWeight: "600", color: "#8868C8" },
  luckValue: { fontSize: 12, fontWeight: "700", color: "#6848C0" },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F0E8FF",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
});
