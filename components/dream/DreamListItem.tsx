import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DreamItem } from "@/features/dream/dreamData";
import DreamEmoji from "@/components/dream/DreamEmoji";

interface Props {
  dream: DreamItem;
  onPress: () => void;
}

const TAG_STYLES: Record<string, { bg: string; color: string; icon?: string }> = {
  길몽: { bg: "#E8F5E8", color: "#4A9050", icon: "🍀" },
  흉몽: { bg: "#FFE0D0", color: "#C86040", icon: "⚠️" },
  태몽: { bg: "#FBE3EC", color: "#C868A0" },
};

export default function DreamListItem({ dream, onPress }: Props) {
  const primaryTag = dream.tags[0];
  const tagStyle = primaryTag
    ? TAG_STYLES[primaryTag] ?? { bg: "#F0E8FF", color: "#7868C8" }
    : null;

  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View
        style={[
          styles.emojiBox,
          { backgroundColor: dream.isWarning ? "#FFF0E0" : "#FFF0E8" },
        ]}
      >
        <DreamEmoji emoji={dream.emoji} size={22} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{dream.title}</Text>
        <Text style={styles.preview} numberOfLines={1}>{dream.preview}</Text>
      </View>
      <View style={styles.right}>
        {tagStyle && (
          <View style={[styles.badge, { backgroundColor: tagStyle.bg }]}>
            <Text style={[styles.badgeText, { color: tagStyle.color }]}>
              {tagStyle.icon ? `${tagStyle.icon} ` : ""}{primaryTag}
            </Text>
          </View>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "600", color: "#4838A0" },
  preview: { fontSize: 11, color: "#9888CC", marginTop: 3 },
  right: { alignItems: "flex-end", gap: 4 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  chevron: { fontSize: 16, color: "#C0B0E8" },
});
