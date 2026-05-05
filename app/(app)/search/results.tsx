import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import { SearchIcon } from "@/components/ui/icons";
import DreamDetailModal from "@/components/dream/DreamDetailModal";
import DreamListItem from "@/components/dream/DreamListItem";
import {
  DreamItem,
  getCategoryById,
} from "@/features/dream/dreamData";
import { useSearchDreamItems } from "@/features/dream/dreamQueries";

export default function SearchResultsScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();

  const initial = (q ?? "").toString();
  const [query, setQuery] = useState(initial);
  const [selectedDream, setSelectedDream] = useState<DreamItem | null>(null);

  const { data: dreams = [], isFetching } = useSearchDreamItems(query);

  return (
    <LinearGradient
      colors={["#EDE9FF", "#F5F0FF", "#FFF8F0"]}
      style={{ flex: 1 }}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>
          ‘{query}’ 검색 결과
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
          autoFocus={!initial}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {dreams.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>
              {isFetching ? "💭" : "🌫️"}
            </Text>
            <Text style={styles.emptyText}>
              {!query.trim()
                ? "검색어를 입력해보세요"
                : isFetching
                ? "찾는 중..."
                : "일치하는 꿈 조각이 없어요"}
            </Text>
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
        category={
          selectedDream ? getCategoryById(selectedDream.categoryId)?.label : undefined
        }
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

  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 8 },

  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, opacity: 0.6 },
  emptyText: { fontFamily: "OnglyphPDH", fontSize: 14, color: "#9888CC" },
});
