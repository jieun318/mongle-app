// "오늘의 자세히 보기" 게이트 카드 (절제된 톤).
//
// 메인 액션 1개(광고) + 보조 링크(프리미엄). 두 버튼 가로로 두는 안은 모달이
// 무거워 보여 폐기.
//
// 광고/결제 SDK 가 붙기 전까지는 두 콜백 모두 unlockDetailToday 를 호출해
// UX 흐름만 검증 가능하게 둔다.

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface DetailUnlockCardProps {
  onWatchAd: () => void;
  onSubscribe: () => void;
}

export default function DetailUnlockCard({
  onWatchAd,
  onSubscribe,
}: DetailUnlockCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>카테고리별 자세히 보기</Text>
      </View>
      <Text style={styles.subtitle}>연애 · 직장/학교 · 금전</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onWatchAd}
        style={styles.adBtn}
      >
        <Text style={styles.adBtnText}>광고 보고 열기</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onSubscribe}
        style={styles.subscribeLink}
      >
        <Text style={styles.subscribeText}>매일 자동으로 열기 →</Text>
      </TouchableOpacity>
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

  adBtn: {
    backgroundColor: "#7868C8",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  adBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  subscribeLink: { alignItems: "center", paddingTop: 2 },
  subscribeText: {
    fontSize: 11,
    color: "#9888CC",
    textDecorationLine: "underline",
  },
});
