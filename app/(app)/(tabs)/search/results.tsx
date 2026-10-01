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
import { useEffect, useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import { SearchIcon } from "@/components/ui/icons";
import { useBottomSpace } from "@/lib/layout";
import ChatBotModal from "@/components/chat/ChatBotModal";
import DreamListItem from "@/components/dream/DreamListItem";
import { useSearchDreamItems } from "@/features/dream/dreamQueries";
import { logSearch } from "@/features/dream/searchLogs";
import { ChatBubbleIcon, CloudIcon } from "@/components/ui/icons";

export default function SearchResultsScreen() {
  const space = useBottomSpace();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();

  const initial = (q ?? "").toString();
  const [query, setQuery] = useState(initial);
  const [showChat, setShowChat] = useState(false);

  const { data: dreams = [], isFetching, isSuccess } = useSearchDreamItems(query);

  // 검색어 기록(search_logs) — 입력이 1초 멈췄을 때 결과 수와 함께 한 번.
  // 사전 전체를 받기 전(isSuccess 전)엔 결과가 0으로 보이므로 기록하지 않는다.
  const trimmedQuery = query.trim();
  const resultCount = dreams.length;
  useEffect(() => {
    if (!trimmedQuery || !isSuccess) return;
    const t = setTimeout(() => logSearch(trimmedQuery, resultCount), 1000);
    return () => clearTimeout(t);
  }, [trimmedQuery, isSuccess, resultCount]);

  return (
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
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
        contentContainerStyle={[styles.list, { paddingBottom: space.withNav }]}
        showsVerticalScrollIndicator={false}
      >
        {dreams.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyEmoji}>{isFetching ? <ChatBubbleIcon size={44} color="#B8A8E0" /> : <CloudIcon size={44} color="#B8A8E0" />}</View>
            <Text style={styles.emptyText}>
              {!query.trim()
                ? "검색어를 입력해보세요"
                : isFetching
                ? "찾는 중..."
                : "일치하는 꿈 조각이 없어요"}
            </Text>

            {query.trim() && !isFetching && (
              <TouchableOpacity
                style={styles.askBtn}
                activeOpacity={0.85}
                onPress={() => setShowChat(true)}
              >
                <Image
                  source={require("@/assets/images/chatboticon.png")}
                  style={styles.askMascot}
                  resizeMode="contain"
                />
                <Text style={styles.askText}>몽이에게 물어보기</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {dreams.map((dream) => (
          <DreamListItem
            key={dream.id}
            dream={dream}
            onPress={() =>
              router.push({
                pathname: "/(app)/dream/result",
                params: { itemId: dream.id },
              })
            }
          />
        ))}
      </ScrollView>

      <BottomNav active="search" />

      <ChatBotModal
        visible={showChat}
        onClose={() => setShowChat(false)}
        initialText={query}
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

  // paddingBottom 은 useBottomSpace().withNav 로 렌더 시점에 덮어쓴다.
  list: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },

  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  // 이모지 대신 SVG 아이콘 — 오래된 안드로이드에서 이모지가 네모로 깨진다.
  emptyEmoji: { opacity: 0.8 },
  emptyText: { fontFamily: "OnglyphPDH", fontSize: 14, color: "#9888CC" },

  askBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF9F0",
    borderRadius: 20,
    paddingLeft: 10,
    paddingRight: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(230,210,180,0.4)",
  },
  askMascot: { width: 32, height: 32 },
  askText: {
    fontFamily: "OnglyphPDH",
    fontSize: 14,
    color: "#B09060",
    letterSpacing: 0.3,
  },
});
