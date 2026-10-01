import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import ScreenHeader from "@/components/ui/ScreenHeader";
import Markdown from "@/components/ui/Markdown";
import DreamEmoji from "@/components/dream/DreamEmoji";
import { useBottomSpace } from "@/lib/layout";
import {
  BookOpenIcon,
  ChatBubbleIcon,
  CheckCircleIcon,
  CheckIcon,
  CloudIcon,
  CloverIcon,
  HeartIcon,
  MoonIcon,
  SparklesIcon,
  WarningIcon,
} from "@/components/ui/icons";
import { useDreamItem } from "@/features/dream/dreamQueries";
import { loadChatSession } from "@/features/chat/chatSession";
import { segmentHasCrisis } from "@/features/chat/answer";
import { SAFETY_STUB } from "@/features/chat/safety";
import {
  BADGE_STYLE,
  fromChat,
  fromDreamItem,
  luckGauge,
  type DreamResult,
} from "@/features/dream/dreamResult";

// "대화 이어가기" 때만 필요하다 — 결과 화면 첫 렌더를 무겁게 하지 않도록 지연 로드.
const ChatBotModal = lazy(() => import("@/components/chat/ChatBotModal"));

// 꿈 해몽 결과 화면. 두 곳에서 온다.
//   ?itemId=  꿈 사전 항목 — 검색 결과·카테고리 목록에서 항목을 눌렀을 때
//   ?chat=    채팅 해몽 답변 id — 해몽 답변 아래 "해몽 결과 카드 보기"
// 화면은 DreamResult 만 알고, 출처별 어댑터(fromDreamItem / fromChat)가 차이를 흡수한다.
export default function DreamResultScreen() {
  const { itemId, chat } = useLocalSearchParams<{ itemId?: string; chat?: string }>();
  return (
    <LinearGradient colors={["#F8F3FF", "#F3EDFC"]} style={styles.flex}>
      <ScreenHeader title="꿈 해몽 결과" fallbackHref="/(app)/search" />
      {chat ? <ChatResult answerId={chat.toString()} /> : <DictResult itemId={itemId?.toString()} />}
    </LinearGradient>
  );
}

