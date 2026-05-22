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
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";

// Alert.alert 는 react-native-web 에서 no-op 이므로 web 분기에서 브라우저 dialog 사용.
// 모달 UI 를 따로 만들 수도 있지만 시스템 dialog 가 가장 단순하고 신뢰성 있음.
const showNotice = (title: string, message?: string, onOk?: () => void) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    onOk?.();
    return;
  }
  Alert.alert(
    title,
    message,
    onOk ? [{ text: "확인", onPress: onOk }] : undefined,
  );
};

const confirmDestructive = (
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: "취소", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
};
import {
  AVATAR_OPTIONS,
  getAvatarSignedUrl,
  getMyProfile,
  removeAvatar,
  updateMyProfile,
  uploadAvatar,
} from "@/features/auth/profile";

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [avatar, setAvatar] = useState<string>("🌙");
  const [nickname, setNickname] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await getMyProfile();
      if (cancelled) return;
      if (data) {
        setAvatar(data.avatar_emoji || "🌙");
        setNickname(data.nickname ?? "");
        setImagePath(data.profile_image_url);
        if (data.profile_image_url) {
          const url = await getAvatarSignedUrl(data.profile_image_url);
          if (!cancelled) setImageUrl(url);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePickImage = async () => {
    // 갤러리 권한 체크 (web 에선 expo-image-picker 가 file input 으로 폴백되어 권한 단계 없음)
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "권한 필요",
          "프로필 사진을 등록하려면 사진 라이브러리 접근 권한이 필요해요.",
          [
            { text: "취소", style: "cancel" },
            { text: "설정 열기", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (picked.canceled || !picked.assets[0]) return;

    setUploading(true);
    const { data, error } = await uploadAvatar(picked.assets[0].uri);
    setUploading(false);

    if (error) {
      showNotice("업로드 실패", error.message);
      return;
    }
    if (data?.profile_image_url) {
      setImagePath(data.profile_image_url);
      const url = await getAvatarSignedUrl(data.profile_image_url);
      setImageUrl(url);
    }
  };

  const handleRemoveImage = () => {
    confirmDestructive("사진 제거", "프로필 사진을 제거하시겠어요?", "제거", async () => {
      setUploading(true);
      const { error } = await removeAvatar();
      setUploading(false);
      if (error) {
        showNotice("제거 실패", error.message);
        return;
      }
      setImagePath(null);
      setImageUrl(null);
    });
  };

  const handleSaveProfile = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length > 10) {
      showNotice("닉네임은 10자 이내로 입력해주세요");
      return;
    }
    setSavingProfile(true);
    // 닉네임은 선택사항 — 빈 값이면 업데이트 자체를 보내지 않음 (기존 값 유지)
    const { error } = await updateMyProfile({
      avatarEmoji: avatar,
      ...(trimmed ? { nickname: trimmed } : {}),
    });
    setSavingProfile(false);
    if (error) {
      showNotice("저장 실패", error.message);
      return;
    }
    showNotice("저장 완료", "프로필이 수정됐어요", () => router.back());
  };

  return (
    <LinearGradient colors={["#F5F3FA", "#F5F3FA"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>프로필 편집</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#7868C8" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 아바타 선택 */}
            <View style={styles.section}>
              <Text style={styles.label}>프로필 사진</Text>
              <View style={styles.avatarPreviewWrap}>
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarPreview}>{avatar}</Text>
                )}
              </View>

              <View style={styles.photoBtnRow}>
                <TouchableOpacity
                  style={styles.photoBtn}
                  onPress={handlePickImage}
                  disabled={uploading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.photoBtnText}>
                    {uploading
                      ? "처리 중..."
                      : imageUrl
                        ? "사진 변경"
                        : "내 사진 업로드"}
                  </Text>
                </TouchableOpacity>
                {imageUrl ? (
                  <TouchableOpacity
                    style={styles.photoBtnRemove}
                    onPress={handleRemoveImage}
                    disabled={uploading}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.photoBtnRemoveText}>사진 제거</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.sectionHint}>
                또는 아래 캐릭터 중 선택해주세요
              </Text>

              <View style={styles.avatarGrid}>
                {[AVATAR_OPTIONS.slice(0, 5), AVATAR_OPTIONS.slice(5)].map(
                  (row, ri) => (
                    <View key={ri} style={styles.avatarRow}>
                      {row.map((emoji) => {
                        const active = emoji === avatar;
                        return (
                          <TouchableOpacity
                            key={emoji}
                            style={[
                              styles.avatarOpt,
                              active && styles.avatarOptActive,
                            ]}
                            onPress={() => setAvatar(emoji)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.avatarOptEmoji}>{emoji}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ),
                )}
              </View>
            </View>

            {/* 닉네임 */}
            <View style={styles.section}>
              <Text style={styles.label}>닉네임 (선택)</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="최대 10자 — 비워두면 변경 안 함"
                placeholderTextColor="#C4B8D6"
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSaveProfile}
              activeOpacity={0.85}
              disabled={savingProfile}
            >
              <LinearGradient
                colors={["#B898F0", "#8868D8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>
                  {savingProfile ? "저장 중..." : "프로필 저장"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
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

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingTop: 12, paddingBottom: 60, gap: 14 },

  section: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  label: { fontSize: 12, fontWeight: "700", color: "#7868B8" },

  avatarPreviewWrap: {
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  avatarPreview: { fontSize: 44 },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  photoBtnRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  photoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#7868C8",
  },
  photoBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  photoBtnRemove: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D8C8F0",
    backgroundColor: "#fff",
  },
  photoBtnRemoveText: { fontSize: 12, fontWeight: "700", color: "#9888CC" },
  sectionHint: {
    fontSize: 11,
    color: "#A898D0",
    textAlign: "center",
    marginTop: 4,
  },
  avatarGrid: { gap: 10 },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  avatarOpt: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F0FA",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarOptActive: {
    borderColor: "#7868C8",
    backgroundColor: "#FFF",
  },
  avatarOptEmoji: { fontSize: 24 },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#3D2B5E",
    borderWidth: 1.5,
    borderColor: "#EDE9F0",
  },

  primaryBtn: { borderRadius: 16, overflow: "hidden" },
  primaryBtnGradient: { paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
