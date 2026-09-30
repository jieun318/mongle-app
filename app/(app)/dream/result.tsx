import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import ScreenHeader from "@/components/ui/ScreenHeader";
import Markdown from "@/components/ui/Markdown";
import DreamEmoji from "@/components/dream/DreamEmoji";
import { useBottomSpace } from "@/lib/layout";
import { useDreamItem } from "@/features/dream/dreamQueries";
import {
  BADGE_STYLE,
  fromDreamItem,
  luckGauge,
  type DreamResult,
} from "@/features/dream/dreamResult";

// 꿈 해몽 결과 화면. 지금은 꿈 사전 항목(?itemId=)을 그린다 — 검색 결과·카테고리
// 목록에서 항목을 누르면 예전 DreamDetailModal 대신 여기로 온다.
// 화면은 DreamResult 만 알기 때문에 AI 챗 해몽도 어댑터만 붙이면 같은 화면을 쓴다.
export default function DreamResultScreen() {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const { data: item, isLoading } = useDreamItem(itemId?.toString());
  const result = useMemo(() => (item ? fromDreamItem(item) : null), [item]);

  return (
    <LinearGradient colors={["#F8F3FF", "#F3EDFC"]} style={styles.flex}>
      <ScreenHeader title="꿈 해몽 결과" fallbackHref="/(app)/search" />
      {result ? (
        <ResultBody result={result} />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>{isLoading ? "💭" : "🌫️"}</Text>
          <Text style={styles.emptyText}>
            {isLoading ? "꿈 조각을 불러오는 중..." : "꿈 조각을 찾을 수 없어요"}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

function ResultBody({ result }: { result: DreamResult }) {
  const router = useRouter();
  // 하단 버튼을 ScrollView 밖 고정 푸터로 둔다 — 본문이 길어도 버튼이 스크롤 뒤로
  // 밀리지 않게. 푸터는 화면 맨 아래라 시스템 내비 영역만큼 여백을 더한다.
  const space = useBottomSpace();
  const badge = BADGE_STYLE[result.badge];
  const gauge = luckGauge(result);

  const openRecord = () => {
    if (!result.dreamItemId) return;
    router.push({
      pathname: "/(app)/dream/new",
      params: { dreamItemId: result.dreamItemId },
    });
  };

  return (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 상단 — 구름·달 배경 위 이모지, 제목, 길흉 배지 */}
        <LinearGradient
          colors={["#FFF0F8", "#EDE3FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={[styles.deco, styles.decoMoon]}>🌙</Text>
          <Text style={[styles.deco, styles.decoCloudL]}>☁️</Text>
          <Text style={[styles.deco, styles.decoCloudR]}>☁️</Text>

          <DreamEmoji emoji={result.emoji} size={64} title={result.title} />
          <Text style={styles.title}>{result.title}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.pill, { backgroundColor: badge.bg }]}>
              <Text style={[styles.pillText, { color: badge.color }]}>
                {badge.emoji} {result.badge}
              </Text>
            </View>
            {result.categoryLabel ? (
              <View style={[styles.pill, styles.categoryPill]}>
                <Text style={[styles.pillText, styles.categoryText]}>
                  {result.categoryLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        {/* 한 줄 요약 */}
        {result.summary ? <Text style={styles.summary}>{result.summary}</Text> : null}

        {/* 상징·감정 칩 */}
        {result.chips.length > 0 && (
          <View style={styles.chipRow}>
            {result.chips.map((t) => (
              <View key={t.label} style={[styles.chip, { backgroundColor: t.bg }]}>
                <Text style={[styles.chipText, { color: t.color }]}>
                  {t.emoji ? `${t.emoji} ` : "#"}
                  {t.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 해몽 본문 — 마크다운 렌더. 한 문장짜리 본문이 요약으로 올라가 비면 숨긴다. */}
        {result.body ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>🔮 해몽</Text>
            <Markdown>{result.body}</Markdown>
          </View>
        ) : null}

        {/* 오늘 해볼 것 */}
        {result.actions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>✨ 오늘 해볼 것</Text>
            {result.actions.map((a, i) => (
              <View key={i} style={styles.actionRow}>
                <Text style={styles.actionCheck}>☑︎</Text>
                <Text style={styles.actionText}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 길몽/흉몽 강도 — 숫자 대신 약함/보통/강함 단계로. 라벨·색은 배지를
            따른다(사전 33건은 tags 와 is_warning 이 엇갈려 is_warning 을 따르면
            "길몽" 배지 아래 "흉몽"이 뜬다). 강도 계산은 luckGauge 참고. */}
        <View style={styles.card}>
          <Text style={styles.luckLabel}>{gauge.label}</Text>
          <View style={styles.progressBg}>
            <LinearGradient
              colors={gauge.bad ? ["#F0B898", "#D88868"] : ["#B898F0", "#8868D8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${gauge.strength}%` }]}
            />
          </View>
        </View>
      </ScrollView>

      {/* 하단 고정 버튼 영역. 이미지 공유는 네이티브 모듈이 들어가는 다음
          스토어 빌드에서 이 줄에 추가한다. */}
      {result.dreamItemId ? (
        <View style={[styles.footer, { paddingBottom: 16 + space.system }]}>
          <TouchableOpacity style={styles.btnPrimary} onPress={openRecord} activeOpacity={0.85}>
            <LinearGradient
              colors={["#B898F0", "#8868D8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnPrimaryGradient}
            >
              <Text style={styles.btnPrimaryText}>꿈 기록하기</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 14 },

  hero: {
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  deco: { position: "absolute", opacity: 0.45 },
  decoMoon: { top: 12, right: 18, fontSize: 22 },
  decoCloudL: { bottom: 14, left: 14, fontSize: 26 },
  decoCloudR: { top: 18, left: 36, fontSize: 16, opacity: 0.3 },
  title: {
    fontFamily: "OnglyphPDH",
    fontSize: 22,
    color: "#3828A0",
    textAlign: "center",
    paddingHorizontal: 16,
    letterSpacing: 0.3,
  },
  badgeRow: { flexDirection: "row", gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: "700" },
  categoryPill: { backgroundColor: "rgba(255,255,255,0.7)" },
  categoryText: { color: "#8868C8", fontWeight: "600" },

  summary: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: "700",
    color: "#3828A0",
    textAlign: "center",
    paddingHorizontal: 8,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  chipText: { fontSize: 12, fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  cardLabel: { fontSize: 12, fontWeight: "700", color: "#A898D8" },

  actionRow: { flexDirection: "row", gap: 8 },
  actionCheck: { fontSize: 14, color: "#8868D8", lineHeight: 22 },
  actionText: { flex: 1, fontSize: 14, color: "#5848A8", lineHeight: 22 },

  luckLabel: { fontSize: 13, fontWeight: "700", color: "#6848C0" },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: "#F0E8FF", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },

  // paddingBottom 은 16 + useBottomSpace().system 으로 렌더 시점에 지정.
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "rgba(248,243,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(180,160,230,0.18)",
  },
  btnPrimary: { flex: 1, borderRadius: 14, overflow: "hidden" },
  btnPrimaryGradient: { paddingVertical: 14, alignItems: "center" },
  btnPrimaryText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48, opacity: 0.6 },
  emptyText: { fontFamily: "OnglyphPDH", fontSize: 14, color: "#9888CC" },
});
