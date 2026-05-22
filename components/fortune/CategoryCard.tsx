import { View, Text, StyleSheet } from "react-native";
import type {
  FortuneCategory,
  FortuneCategoryKey,
} from "@/types/fortune";
import { CATEGORY_META } from "@/features/fortune/content/categories";

interface CategoryCardProps {
  categoryKey: FortuneCategoryKey;
  category: FortuneCategory;
}

function ScoreStars({ score, color }: { score: number; color: string }) {
  const filled = "★".repeat(score);
  const empty = "☆".repeat(5 - score);
  return (
    <Text style={[styles.stars, { color }]}>
      {filled}
      <Text style={styles.starsDim}>{empty}</Text>
    </Text>
  );
}

export default function CategoryCard({
  categoryKey,
  category,
}: CategoryCardProps) {
  const meta = CATEGORY_META[categoryKey];

  return (
    <View style={[styles.card, { backgroundColor: meta.bgColor }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          <Text style={styles.icon}>{meta.icon} </Text>
          <Text style={[styles.label, { color: meta.color }]}>
            {meta.label}
          </Text>
        </Text>
        <ScoreStars score={category.score} color={meta.color} />
      </View>

      <View style={styles.body}>
        <Text style={styles.message}>{category.message}</Text>
        <View style={styles.tipRow}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>{category.tip}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { flexDirection: "row", alignItems: "center" },
  icon: { fontSize: 16 },
  label: { fontSize: 14, fontWeight: "700" },
  stars: { fontSize: 14, letterSpacing: 1 },
  starsDim: { opacity: 0.35 },

  body: { gap: 8 },
  message: {
    fontSize: 13,
    lineHeight: 19,
    color: "#3D2B5E",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.6)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  tipIcon: { fontSize: 13, lineHeight: 18 },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#5C4A7A",
  },
});
