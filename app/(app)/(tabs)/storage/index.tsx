import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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
  getCachedMyDreams,
  listMyDreams,
} from "@/features/dream/dreams";
import { confirmDestructive, showNotice } from "@/lib/dialog";

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

export default function StorageScreen() {
  const space = useBottomSpace();
  const router = useRouter();

  // 홈에서 미리 예열해둔 목록이 있으면 그걸로 시작 → 첫 진입 스피너 생략.
  // 캐시가 있어도 useFocusEffect 가 백그라운드로 재조회하므로 항상 최신으로 갱신된다.
  const seeded = getCachedMyDreams();
  const [dreams, setDreams] = useState<DreamRecord[]>(seeded ?? []);
  const [loading, setLoading] = useState(seeded === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(seeded !== null); // 첫 로드 후엔 스피너 X, 백그라운드 갱신만

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [selectedRecord, setSelectedRecord] = useState<DreamRecord | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  const openDream = useCallback((d: DreamRecord) => {
    setSelectedRecord(d);
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await listMyDreams();
    if (error) {
      setError(error.message);
      setDreams([]);
    } else {
      setError(null);
      setDreams(data ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!hasLoadedRef.current) setLoading(true);
      load().finally(() => {
        if (cancelled) return;
        setLoading(false);
        hasLoadedRef.current = true;
      });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

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
          // 즉시 로컬 state 에서 제거 (낙관적 업데이트)
          setOpenMenuId(null);
          setSelectedRecord(null);
          setDreams((prev) => prev.filter((row) => row.id !== d.id));
        },
      );
    },
    [],
  );

  const stats = useMemo(() => computeStats(dreams), [dreams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
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
  }, [dreams, query, tab]);

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
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: space.withNav }]}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeMenu}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌙</Text>
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
          ) : (
            filtered.map((d) => {
              const Card = d.source === "ai" ? AiDreamCard : RecordedDreamCard;
              return (
                <Card
                  key={d.id}
                  dream={d}
                  onPress={() => openDream(d)}
                  menuOpen={openMenuId === d.id}
                  onMenuToggle={() =>
                    setOpenMenuId((cur) => (cur === d.id ? null : d.id))
                  }
                  onMenuClose={closeMenu}
                  onEdit={() => handleEditDream(d)}
                  onDelete={() => handleDeleteDream(d)}
                />
              );
            })
          )}
        </ScrollView>
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
  list: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },

  empty: { alignItems: "center", paddingTop: 60, gap: 14 },
  emptyEmoji: { fontSize: 48, opacity: 0.7 },
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
