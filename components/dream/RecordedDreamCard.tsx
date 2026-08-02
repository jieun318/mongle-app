import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { DreamRecord } from "@/features/dream/dreams";
import {
  displayMoodTags,
  normalizeMoodTags,
} from "@/features/dream/dreamData";
import DreamEmoji from "@/components/dream/DreamEmoji";

interface Props {
  dream: DreamRecord;
  onPress: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

export default function RecordedDreamCard({
  dream,
  onPress,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
}: Props) {
  const isAi = dream.source === "ai";
  const userTurn = isAi
    ? dream.chat_preview.find((t) => t.role === "user")
    : null;

  // 스냅샷 컬럼이 비어있으면 join 된 dream_items 마스터에서 채움
  const item = dream.dream_item;
  const emoji = dream.emoji || item?.emoji || "";
  const snapshot = normalizeMoodTags(dream.mood_tags);
  const moodTags = snapshot.length > 0
    ? snapshot.filter((t) => t.label !== "길몽" && t.label !== "흉몽")
    : displayMoodTags(item?.mood_tags);
  const luckIndex = dream.luck_index || item?.luck_index || 0;
  const isWarning = dream.is_warning || item?.is_warning || false;

  return (
    <View style={[styles.cardWrap, menuOpen && styles.cardWrapElevated]}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={menuOpen ? onMenuClose : onPress}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerBadges}>
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
            {isWarning ? (
              <View style={styles.warningBadge}>
                <Text style={styles.warningBadgeText}>⚠️ 흉몽</Text>
              </View>
            ) : (
              <View style={styles.luckyBadge}>
                <Text style={styles.luckyBadgeText}>🍀 길몽</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.kebabBtn}
            onPress={onMenuToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.kebabText}>⋮</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          {emoji ? (
            <DreamEmoji
              emoji={emoji}
              size={20}
              title={item?.title ?? dream.title}
            />
          ) : null}
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

        <Text style={styles.dateBottom}>{formatDate(dream.dream_date)}</Text>
      </TouchableOpacity>

      {menuOpen ? (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onEdit}
          >
            <Text style={styles.menuItemText}>✏️ 수정</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onDelete}
          >
            <Text style={[styles.menuItemText, styles.menuItemDanger]}>
              🗑️ 삭제
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    position: "relative",
  },
  cardWrapElevated: {
    zIndex: 20,
    elevation: 6,
  },
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
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
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
  warningBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#FFE8E0",
  },
  warningBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D85838",
  },
  luckyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#E0F5E8",
  },
  luckyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#388858",
  },

  kebabBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  kebabText: {
    fontSize: 18,
    color: "#8868C8",
    fontWeight: "700",
    lineHeight: 20,
  },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 2,
  },
  luckValue: { fontSize: 12, fontWeight: "700", color: "#6848C0" },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F0E8FF",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },

  dateBottom: {
    fontSize: 10,
    color: "#A898D8",
    textAlign: "right",
    marginTop: 2,
  },

  menu: {
    position: "absolute",
    top: 38,
    right: 10,
    minWidth: 128,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.35)",
    shadowColor: "#5838B0",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 30,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5848A8",
  },
  menuItemDanger: {
    color: "#D85858",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F0E8FF",
    marginHorizontal: 8,
  },
});
