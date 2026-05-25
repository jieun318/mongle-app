// "오늘의 자세히 보기" 게이트 카드 (절제된 톤).
//
// 광고/결제 SDK 가 붙기 전까지는 "준비 중" 안내만 노출.
// SDK 도입 시점에 광고 버튼(rewarded ad → unlockDetailToday) + 프리미엄
// 링크(결제 화면)를 다시 붙인다.

import { View, Text, StyleSheet } from "react-native";

export default function DetailUnlockCard() {
  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>카테고리별 자세히 보기</Text>
      </View>
      <Text style={styles.subtitle}>연애 · 직장/학교 · 금전 · 건강 · 대인</Text>

      <View style={styles.comingSoonBox}>
        <Text style={styles.comingSoonText}>곧 만나요 ✨</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#EDE9F4",
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lockIcon: { fontSize: 13 },
  title: { fontSize: 13, fontWeight: "700", color: "#5C4A7A" },
  subtitle: {
    fontSize: 11,
    color: "#9B8BB4",
    marginBottom: 4,
  },

  comingSoonBox: {
    backgroundColor: "#F5F1FA",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 2,
  },
  comingSoonText: { fontSize: 13, fontWeight: "600", color: "#9888CC" },
});
