import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  InteractionManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomSpace } from "@/lib/layout";
import { useFocusEffect, useRouter } from "expo-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import { SearchIcon } from "@/components/ui/icons";
// 챗봇은 실제로 열 때만 로드 — 검색 탭 진입 시 무거운 챗 모듈을 지연시킨다.
// 진입 후 idle 에 백그라운드 예열해 첫 열기는 즉시 되게 한다(아래 useEffect).
const importChatModal = () => import("@/components/chat/ChatBotModal");
const ChatBotModal = lazy(importChatModal);
import {
  CATEGORIES,
  TRENDING_KEYWORDS,
  DreamCategory,
} from "@/features/dream/dreamData";
import { getRecentSearches, addRecentSearch } from "@/features/dream/recentSearches";

const GRID_PADDING = 20;
const GRID_GAP = 10;
// 카드 폭은 셸 폭에서 역산하지 않고 그리드 컨테이너를 직접 잰다.
//
// 역산하면 프리렌더에서 틀린다 — 정적 익스포트는 폭을 모른 채 그려지므로 셸
// 최대 폭(480)을 가정해 카드가 140px 로 박히는데, 실제 컨테이너가 350px 인
// 폰에서는 3개(440px)가 안 들어가 2열로 떨어진다(실측 확인).
// 컨테이너 onLayout 은 웹·네이티브 모두에서 실제 값을 주고 창 크기 변화도 따라간다.
//
// 측정 전(첫 렌더·프리렌더)에는 퍼센트 폭으로 그린다 — 컨테이너가 몇 px 이든
// 3열이 유지되므로 프리렌더 HTML 도 깨지지 않는다.
function cardSizeFor(gridW: number): number {
  // floor 하지 않으면 3*CARD_W + 2*GAP 가 컨테이너보다 1px 넘쳐 3번째 카드가
  // 다음 줄로 밀린다(특정 화면 밀도에서 2열로 깨짐). 내림해서 한 줄 3열을 보장.
  return Math.floor((gridW - GRID_GAP * 2) / 3);
}

const MAX_CHIPS = 8;
const normalizeKw = (s: string) => s.replace(/^#/, "").trim();

// 표시할 키워드 칩: 사용자의 최근 검색어를 앞에 두고(개인화), 부족하면 기본
// 인기 키워드로 채운다. 중복(‘#돼지’ vs ‘돼지’)은 정규화해서 제거.
function buildKeywordChips(recents: string[]): string[] {
  const seen = new Set(recents.map(normalizeKw));
  const chips = [...recents];
  for (const k of TRENDING_KEYWORDS) {
    if (chips.length >= MAX_CHIPS) break;
    if (!seen.has(normalizeKw(k))) {
      chips.push(k);
      seen.add(normalizeKw(k));
    }
  }
  return chips;
}

export default function SearchScreen() {
  const space = useBottomSpace();
  const [gridW, setGridW] = useState(0);
  const cardSize = gridW > 0 ? cardSizeFor(gridW) : 0;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showChat, setShowChat] = useState(false);
  // 챗봇을 한 번이라도 열었는지 — 열린 뒤엔 계속 마운트 유지(닫힘 애니 보존).
  const [chatMounted, setChatMounted] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  // 진입 후 idle 에 챗 모듈 예열 — 첫 열기 지연 제거 (import 캐시되어 1회만).
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      importChatModal();
    });
    return () => task.cancel();
  }, []);

  // 화면 포커스마다 최근 검색어를 다시 읽는다 → 검색 후 돌아오면 칩이 갱신됨.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getRecentSearches().then((r) => {
        if (active) setRecent(r);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const goCategory = (cat: DreamCategory) => {
    router.push(`/(app)/search/${cat.id}`);
  };

  const goResults = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed); // 개인화용 기록 (fire-and-forget, 복귀 시 갱신됨)
    router.push(`/(app)/search/results?q=${encodeURIComponent(trimmed)}`);
  };

  const handleTrendingTap = (kw: string) => {
    const cleaned = normalizeKw(kw);
    setQuery(cleaned);
    goResults(cleaned);
  };

  const chips = buildKeywordChips(recent);
  const hasRecent = recent.length > 0;

  return (
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: space.withNav },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>
            어젯밤, 당신의 기억 속에 남은{"\n"}꿈 조각은 무엇인가요?
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <SearchIcon size={16} color="#9888CC" />
          <TextInput
            style={styles.searchInput}
            placeholder="어떤 꿈 조각을 찾으시나요?"
            placeholderTextColor="#A898D8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => goResults(query)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {hasRecent ? "🕘 최근 검색어" : "🔥 지금 뜨는 꿈 키워드"}
          </Text>
          <View style={styles.tagRow}>
            {chips.map((kw) => (
              <TouchableOpacity
                key={kw}
                style={styles.trendTag}
                onPress={() => handleTrendingTap(kw)}
              >
                <Text style={styles.trendTagText}>
                  {kw.startsWith("#") ? kw : `#${kw}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View
          style={styles.categoryGrid}
          onLayout={(e) => setGridW(e.nativeEvent.layout.width)}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                cardSize > 0
                  ? { width: cardSize, height: cardSize }
                  : styles.categoryCardAuto,
                { backgroundColor: cat.bg },
              ]}
              activeOpacity={0.85}
              onPress={() => goCategory(cat)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.85}
          onPress={() => {
            setChatMounted(true);
            setShowChat(true);
          }}
        >
          <Text style={styles.ctaText}>
            원하는 꿈 조각이 없나요?{"\n"}
            옆에 있는 몽이를 클릭해 바로 물어보세요!
          </Text>
          <Image
            source={require("@/assets/images/chatboticon.png")}
            style={styles.ctaMascot}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </ScrollView>

      <BottomNav active="search" />

      {chatMounted && (
        <Suspense fallback={null}>
          <ChatBotModal visible={showChat} onClose={() => setShowChat(false)} />
        </Suspense>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 60,
    // paddingBottom 은 useBottomSpace().withNav 로 렌더 시점에 덮어쓴다.
    paddingHorizontal: GRID_PADDING,
    gap: 20,
  },

  header: { paddingTop: 4 },
  headerText: {
    fontFamily: "OnglyphPDH",
    fontSize: 18,
    color: "#6858B8",
    lineHeight: 28,
    letterSpacing: 0.5,
  },

  searchWrap: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.2)",
  },
  searchInput: { flex: 1, fontSize: 13, color: "#6858B8", padding: 0 },

  section: { gap: 8 },
  sectionLabel: {
    fontFamily: "OnglyphPDH",
    fontSize: 14,
    color: "#8878CC",
    letterSpacing: 0.5,
  },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  trendTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.3)",
  },
  trendTagText: { fontFamily: "OnglyphPDH", fontSize: 13, color: "#7868B8" },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  // 측정 전 폴백 — 31% x 3 + gap 20 이 어떤 컨테이너 폭에서도 3열에 들어간다.
  categoryCardAuto: { width: "31%", aspectRatio: 1 },
  categoryCard: {
    // width/height 는 컨테이너를 잰 값으로 렌더 시점에 주입한다.
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  categoryEmoji: { fontSize: 30, textAlign: "center", lineHeight: 36 },
  categoryLabel: {
    fontFamily: "OnglyphPDH",
    fontSize: 14,
    color: "#5848A8",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF9F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(230,210,180,0.3)",
  },
  ctaText: {
    fontFamily: "OnglyphPDH",
    fontSize: 13,
    color: "#B09060",
    lineHeight: 20,
    letterSpacing: 0.3,
    flex: 1,
  },
  ctaMascot: { width: 48, height: 48, marginLeft: 8 },
});
