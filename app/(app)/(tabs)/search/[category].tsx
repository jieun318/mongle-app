import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import { SearchIcon } from "@/components/ui/icons";
import DreamDetailModal from "@/components/dream/DreamDetailModal";
import DreamListItem from "@/components/dream/DreamListItem";
import {
  DreamItem,
  filterDreams,
  getCategoryById,
  getFilterTags,
} from "@/features/dream/dreamData";
import { useDreamItemsByCategory } from "@/features/dream/dreamQueries";

export default function CategoryListScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("전체");
  const [selectedDream, setSelectedDream] = useState<DreamItem | null>(null);

  const cat = category ? getCategoryById(category) : undefined;
  const filterTags = getFilterTags(category ?? "");

  const { data: baseDreams = [], isLoading } = useDreamItemsByCategory(category);

  const dreams = useMemo(() => {
    const filtered = filterDreams(baseDreams, activeFilter);
    if (!query.trim()) return filtered;
    const q = query.trim().toLowerCase();
    return filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [baseDreams, activeFilter, query]);

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    router.push(`/(app)/search/results?q=${encodeURIComponent(q)}`);
  };

  return (
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {cat ? `${cat.emoji} ${cat.label} 꿈` : "꿈 조각"}
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
          onSubmitEditing={submitSearch}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        {filterTags.map((tag) => {
          const active = activeFilter === tag;
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => setActiveFilter(tag)}
              style={[styles.filterTag, active && styles.filterTagActive]}
            >
              <Text
                numberOfLines={1}
                style={[styles.filterTagText, active && styles.filterTagTextActive]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && dreams.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💭</Text>
            <Text style={styles.emptyText}>꿈 조각을 불러오는 중...</Text>
          </View>
        )}

        {!isLoading && dreams.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌫️</Text>
            <Text style={styles.emptyText}>아직 모인 꿈 조각이 없어요</Text>
          </View>
        )}

        {dreams.map((dream) => (
          <DreamListItem
            key={dream.id}
            dream={dream}
            onPress={() => setSelectedDream(dream)}
          />
        ))}
      </ScrollView>

      <BottomNav active="search" />

      <DreamDetailModal
        dream={selectedDream}
        category={cat?.label}
        onClose={() => setSelectedDream(null)}
        onPressRecord={(d) => {
          setSelectedDream(null);
          router.push({
            pathname: "/(app)/dream/new",
            params: { dreamItemId: d.id },
          });
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
    gap: 4,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 26, color: "#8878CC", lineHeight: 26 },
  headerText: {
    fontFamily: "OnglyphPDH",
    fontSize: 18,
    color: "#6858B8",
    letterSpacing: 0.5,
  },

  searchWrap: {
    marginHorizontal: 20,
    marginTop: 14,
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
  searchIcon: { width: 16, height: 16, opacity: 0.55 },
  searchInput: { flex: 1, fontSize: 13, color: "#6858B8", padding: 0 },

  filterScroll: { flexGrow: 0, flexShrink: 0, marginTop: 14 },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 6,
    alignItems: "center",
  },
  filterTag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.25)",
    flexShrink: 0,
  },
  filterTagActive: {
    backgroundColor: "#7868C8",
    borderColor: "#7868C8",
  },
  filterTagText: {
    fontFamily: "OnglyphPDH",
    fontSize: 13,
    color: "#9888CC",
    lineHeight: 15,
  },
  filterTagTextActive: { color: "#fff" },

  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120, gap: 8 },

  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, opacity: 0.6 },
  emptyText: { fontFamily: "OnglyphPDH", fontSize: 14, color: "#9888CC" },
});
