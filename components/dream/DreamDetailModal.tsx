import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DreamItem } from "@/features/dream/dreamData";
import DreamEmoji from "@/components/dream/DreamEmoji";

interface Props {
  dream: DreamItem | null;
  category?: string;
  onClose: () => void;
  onPressRecord?: (dream: DreamItem) => void;
}

export default function DreamDetailModal({
  dream,
  category,
  onClose,
  onPressRecord,
}: Props) {
  return (
    <Modal
      visible={!!dream}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {dream && (
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.card}>
            <View style={styles.handle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <LinearGradient
                colors={["#FFF0F8", "#F0E8FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emojiWrap}
              >
                <DreamEmoji emoji={dream.emoji} size={64} />
              </LinearGradient>

              {category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{category}</Text>
                </View>
              )}

              <Text style={styles.title}>{dream.title}</Text>

              <View style={styles.divider} />

              <Text style={styles.smLabel}>해몽</Text>
              <Text style={styles.desc}>{dream.description}</Text>

              {dream.moodTags && dream.moodTags.length > 0 && (
                <View style={styles.tagRow}>
                  {dream.moodTags.map((t) => (
                    <View
                      key={t.label}
                      style={[styles.tag, { backgroundColor: t.bg }]}
                    >
                      <Text style={[styles.tagText, { color: t.color }]}>
                        {t.emoji} {t.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.luckRow}>
                <Text style={styles.luckLabel}>
                  {dream.isWarning ? "흉몽 지수" : "길몽 지수"}
                </Text>
                <Text style={styles.luckValue}>{dream.luckIndex}%</Text>
              </View>
              <View style={styles.progressBg}>
                <LinearGradient
                  colors={
                    dream.isWarning
                      ? ["#F0B898", "#D88868"]
                      : ["#B898F0", "#8868D8"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${dream.luckIndex}%` }]}
                />
              </View>

              <View style={styles.buttons}>
                <TouchableOpacity style={styles.btnClose} onPress={onClose}>
                  <Text style={styles.btnCloseText}>닫기</Text>
                </TouchableOpacity>
                {onPressRecord ? (
                  <TouchableOpacity
                    style={styles.btnRecord}
                    onPress={() => onPressRecord(dream)}
                  >
                    <LinearGradient
                      colors={["#B898F0", "#8868D8"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.btnRecordGradient}
                    >
                      <Text style={styles.btnRecordText}>꿈 기록하기</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(100,80,160,0.25)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "88%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8C8F0",
    alignSelf: "center",
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  emojiWrap: { borderRadius: 20, paddingVertical: 20, alignItems: "center" },
  emoji: { fontSize: 64 },
  categoryBadge: {
    alignSelf: "center",
    backgroundColor: "#F0E8FF",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: "600", color: "#8868C8" },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#3828A0",
    textAlign: "center",
  },
  divider: { height: 1, backgroundColor: "#F0E8FF" },
  smLabel: { fontSize: 11, fontWeight: "600", color: "#A898D8" },
  desc: { fontSize: 13, color: "#5848A8", lineHeight: 22 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: "600" },
  luckRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  luckLabel: { fontSize: 12, fontWeight: "600", color: "#8868C8" },
  luckValue: { fontSize: 12, fontWeight: "700", color: "#6848C0" },
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F0E8FF",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 8 },
  btnClose: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D8C8F0",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  btnCloseText: { fontSize: 14, fontWeight: "600", color: "#8868C8" },
  btnRecord: { flex: 1, borderRadius: 14, overflow: "hidden" },
  btnRecordGradient: { paddingVertical: 13, alignItems: "center" },
  btnRecordText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
