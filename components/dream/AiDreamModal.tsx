import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import type { DreamRecord } from "@/features/dream/dreams";
import { displayMoodTags } from "@/features/dream/dreamData";

interface Props {
  dream: DreamRecord | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

// AI 답변은 빈 줄("\n\n") 로 문단을 구분한다. 화면에선 문단 사이에 간격을 줘서 가독성 ↑.
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const PREVIEW_TURNS = 3;

export default function AiDreamModal({ dream, onClose }: Props) {
  const [showAll, setShowAll] = useState(false);

  // 모달이 닫힐 때 펼친 상태도 초기화
  const handleClose = () => {
    setShowAll(false);
    onClose();
  };

  // 해몽 요약 — interpretation_summary 가 우선. 레거시 데이터는 사용자 입력으로 폴백.
  // 챗봇 첫 답변은 의도적으로 폴백에서 제외 — "해몽 요약" 카드에 챗 본문이 들어가는 걸 방지.
  const summary = dream?.interpretation_summary?.trim() || dream?.content || "";

  const moodTags = displayMoodTags(dream?.mood_tags);

  const luckIndex = dream?.luck_index ?? 0;

  const turns = dream?.chat_preview ?? [];
  const visibleTurns = showAll ? turns : turns.slice(0, PREVIEW_TURNS);
  const hasMore = turns.length > PREVIEW_TURNS;

  return (
    <Modal
      visible={!!dream}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {dream && (
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleClose}
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* 꿈 내용을 대표하는 큰 이모지 비주얼 */}
              <View style={styles.heroEmojiWrap}>
                <Text style={styles.heroEmojiText}>{dream.emoji || "🌙"}</Text>
              </View>

              {/* AI 뱃지 */}
              <View style={styles.badgeRow}>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>🤖 AI챗봇</Text>
                </View>
              </View>

              {/* 제목 + 날짜 */}
              <Text style={styles.title}>{dream.title}</Text>
              <Text style={styles.date}>{formatDate(dream.dream_date)}</Text>

              {/* 해몽 요약 — 빈 줄 기준 문단 분리 */}
              {summary ? (
                <>
                  <Text style={styles.sectionLabel}>해몽 요약</Text>
                  <View style={styles.summaryCard}>
                    {splitParagraphs(summary).map((p, i) => (
                      <Text
                        key={i}
                        style={[
                          styles.summaryText,
                          i > 0 && styles.paragraphGap,
                        ]}
                      >
                        {p}
                      </Text>
                    ))}
                  </View>
                </>
              ) : null}

              {/* 태그 */}
              {moodTags.length > 0 ? (
                <View style={styles.tagRow}>
                  {moodTags.map((t) => (
                    <View key={t.label} style={styles.tag}>
                      <Text style={styles.tagText}>#{t.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* 길운 지수 */}
              <View style={styles.luckCard}>
                <Text style={styles.luckLabel}>길운 지수</Text>
                <Text style={styles.luckValue}>{luckIndex}%</Text>
                <View style={styles.progressBg}>
                  <LinearGradient
                    colors={["#F0A8C8", "#9B7BD8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${luckIndex}%` }]}
                  />
                </View>
              </View>

              {/* 대화 기록 */}
              {turns.length > 0 ? (
                <>
                  <Text style={styles.sectionLabel}>AI 챗봇 대화 기록</Text>
                  <View style={styles.chatBox}>
                    {visibleTurns.map((turn, i) => {
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
                            {splitParagraphs(turn.text).map((p, pi) => (
                              <Text
                                key={pi}
                                style={[
                                  styles.bubbleText,
                                  { color: me ? "#fff" : "#5848A8" },
                                  pi > 0 && styles.paragraphGap,
                                ]}
                              >
                                {p}
                              </Text>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {hasMore ? (
                    <TouchableOpacity
                      style={styles.expandBtn}
                      activeOpacity={0.7}
                      onPress={() => setShowAll((v) => !v)}
                    >
                      <Text style={styles.expandBtnText}>
                        {showAll ? "간단히 보기 ↑" : "대화 전체 보기 ↓"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}

              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
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
    backgroundColor: "rgba(60,45,95,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#F8F6FB",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8C8F0",
    alignSelf: "center",
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 12,
  },

  heroEmojiWrap: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#F3EEFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.25)",
    marginVertical: 4,
  },
  heroEmojiText: { fontSize: 38, lineHeight: 46 },

  badgeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: -4,
  },
  aiBadge: {
    backgroundColor: "#7868C8",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#5848A8",
    textAlign: "center",
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: "#9B8BB4",
    textAlign: "center",
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5848A8",
    marginTop: 8,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  summaryText: {
    fontSize: 13,
    color: "#5848A8",
    lineHeight: 21,
  },
  paragraphGap: { marginTop: 8 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "#F0E8FF",
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { fontSize: 12, fontWeight: "600", color: "#7868C8" },

  luckCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
    gap: 8,
  },
  luckLabel: { fontSize: 12, fontWeight: "600", color: "#9B8BB4" },
  luckValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#C868A0",
    letterSpacing: -0.5,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F3EEFF",
    overflow: "hidden",
    marginTop: 2,
  },
  progressFill: { height: "100%", borderRadius: 4 },

  chatBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
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

  expandBtn: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8C8F0",
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7868C8",
  },

  closeBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D8C8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  closeBtnText: { fontSize: 14, fontWeight: "600", color: "#7868C8" },
});
