import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  type ListRenderItem,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import BottomNav from "@/components/ui/BottomNav";
import { SearchIcon } from "@/components/ui/icons";
import { useBottomSpace } from "@/lib/layout";
import RecordedDreamCard from "@/components/dream/RecordedDreamCard";
import RecordedDreamModal from "@/components/dream/RecordedDreamModal";
import AiDreamCard from "@/components/dream/AiDreamCard";
import AiDreamModal from "@/components/dream/AiDreamModal";
import { normalizeMoodTags } from "@/features/dream/dreamData";
import {
  DreamRecord,
  DreamSource,
  computeStats,
  deleteDream,
  myDreamsKey,
} from "@/features/dream/dreams";
import { useMyDreams } from "@/features/dream/dreamQueries";
import { useSession } from "@/features/auth/auth";
import { queryClient } from "@/lib/queryClient";
import { useRefetchStaleOnFocus } from "@/lib/useRefetchStaleOnFocus";
import { confirmDestructive, showNotice } from "@/lib/dialog";
import { MoonIcon, WarningIcon } from "@/components/ui/icons";

type FilterTab = "all" | "card" | "ai";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",  label: "전체" },
  { key: "card", label: "카드 해몽" },
  { key: "ai",   label: "AI 챗봇" },
];

const SOURCE_BY_TAB: Record<FilterTab, DreamSource | null> = {
  all: null,
  card: "card",
  ai: "ai",
};

// 검색어 입력이 이만큼 멈춘 뒤에 목록을 거른다. 글자마다 전체 꿈의 제목·본문을
// 훑고 카드를 다시 그리지 않도록.
const SEARCH_DEBOUNCE_MS = 150;

// 카드의 ⋮ 메뉴는 카드 아래로 삐져나오는 절대 위치 팝업이다. FlatList 는 카드마다
// 셀(View)로 감싸고, zIndex 는 형제끼리만 비교되므로 카드 안쪽에서 올린 zIndex 로는
// 다음 셀 위로 못 올라간다. 메뉴가 열린 카드의 셀 자체를 올린다.
const OpenMenuIdContext = createContext<string | null>(null);

function MenuAwareCell({
  item,
  style,
  onLayout,
  children,
}: {
  item: DreamRecord;
  style: StyleProp<ViewStyle> | undefined;
  // onLayout 은 FlatList 가 행 높이를 재는 데 쓰므로 반드시 넘긴다.
  // (onFocusCapture 는 키보드·TV 포커스 이동용이라 터치 앱에선 받지 않는다.)
  onLayout?: ViewProps["onLayout"];
  children: ReactNode;
}) {
  const openMenuId = useContext(OpenMenuIdContext);
  return (
    <View
      style={[style, item.id === openMenuId && styles.cellElevated]}
      onLayout={onLayout}
    >
      {children}
    </View>
  );
}

const keyOf = (d: DreamRecord) => d.id;
// 데이터가 아직 없을 때 쓰는 고정 빈 배열 — 매 렌더 새 [] 면 아래 useMemo 가 매번 다시 돈다.
const NO_DREAMS: DreamRecord[] = [];

