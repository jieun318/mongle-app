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
import { useCallback, useMemo, useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import { SearchIcon } from "@/components/ui/icons";
import RecordedDreamCard from "@/components/dream/RecordedDreamCard";
import RecordedDreamModal from "@/components/dream/RecordedDreamModal";
import DreamDetailModal from "@/components/dream/DreamDetailModal";
import {
  DreamRecord,
  DreamSource,
  computeStats,
  listMyDreams,
} from "@/features/dream/dreams";
import {
  DreamItem,
  getCategoryById,
} from "@/features/dream/dreamData";

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

// 보관함의 카드 해몽 결과를 검색페이지의 DreamDetailModal 와 동일한
// 모양으로 띄우기 위해, Supabase 에서 함께 join 해온 dream_items
// 마스터 row 를 우선으로 사용하고, 없으면 record 의 스냅샷으로 보충한다.
function recordToDreamItem(r: DreamRecord): DreamItem {
  const item = r.dream_item;
  return {
    id: item?.id ?? r.dream_item_id ?? r.id,
    categoryId: item?.category_id ?? r.category_id ?? "",
    title: item?.title || r.title || "꿈",
    preview: item?.preview ?? r.content ?? "",
    description: item?.description || r.content || "",
    emoji: item?.emoji || r.emoji || "🌙",
    tags: (item?.tags as ("길몽" | "흉몽" | "태몽")[]) ?? [],
    keywords: item?.keywords ?? [],
    bookmarkCount: item?.bookmark_count ?? 0,
    luckIndex: item?.luck_index ?? r.luck_index ?? 0,
    isWarning: item?.is_warning ?? r.is_warning ?? false,
    moodTags:
      item?.mood_tags && item.mood_tags.length > 0
        ? item.mood_tags
        : r.mood_tags,
  };
}

export default function StorageScreen() {
  const router = useRouter();

  const [dreams, setDreams] = useState<DreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [selectedItem, setSelectedItem] = useState<DreamItem | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DreamRecord | null>(null);

  const openDream = useCallback((d: DreamRecord) => {
    if (d.source === "ai") {
      setSelectedRecord(d);
      return;
    }
    setSelectedItem(recordToDreamItem(d));
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
      setLoading(true);
      load().finally(() => {
        if (!cancelled) setLoading(false);
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
        d.mood_tags.some((t) => t.label.toLowerCase().includes(q))
      );
    });
  }, [dreams, query, tab]);

  return (
    <LinearGradient colors={["#EDE9FF", "#F5F0FF", "#FFF8F0"]} style={{ flex: 1 }}>
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
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
            filtered.map((d) => (
              <RecordedDreamCard
                key={d.id}
                dream={d}
                onPress={() => openDream(d)}
              />
            ))
          )}
        </ScrollView>
      )}

      <BottomNav active="storage" />

      <DreamDetailModal
        dream={selectedItem}
        category={
          selectedItem ? getCategoryById(selectedItem.categoryId)?.label : undefined
        }
        onClose={() => setSelectedItem(null)}
        onPressRecord={(d) => {
          setSelectedItem(null);
          router.push({
            pathname: "/(app)/dream/new",
            params: { dreamItemId: d.id },
          });
        }}
      />

      <RecordedDreamModal
        dream={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
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

  list: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120, gap: 10 },

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
