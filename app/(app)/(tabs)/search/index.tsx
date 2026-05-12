import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import { SearchIcon } from "@/components/ui/icons";
import {
  CATEGORIES,
  TRENDING_KEYWORDS,
  DreamCategory,
} from "@/features/dream/dreamData";

const SCREEN_W = Dimensions.get("window").width;
const GRID_PADDING = 20;
const GRID_GAP = 10;
const CARD_W = (SCREEN_W - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const goCategory = (cat: DreamCategory) => {
    router.push(`/(app)/search/${cat.id}`);
  };

  const goResults = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/(app)/search/results?q=${encodeURIComponent(trimmed)}`);
  };

  const handleTrendingTap = (kw: string) => {
    const cleaned = kw.replace(/^#/, "");
    setQuery(cleaned);
    goResults(cleaned);
  };

  return (
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
          <Text style={styles.sectionLabel}>🔥 지금 뜨는 꿈 키워드</Text>
          <View style={styles.tagRow}>
            {TRENDING_KEYWORDS.map((kw) => (
              <TouchableOpacity
                key={kw}
                style={styles.trendTag}
                onPress={() => handleTrendingTap(kw)}
              >
                <Text style={styles.trendTagText}>{kw}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: cat.bg }]}
              activeOpacity={0.85}
              onPress={() => goCategory(cat)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            원하는 꿈 조각이 없나요?{"\n"}
            옆에 있는 몽이를 클릭해 바로 물어보세요!
          </Text>
          <Image
            source={require("@/assets/images/chatboticon.png")}
            style={styles.ctaMascot}
            resizeMode="contain"
          />
        </View>
      </ScrollView>

      <BottomNav active="search" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 60,
    paddingBottom: 120,
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
  searchIcon: { width: 16, height: 16, opacity: 0.55 },
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
  categoryCard: {
    width: CARD_W,
    height: CARD_W,
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