export default function StorageScreen() {
  const space = useBottomSpace();
  const router = useRouter();

  // 목록은 React Query 캐시(키에 userId 포함)에서 읽는다. 홈에서 미리 받아 둔 게 있으면
  // 첫 진입부터 스피너 없이 뜨고, 다시 들어올 땐 staleTime 이 지났을 때만 갱신한다.
  // 이 기기에서의 저장·수정·삭제는 dreams.ts 가 이 쿼리를 바로 invalidate 한다.
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const dreamsQuery = useMyDreams(userId);
  const dreams = dreamsQuery.data ?? NO_DREAMS;
  // 캐시가 있으면 갱신 실패해도 기존 목록을 보여주고, 아무것도 없을 때만 에러 화면.
  const loading = dreamsQuery.isPending;
  const error = dreamsQuery.data ? null : (dreamsQuery.error?.message ?? null);
  const [refreshing, setRefreshing] = useState(false);
  useRefetchStaleOnFocus(userId ? myDreamsKey(userId) : null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);
  const [tab, setTab] = useState<FilterTab>("all");
  const [selectedRecord, setSelectedRecord] = useState<DreamRecord | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const closeMenu = useCallback(() => setOpenMenuId(null), []);
  const toggleMenu = useCallback(
    (id: string) => setOpenMenuId((cur) => (cur === id ? null : id)),
    [],
  );

  const openDream = useCallback((d: DreamRecord) => {
    setSelectedRecord(d);
  }, []);

  const { refetch } = dreamsQuery;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleEditDream = useCallback(
    (d: DreamRecord) => {
      setOpenMenuId(null);
      setSelectedRecord(null);
      router.push({
        pathname: "/(app)/dream/new",
        params: { editId: d.id },
      });
    },
    [router],
  );

  const handleDeleteDream = useCallback(
    (d: DreamRecord) => {
      confirmDestructive(
        "꿈 삭제",
        "이 꿈 기록을 삭제할까요?",
        "삭제",
        async () => {
          const { error } = await deleteDream(d.id);
          if (error) {
            showNotice("삭제 실패", error.message);
            return;
          }
          // 다시 받아오는 동안(deleteDream 이 invalidate)에도 카드가 남아 있지 않게
          // 캐시에서 바로 뺀다.
          setOpenMenuId(null);
          setSelectedRecord(null);
          queryClient.setQueryData<DreamRecord[]>(myDreamsKey(d.user_id), (prev) =>
            prev?.filter((row) => row.id !== d.id),
          );
        },
      );
    },
    [],
  );

  const stats = useMemo(() => computeStats(dreams), [dreams]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const sourceFilter = SOURCE_BY_TAB[tab];
    return dreams.filter((d) => {
      if (sourceFilter && d.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q) ||
        normalizeMoodTags(d.mood_tags).some((t) =>
          t.label.toLowerCase().includes(q),
        )
      );
    });
  }, [dreams, debouncedQuery, tab]);

  const renderItem = useCallback<ListRenderItem<DreamRecord>>(
    ({ item }) => {
      const Card = item.source === "ai" ? AiDreamCard : RecordedDreamCard;
      return (
        <Card
          dream={item}
          onPress={openDream}
          menuOpen={openMenuId === item.id}
          onMenuToggle={toggleMenu}
          onMenuClose={closeMenu}
          onEdit={handleEditDream}
          onDelete={handleDeleteDream}
        />
      );
    },
    [openDream, openMenuId, toggleMenu, closeMenu, handleEditDream, handleDeleteDream],
  );

  return (
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerText}>꿈 보관함</Text>
        <Text style={styles.subText}>내가 모아둔 꿈 조각들이에요</Text>
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
        />
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabText, active && styles.tabTextActive]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>기록된 꿈</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {stats.total === 0 ? "—" : `${stats.avgLuck}%`}
          </Text>
          <Text style={styles.statLabel}>평균 운세</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {stats.daysSinceLast === null
              ? "—"
              : stats.daysSinceLast === 0
                ? "오늘"
                : `${stats.daysSinceLast}일 전`}
          </Text>
          <Text style={styles.statLabel}>마지막 기록</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#7868C8" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.emptyEmoji}><WarningIcon size={44} color="#D88868" /></View>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        // 꿈 수만큼 카드가 늘어난다. FlatList 로 화면 근처 카드만 그린다.
        // 위쪽 검색창·탭·통계는 목록 밖에 고정돼 있어 스크롤 컨테이너가 중첩되지 않는다.
        <OpenMenuIdContext.Provider value={openMenuId}>
          <FlatList
            data={filtered}
            keyExtractor={keyOf}
            renderItem={renderItem}
            CellRendererComponent={MenuAwareCell}
            ItemSeparatorComponent={ListGap}
            contentContainerStyle={[styles.list, { paddingBottom: space.withNav }]}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={closeMenu}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={7}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyEmoji}><MoonIcon size={44} color="#B8A8E0" /></View>
                <Text style={styles.emptyText}>
                  {dreams.length === 0
                    ? "아직 기록된 꿈이 없어요\n꿈 조각을 골라 첫 꿈을 담아보세요"
                    : query.trim()
                      ? "일치하는 꿈이 없어요"
                      : tab === "ai"
                        ? "AI 챗봇으로 기록한 꿈이 없어요"
                        : "이 분류에 담긴 꿈이 없어요"}
                </Text>
                {dreams.length === 0 ? (
                  <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={() => router.push("/(app)/search")}
                  >
                    <Text style={styles.ctaBtnText}>꿈 조각 둘러보기</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
          />
        </OpenMenuIdContext.Provider>
      )}

      <BottomNav active="storage" />

      {selectedRecord?.source === "ai" ? (
        <AiDreamModal
          dream={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      ) : (
        <RecordedDreamModal
          dream={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </LinearGradient>
  );
}

const ListGap = () => <View style={styles.gap} />;

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  headerText: {
    fontFamily: "OnglyphPDH",
    fontSize: 22,
    color: "#6858B8",
    letterSpacing: 1,
  },
  subText: { fontSize: 12, color: "#9888CC" },

  searchWrap: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.2)",
  },
  searchIcon: { width: 16, height: 16, opacity: 0.55 },
  searchInput: { flex: 1, fontSize: 13, color: "#6858B8", padding: 0 },

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.25)",
  },
  tabActive: { backgroundColor: "#7868C8", borderColor: "#7868C8" },
  tabText: {
    fontFamily: "OnglyphPDH",
    fontSize: 13,
    color: "#9888CC",
    lineHeight: 15,
  },
  tabTextActive: { color: "#fff" },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.2)",
  },
  statValue: { fontSize: 18, fontWeight: "700", color: "#3828A0" },
  statLabel: { fontSize: 11, color: "#9888CC" },

  // paddingBottom 은 useBottomSpace().withNav 로 렌더 시점에 덮어쓴다.
  list: { paddingHorizontal: 20, paddingTop: 14 },
  gap: { height: 10 },
  cellElevated: { zIndex: 20, elevation: 6 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },

  empty: { alignItems: "center", paddingTop: 60, gap: 14 },
  // 이모지 대신 SVG 아이콘 — 오래된 안드로이드에서 이모지가 네모로 깨진다.
  emptyEmoji: { opacity: 0.85, alignItems: "center" },
  emptyText: {
    fontFamily: "OnglyphPDH",
    fontSize: 14,
    color: "#9888CC",
    textAlign: "center",
    lineHeight: 22,
  },
  ctaBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#7868C8",
  },
  ctaBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
