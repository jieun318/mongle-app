import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { DreamRecord } from "@/features/dream/dreams";
import { getCategoryById } from "@/features/dream/dreamData";

interface Props {
  dream: DreamRecord | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export default function RecordedDreamModal({ dream, onClose }: Props) {
  const category =
    dream?.category_id ? getCategoryById(dream.category_id)?.label : undefined;
  const isAi = dream?.source === "ai";

  return (
    <Modal
      visible={!!dream}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {dream && (
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.card}>
            <View style={styles.handle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <LinearGradient
                colors={["#FFF0F8", "#F0E8FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emojiWrap}
              >
                <Text style={styles.emoji}>{dream.emoji || "🌙"}</Text>
              </LinearGradient>

              <View style={styles.badgeRow}>
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
                {category ? (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{category}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.title}>{dream.title}</Text>
              <Text style={styles.dateText}>{formatDate(dream.dream_date)}</Text>

              {dream.content ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.smLabel}>내가 적은 꿈</Text>
                  <Text style={styles.desc}>{dream.content}</Text>
                </>
              ) : null}

              {isAi && dream.chat_preview.length > 0 ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.smLabel}>AI 대화</Text>
                  <View style={styles.chatBox}>
                    {dream.chat_preview.map((turn, i) => {
                      const me = turn.role === "user";
                      return (
                        <View
                          key={i}
                          style={[
                            styles.bubbleRow,
                            { alignItems: me ? "flex-end" : "flex-start" },
                          ]}
                        >
                          <View
                            style={[
                              styles.bubble,
                              me ? styles.bubbleMe : styles.bubbleAi,
                            ]}
                          >
                            <Text
                              style={[
                                styles.bubbleText,
                                { color: me ? "#fff" : "#3828A0" },
                              ]}
                            >
                              {turn.text}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {dream.mood_tags.length > 0 ? (
                <View style={styles.tagRow}>
                  {dream.mood_tags.map((t) => (
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

              <View style={styles.divider} />

              <View style={styles.luckRow}>
                <Text style={styles.luckLabel}>
                  {dream.is_warning ? "흉몽 지수" : "길운 지수"}
                </Text>
                <Text style={styles.luckValue}>{dream.luck_index}%</Text>
              </View>
              <View style={styles.progressBg}>
                <LinearGradient
                  colors={
                    dream.is_warning
                      ? ["#F0B898", "#D88868"]
                      : ["#B898F0", "#8868D8"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${dream.luck_index}%` }]}
                />
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>닫기</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(100,80,160,0.25)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "88%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8C8F0",
    alignSelf: "center",
    marginBottom: 12,
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 36, gap: 12 },
  emojiWrap: { borderRadius: 20, paddingVertical: 24, alignItems: "center" },
  emoji: { fontSize: 64 },
  badgeRow: { flexDirection: "row", justifyContent: "center", gap: 6 },
  sourceBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  sourceBadgeCard: { backgroundColor: "#EFE8FF" },
  sourceBadgeAi: { backgroundColor: "#E0F0FF" },
  sourceBadgeText: { fontSize: 11, fontWeight: "700" },
  sourceBadgeTextCard: { color: "#7868C8" },
  sourceBadgeTextAi: { color: "#3878C8" },
  categoryBadge: {
    backgroundColor: "#F0E8FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: "600", color: "#8868C8" },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#3828A0",
    textAlign: "center",
  },
  dateText: { fontSize: 12, color: "#9888CC", textAlign: "center" },

  divider: { height: 1, backgroundColor: "#F0E8FF", marginVertical: 4 },
  smLabel: { fontSize: 11, fontWeight: "600", color: "#A898D8" },
  desc: { fontSize: 13, color: "#5848A8", lineHeight: 22 },

  chatBox: { gap: 6 },
  bubbleRow: {},
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleMe: { backgroundColor: "#7868C8", borderBottomRightRadius: 4 },
  bubbleAi: { backgroundColor: "#F3EEFF", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 13, lineHeight: 19 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: "600" },

  luckRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  luckLabel: { fontSize: 12, fontWeight: "600", color: "#8868C8" },
  luckValue: { fontSize: 12, fontWeight: "700", color: "#6848C0" },
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F0E8FF",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },

  closeBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D8C8F0",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontWeight: "600", color: "#8868C8" },
});
