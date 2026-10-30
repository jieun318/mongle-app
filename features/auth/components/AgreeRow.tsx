import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";

// 필수 동의 체크 한 줄 — 회원가입 폼과 카카오 첫 로그인 동의 화면(/consent)이 같이 쓴다.
// href 가 있으면 오른쪽에 "보기" 링크를 붙인다.
export default function AgreeRow({
  checked,
  onToggle,
  label,
  href,
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  href?: Href;
  disabled?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.hit}
        onPress={onToggle}
        disabled={disabled}
        activeOpacity={0.6}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel={`[필수] ${label}`}
      >
        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
          {checked && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={styles.label}>
          <Text style={styles.required}>[필수] </Text>
          {label}
        </Text>
      </TouchableOpacity>
      {href ? (
        <TouchableOpacity
          onPress={() => router.push(href)}
          disabled={disabled}
          activeOpacity={0.6}
          style={styles.viewBtn}
          accessibilityRole="link"
          accessibilityLabel={`${label} 보기`}
        >
          <Text style={styles.viewLabel}>보기</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  // 토글 영역만 flex:1 로 넓혀, 옆의 "보기" 링크와 탭 영역이 겹치지 않게 한다.
  hit: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D6CCE8",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#8868D8", borderColor: "#8868D8" },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 16 },
  label: { flex: 1, fontSize: 13, color: "#5C4A7A" },
  required: { color: "#7868B8", fontWeight: "700" },
  viewBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  viewLabel: {
    fontSize: 12,
    color: "#6B5C82",
    textDecorationLine: "underline",
  },
});