// 이모지 대신 SVG 아이콘 — 오래된 안드로이드는 기기 폰트에 없는 이모지를 네모로 그린다.
function Empty({ icon, text }: { icon: "loading" | "missing"; text: string }) {
  return (
    <View style={styles.empty}>
      {icon === "loading" ? <ChatBubbleIcon size={44} color="#B8A8E0" /> : <CloudIcon size={44} color="#B8A8E0" />}
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ── 꿈 사전 항목 ─────────────────────────────────────────
function DictResult({ itemId }: { itemId?: string }) {
  const router = useRouter();
  const space = useBottomSpace();
  const { data: item, isLoading } = useDreamItem(itemId);
  const result = useMemo(() => (item ? fromDreamItem(item) : null), [item]);
  if (!result) {
    return <Empty icon={isLoading ? "loading" : "missing"} text={isLoading ? "꿈 조각을 불러오는 중..." : "꿈 조각을 찾을 수 없어요"} />;
  }
  // 하단 고정 버튼 영역. 이미지 공유는 네이티브 모듈이 들어가는 다음
  // 스토어 빌드에서 이 줄에 추가한다.
  const footer = (
    <View style={[styles.footer, { paddingBottom: 16 + space.system }]}>
      <PrimaryButton
        label="꿈 기록하기"
        onPress={() =>
          router.push({ pathname: "/(app)/dream/new", params: { dreamItemId: result.dreamItemId } })
        }
      />
    </View>
  );
  return <ResultBody result={result} footer={footer} />;
}

// ── 채팅 해몽 ────────────────────────────────────────────
// 결과는 기기에 24시간 보관되는 대화 세션에서 읽는다. 그래서 웹 새로고침·주소 직접 진입도
// 24시간 안이면 그대로 뜬다.
type ChatState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "crisis" }
  | { status: "ok"; result: DreamResult; saved: boolean };

function useChatResult(answerId: string, reloadKey: number): ChatState {
  const [state, setState] = useState<ChatState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    loadChatSession().then((s) => {
      if (cancelled) return;
      const idx = s ? s.messages.findIndex((m) => m.id === answerId) : -1;
      if (!s || idx < 0) return setState({ status: "missing" });
      // 위기 발화가 있는 대화는 결과 카드를 그리지 않는다 — 주소로 직접 들어와도.
      if (segmentHasCrisis(s.messages, answerId)) return setState({ status: "crisis" });
      if (!s.meta || s.metaMsgId !== answerId) return setState({ status: "missing" });
      const seg = s.lastSave;
      setState({
        status: "ok",
        result: fromChat(s.meta, s.messages[idx].content),
        saved: !!seg && idx >= seg.from && idx < seg.to,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [answerId, reloadKey]);
  return state;
}

function ChatResult({ answerId }: { answerId: string }) {
  const router = useRouter();
  const space = useBottomSpace();
  // 대화 이어가기 후 돌아오면 저장 상태가 바뀌었을 수 있어 다시 읽는다.
  const [reloadKey, setReloadKey] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const state = useChatResult(answerId, reloadKey);

  const continueChat = () => setChatOpen(true);
  const chatModal = chatOpen ? (
    <Suspense fallback={null}>
      <ChatBotModal
        visible
        onClose={() => {
          setChatOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />
    </Suspense>
  ) : null;

  if (state.status === "loading") return <Empty icon="loading" text="해몽 결과를 불러오는 중..." />;
  if (state.status === "missing") {
    return (
      <>
        <Empty icon="missing" text={"대화가 만료됐거나 찾을 수 없어요\n몽이와 나눈 대화는 24시간 동안 보관돼요"} />
        <View style={[styles.footer, { paddingBottom: 16 + space.system }]}>
          <PrimaryButton label="몽이와 대화하기" onPress={continueChat} />
        </View>
        {chatModal}
      </>
    );
  }
  if (state.status === "crisis") {
    // 채팅의 위기 안내와 같은 문구(상담 연락처 포함)를 그대로 보여준다.
    return (
      <>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
          <View style={[styles.card, styles.safetyCard]}>
            <CardLabel icon={<HeartIcon size={15} color={LABEL_COLOR} />}>지금 마음이 먼저예요</CardLabel>
            <Text style={styles.safetyText}>{SAFETY_STUB}</Text>
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: 16 + space.system }]}>
          <PrimaryButton label="대화로 돌아가기" onPress={continueChat} />
        </View>
        {chatModal}
      </>
    );
  }

  const footer = (
    <View style={[styles.footer, { paddingBottom: 16 + space.system }]}>
      <TouchableOpacity style={styles.btnSecondary} onPress={continueChat} activeOpacity={0.85}>
        <View style={styles.btnRow}>
          <ChatBubbleIcon size={18} color="#7868C8" />
          <Text style={styles.btnSecondaryText}>대화 이어가기</Text>
        </View>
      </TouchableOpacity>
      {state.saved ? (
        <PrimaryButton icon={<CheckIcon size={18} color="#fff" />} label="보관함에서 보기" onPress={() => router.push("/(app)/storage")} />
      ) : (
        <View style={[styles.btnPrimary, styles.btnDisabled]}>
          <Text style={styles.btnDisabledText}>아직 보관함에 없어요</Text>
        </View>
      )}
    </View>
  );
  return (
    <>
      <ResultBody result={state.result} footer={footer} />
      {chatModal}
    </>
  );
}

const LABEL_COLOR = "#A898D8";

function CardLabel({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <View style={styles.cardLabelRow}>
      {icon}
      <Text style={styles.cardLabel}>{children}</Text>
    </View>
  );
}

function BadgeIcon({ badge, color }: { badge: DreamResult["badge"]; color: string }) {
  if (badge === "길몽") return <CloverIcon size={14} color={color} />;
  if (badge === "흉몽") return <WarningIcon size={14} color={color} />;
  return <MoonIcon size={14} color={color} />;
}

function PrimaryButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: ReactNode }) {
  return (
    <TouchableOpacity style={styles.btnPrimary} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={["#B898F0", "#8868D8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btnPrimaryGradient}
      >
        <View style={styles.btnRow}>
          {icon}
          <Text style={styles.btnPrimaryText}>{label}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function ResultBody({ result, footer }: { result: DreamResult; footer: ReactNode }) {
  // 하단 버튼(footer)은 ScrollView 밖 고정 — 본문이 길어도 버튼이 스크롤 뒤로 밀리지 않게.
  const badge = BADGE_STYLE[result.badge];
  const gauge = luckGauge(result);

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
          <View style={[styles.deco, styles.decoMoon]}>
            <MoonIcon size={22} color="#C9A050" />
          </View>
          <View style={[styles.deco, styles.decoCloudL]}>
            <CloudIcon size={28} color="#A898D8" />
          </View>
          <View style={[styles.deco, styles.decoCloudR]}>
            <CloudIcon size={18} color="#A898D8" />
          </View>

          <DreamEmoji emoji={result.emoji} size={64} title={result.title} />
          <Text style={styles.title}>{result.title}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.pill, { backgroundColor: badge.bg }]}>
              <View style={styles.btnRow}>
                <BadgeIcon badge={result.badge} color={badge.color} />
                <Text style={[styles.pillText, { color: badge.color }]}>{result.badge}</Text>
              </View>
            </View>
            {result.categoryLabel ? (
              <View style={[styles.pill, styles.categoryPill]}>
                <Text style={[styles.pillText, styles.categoryText]}>
                  {result.categoryLabel}
                </Text>
              </View>
            ) : null}
            {result.source === "ai" ? (
              <View style={[styles.pill, styles.categoryPill]}>
                <Text style={[styles.pillText, styles.categoryText]}>몽이 해몽</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        {/* 한 줄 요약 */}
        {result.summary ? <Text style={styles.summary}>{result.summary}</Text> : null}

        {/* 상징 칩 */}
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
            <CardLabel icon={<BookOpenIcon size={15} color={LABEL_COLOR} />}>해몽</CardLabel>
            <Markdown>{result.body}</Markdown>
          </View>
        ) : null}

        {/* 지금 나의 마음 — 채팅 해몽에서만(감정 칩 + 메타 feeling). 해석(interpretation)은 쓰지 않는다 */}
        {result.feeling || (result.moods && result.moods.length > 0) ? (
          <View style={styles.card}>
            <CardLabel icon={<HeartIcon size={15} color={LABEL_COLOR} />}>지금 나의 마음</CardLabel>
            {result.moods && result.moods.length > 0 ? (
              <View style={[styles.chipRow, styles.chipRowLeft]}>
                {result.moods.map((t) => (
                  <View key={t.label} style={[styles.chip, { backgroundColor: t.bg }]}>
                    <Text style={[styles.chipText, { color: t.color }]}>{t.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {result.feeling ? <Text style={styles.feelingText}>{result.feeling}</Text> : null}
          </View>
        ) : null}

        {/* 오늘 해볼 것 */}
        {result.actions.length > 0 && (
          <View style={styles.card}>
            <CardLabel icon={<SparklesIcon size={15} color={LABEL_COLOR} />}>오늘 해볼 것</CardLabel>
            {result.actions.map((a, i) => (
              <View key={i} style={styles.actionRow}>
                <View style={styles.actionCheck}>
                  <CheckCircleIcon size={18} color="#8868D8" />
                </View>
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

      {footer}
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
  deco: { position: "absolute", opacity: 0.55 },
  decoMoon: { top: 14, right: 18 },
  decoCloudL: { bottom: 14, left: 14 },
  decoCloudR: { top: 18, left: 36, opacity: 0.35 },
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
  actionCheck: { paddingTop: 2 },
  cardLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
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
  btnSecondary: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D8C8F0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  btnSecondaryText: { fontSize: 15, fontWeight: "700", color: "#7868C8" },
  btnDisabled: { backgroundColor: "#EEE8F8", alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  btnDisabledText: { fontSize: 14, fontWeight: "600", color: "#A898D8" },

  chipRowLeft: { justifyContent: "flex-start" },
  feelingText: { fontSize: 14, color: "#5848A8", lineHeight: 23 },
  safetyCard: { marginTop: 8 },
  safetyText: { fontSize: 15, color: "#3828A0", lineHeight: 25 },

  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontFamily: "OnglyphPDH", fontSize: 14, color: "#9888CC", textAlign: "center", lineHeight: 22 },
});
