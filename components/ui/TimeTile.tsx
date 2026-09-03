import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { parseHHMM } from "@/lib/notifications";

// 알림 시각을 보여주고 탭하면 시간 선택기를 여는 타일.
//
// 원래는 "리마인드 시간 ······ 오전 7:30 ›" 형태의 평범한 설정 행이었다.
// 이 앱에서 시각은 그냥 설정값이 아니라 "몽이가 언제 말을 거는가"라서,
// 목록 속 한 줄로 흘려보내지 않고 눈에 들어오는 타일로 세운다.
// 숫자는 크게, 오전/오후는 칩으로 빼서 한눈에 읽히게.

interface Props {
  /** 타일 제목 (예: "리마인드 시간") */
  label: string;
  /** "HH:MM" (24시간) */
  time: string;
  /** 왼쪽 원형 배지에 들어갈 이모지 */
  icon?: string;
  /** 시각 아래 보조 설명 (선택) */
  caption?: string;
  onPress: () => void;
}

export default function TimeTile({
  label,
  time,
  icon = "🌙",
  caption,
  onPress,
}: Props) {
  const { hour, minute } = parseHHMM(time);
  const period = hour < 12 ? "오전" : "오후";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const mm = String(minute).padStart(2, "0");

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(184,152,240,0.18)", borderless: false }}
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${period} ${h12}시 ${minute}분, 변경하려면 두 번 탭하세요`}
    >
      <LinearGradient
        colors={["#F7F3FF", "#EFE8FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tile}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>{icon}</Text>
        </View>

        <View style={styles.center}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.timeRow}>
            <View style={styles.periodChip}>
              <Text style={styles.periodText}>{period}</Text>
            </View>
            <Text style={styles.time}>
              {h12}
              <Text style={styles.colon}>:</Text>
              {mm}
            </Text>
          </View>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>

        <View style={styles.editChip}>
          <Text style={styles.editText}>변경</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const PURPLE_DEEP = "#5848A8";

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 20,
    // Pressable 밖으로 ripple 이 새지 않도록
    overflow: "hidden",
  },
  wrapPressed: { opacity: 0.85 },

  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(120,104,200,0.20)",
  },

  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(120,104,200,0.16)",
  },
  badgeIcon: { fontSize: 19, lineHeight: 24 },

  center: { flex: 1 },
  label: {
    fontSize: 11,
    color: "#9888CC",
    letterSpacing: 0.2,
    marginBottom: 3,
  },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  periodChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
    backgroundColor: "rgba(120,104,200,0.14)",
  },
  periodText: { fontSize: 11, fontWeight: "700", color: PURPLE_DEEP },
  time: {
    fontSize: 26,
    fontWeight: "700",
    color: PURPLE_DEEP,
    letterSpacing: 0.5,
    // 시:분 이 세로로 흔들리지 않도록 라인하이트를 고정한다.
    lineHeight: 30,
  },
  // 콜론만 살짝 연하게 — 숫자가 먼저 읽힌다.
  colon: { color: "#A898D8" },

  caption: { fontSize: 11, color: "#9888CC", marginTop: 4 },

  editChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(120,104,200,0.28)",
  },
  editText: { fontSize: 12, fontWeight: "700", color: "#7868C8" },
});
