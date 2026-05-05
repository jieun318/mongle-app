import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  createDream,
  isValidISODate,
  todayISODate,
} from "@/features/dream/dreams";
import { useDreamItem } from "@/features/dream/dreamQueries";

export default function NewDreamScreen() {
  const router = useRouter();
  const { dreamItemId, initialTitle } = useLocalSearchParams<{
    dreamItemId?: string;
    initialTitle?: string;
  }>();

  const { data: sourceItem } = useDreamItem(dreamItemId?.toString());

  const [title, setTitle] = useState((initialTitle ?? "").toString());
  const [content, setContent] = useState("");
  const [dreamDate, setDreamDate] = useState(todayISODate());
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    dreamDate?: string;
  }>({});

  // sourceItem 이 비동기로 들어오면 (사용자가 아직 입력 안한 경우에만) 제목 자동 채움.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && sourceItem?.title) {
      seededRef.current = true;
      setTitle((cur) => (cur.trim() ? cur : sourceItem.title));
    }
  }, [sourceItem]);

  const handleSave = async () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "꿈 제목을 적어주세요";
    if (!isValidISODate(dreamDate)) {
      next.dreamDate = "YYYY-MM-DD 형식으로 입력해주세요";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    const { error } = await createDream({
      title: title.trim(),
      content: content.trim(),
      dreamDate,
      source: "card",
      dreamItemId: sourceItem?.id ?? null,
      categoryId: sourceItem?.categoryId ?? null,
      luckIndex: sourceItem?.luckIndex ?? 0,
      isWarning: sourceItem?.isWarning ?? false,
      emoji: sourceItem?.emoji ?? "🌙",
      moodTags: sourceItem?.moodTags ?? [],
    });
    setSubmitting(false);

    if (error) {
      Alert.alert("저장 실패", error.message);
      return;
    }

    Alert.alert("저장 완료", "꿈이 보관함에 담겼어요", [
      {
        text: "확인",
        onPress: () => router.replace("/(app)/storage"),
      },
    ]);
  };

  return (
    <LinearGradient colors={["#EDE9FF", "#F5F0FF", "#FFF8F0"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>꿈 기록하기</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {sourceItem ? (
            <View style={styles.sourceBanner}>
              <Text style={styles.sourceEmoji}>{sourceItem.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sourceLabel}>해몽 카드 기반</Text>
                <Text style={styles.sourceTitle} numberOfLines={1}>
                  {sourceItem.title}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>제목</Text>
            <TextInput
              style={styles.input}
              placeholder="어떤 꿈이었나요?"
              placeholderTextColor="#C4B8D6"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />
            {errors.title ? (
              <Text style={styles.errorText}>{errors.title}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>내용</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="꿈에서 무슨 일이 있었는지 자유롭게 적어보세요"
              placeholderTextColor="#C4B8D6"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>꿈 꾼 날짜</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#C4B8D6"
                value={dreamDate}
                onChangeText={setDreamDate}
                autoCapitalize="none"
                keyboardType={
                  Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
                }
                maxLength={10}
              />
              <TouchableOpacity
                style={styles.todayBtn}
                onPress={() => setDreamDate(todayISODate())}
              >
                <Text style={styles.todayBtnText}>오늘</Text>
              </TouchableOpacity>
            </View>
            {errors.dreamDate ? (
              <Text style={styles.errorText}>{errors.dreamDate}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={submitting}
          >
            <LinearGradient
              colors={["#B898F0", "#8868D8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveBtnGradient}
            >
              <Text style={styles.saveBtnText}>
                {submitting ? "저장 중..." : "보관함에 담기"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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

  scroll: { padding: 20, paddingTop: 16, paddingBottom: 60, gap: 18 },

  sourceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.3)",
  },
  sourceEmoji: { fontSize: 28 },
  sourceLabel: { fontSize: 11, color: "#A898D8", marginBottom: 2 },
  sourceTitle: { fontSize: 13, fontWeight: "700", color: "#4838A0" },

  field: { gap: 6 },
  label: {
    fontFamily: "OnglyphPDH",
    fontSize: 14,
    color: "#7868B8",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#3D2B5E",
    borderWidth: 1.5,
    borderColor: "#EDE9F0",
  },
  textarea: { minHeight: 160 },
  dateRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#EDE8F5",
  },
  todayBtnText: { fontSize: 13, fontWeight: "700", color: "#7868B8" },
  errorText: { fontSize: 11, color: "#f87171", paddingLeft: 4 },

  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: 12 },
  saveBtnGradient: { paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
