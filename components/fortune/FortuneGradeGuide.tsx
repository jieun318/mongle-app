import { View, Text, StyleSheet } from "react-native";

const GRADES = [
  {
    label: "대길",
    title: "아주 좋은 날",
    desc: "행운이 가득해요. 새로운 도전을 해보세요!",
    bgColor: "#FEF9C3",
    textColor: "#92400E",
  },
  {
    label: "소길",
    title: "좋은 날",
    desc: "작은 행운이 따르는 날이에요. 긍정적으로!",
    bgColor: "#DCFCE7",
    textColor: "#166534",
  },
  {
    label: "평범",
    title: "보통의 날",
    desc: "특별한 일 없이 무난하게 흘러가는 날이에요.",
    bgColor: "#E0F2FE",
    textColor: "#0369A1",
  },
  {
    label: "조심",
    title: "주의가 필요한 날",
    desc: "오늘은 신중하게 행동하는 게 좋아요.",
    bgColor: "#FEE2E2",
    textColor: "#991B1B",
  },
];

export default function FortuneGradeGuide() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>운세 등급 안내</Text>
      {GRADES.map((grade, index) => (
        <View
          key={grade.label}
          style={[styles.row, index < GRADES.length - 1 && styles.rowBorder]}
        >
          <View style={[styles.pill, { backgroundColor: grade.bgColor }]}>
            <Text style={[styles.pillText, { color: grade.textColor }]}>
              {grade.label}
            </Text>
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.gradeTitle}>{grade.title}</Text>
            <Text style={styles.gradeDesc}>{grade.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#EDE9F4",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  title: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9B8BB4",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F9F7FF",
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9F4",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9F4",
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    minWidth: 36,
    alignItems: "center",
  },
  pillText: { fontSize: 11, fontWeight: "700" },
  textWrap: { flex: 1, gap: 1 },
  gradeTitle: { fontSize: 12, fontWeight: "600", color: "#3D2B5E" },
  gradeDesc: { fontSize: 11, color: "#9B8BB4" },
});
