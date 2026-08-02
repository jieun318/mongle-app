import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { DreamRecord } from "@/features/dream/dreams";
import { displayMoodTags } from "@/features/dream/dreamData";

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

export default function AiDreamCard({
  dream,
  onPress,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
}: Props) {
  // 미리보기 텍스트 — AI 가 추출한 해몽 요약을 우선 사용.
  // 레거시 데이터(interpretation_summary 비어있음) 는 사용자가 적은 꿈 내용으로 폴백.
  // 챗봇 첫 답변(aiTurn) 은 의도적으로 폴백에서 제외 — 카드에 챗 본문이 그대로 노출되는 걸 방지.
  const previewText = dream.interpretation_summary?.trim() || dream.content;

  const moodTags = displayMoodTags(dream.mood_tags);

  const luckIndex = dream.luck_index ?? 0;

  return (
    <View style={[styles.cardWrap, menuOpen && styles.cardWrapElevated]}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={menuOpen ? onMenuClose : onPress}
      >
        {/* 상단: AI 뱃지 + 날짜 + 메뉴 */}
        <View style={styles.topRow}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>🤖 AI챗봇</Text>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.date}>{formatDate(dream.dream_date)}</Text>
            <TouchableOpacity
              style={styles.kebabBtn}
              onPress={onMenuToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.kebabText}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 본문: 꿈 내용 이모지 + 텍스트 */}
        <View style={styles.bodyRow}>
          <View style={styles.emojiCircle}>
            <Text style={styles.emojiCircleText}>{dream.emoji || "🌙"}</Text>
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>
              {dream.title}
            </Text>
            {previewText ? (
              <Text style={styles.preview} numberOfLines={2}>
                {previewText}
              </Text>
            ) : null}
            {moodTags.length > 0 ? (
              <View style={styles.tagRow}>
                {moodTags.slice(0, 3).map((t) => (
                  <View key={t.label} style={styles.tag}>
                    <Text style={styles.tagText}>#{t.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* 길운 지수 바 */}
        <View style={styles.luckBlock}>
          <View style={styles.luckRow}>
            <Text style={styles.luckLabel}>길운 지수</Text>
            <Text style={styles.luckValue}>{luckIndex}%</Text>
          </View>
          <View style={styles.progressBg}>
            <LinearGradient
              colors={["#F0A8C8", "#9B7BD8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${luckIndex}%` }]}
            />
          </View>
        </View>
      </TouchableOpacity>

      {menuOpen ? (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onEdit}
          >
            <Text style={styles.menuItemText}>✏️  수정</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onDelete}
          >
            <Text style={[styles.menuItemText, styles.menuItemDanger]}>
              🗑️  삭제
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: { position: "relative" },
  cardWrapElevated: { zIndex: 20, elevation: 6 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
    shadowColor: "#5838B0",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiBadge: {
    backgroundColor: "#7868C8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  topRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  date: { fontSize: 11, color: "#9B8BB4" },

  kebabBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  kebabText: {
    fontSize: 16,
    color: "#9B8BB4",
    fontWeight: "700",
    lineHeight: 18,
  },

  bodyRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  emojiCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#F3EEFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.25)",
  },
  emojiCircleText: { fontSize: 34, lineHeight: 40 },
  textCol: { flex: 1, gap: 6, paddingTop: 2 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5848A8",
  },
  preview: {
    fontSize: 12,
    color: "#9B8BB4",
    lineHeight: 18,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tag: {
    backgroundColor: "#F0E8FF",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: "#7868C8" },

  luckBlock: { gap: 6 },
  luckRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  luckLabel: { fontSize: 11, fontWeight: "600", color: "#9B8BB4" },
  luckValue: { fontSize: 13, fontWeight: "700", color: "#C868A0" },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F3EEFF",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },

  menu: {
    position: "absolute",
    top: 38,
    right: 14,
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
  menuItem: { paddingHorizontal: 14, paddingVertical: 10 },
  menuItemText: { fontSize: 13, fontWeight: "600", color: "#5848A8" },
  menuItemDanger: { color: "#D85858" },
  menuDivider: {
    height: 1,
    backgroundColor: "#F0E8FF",
    marginHorizontal: 8,
  },
});
