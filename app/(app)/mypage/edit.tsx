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
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  AVATAR_OPTIONS,
  changePassword,
  getAvatarSignedUrl,
  getMyProfile,
  removeAvatar,
  updateMyProfile,
  uploadAvatar,
} from "@/features/auth/profile";

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatar, setAvatar] = useState<string>("🌙");
  const [nickname, setNickname] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

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
    // 갤러리 권한 체크
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
      Alert.alert("업로드 실패", error.message);
      return;
    }
    if (data?.profile_image_url) {
      setImagePath(data.profile_image_url);
      const url = await getAvatarSignedUrl(data.profile_image_url);
      setImageUrl(url);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert("사진 제거", "프로필 사진을 제거하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "제거",
        style: "destructive",
        onPress: async () => {
          setUploading(true);
          const { error } = await removeAvatar();
          setUploading(false);
          if (error) {
            Alert.alert("제거 실패", error.message);
            return;
          }
          setImagePath(null);
          setImageUrl(null);
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length > 10) {
      Alert.alert("닉네임은 10자 이내로 입력해주세요");
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
      Alert.alert("저장 실패", error.message);
      return;
    }
    Alert.alert("저장 완료", "프로필이 수정됐어요", [
      { text: "확인", onPress: () => router.back() },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert("모든 비밀번호 칸을 채워주세요");
      return;
    }
    if (newPw.length < 8) {
      Alert.alert("새 비밀번호는 8자 이상으로 입력해주세요");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("새 비밀번호가 일치하지 않아요");
      return;
    }
    setSavingPassword(true);
    const { error } = await changePassword({
      currentPassword: currentPw,
      newPassword: newPw,
    });
    setSavingPassword(false);
    if (error) {
      Alert.alert("변경 실패", error.message);
      return;
    }
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    Alert.alert("변경 완료", "비밀번호가 변경됐어요");
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

            <View style={styles.divider} />

            {/* 비밀번호 변경 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>비밀번호 변경</Text>

              <Text style={styles.label}>현재 비밀번호</Text>
              <TextInput
                style={styles.input}
                value={currentPw}
                onChangeText={setCurrentPw}
                placeholder="현재 비밀번호"
                placeholderTextColor="#C4B8D6"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.label}>새 비밀번호</Text>
              <TextInput
                style={styles.input}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="8자 이상"
                placeholderTextColor="#C4B8D6"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.label}>새 비밀번호 확인</Text>
              <TextInput
                style={styles.input}
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="다시 입력"
                placeholderTextColor="#C4B8D6"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleChangePassword}
              activeOpacity={0.85}
              disabled={savingPassword}
            >
              <Text style={styles.secondaryBtnText}>
                {savingPassword ? "변경 중..." : "비밀번호 변경"}
              </Text>
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
  sectionTitle: {
    fontFamily: "OnglyphPDH",
    fontSize: 15,
    color: "#5848A8",
    letterSpacing: 0.5,
    marginBottom: 4,
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

  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D8C8F0",
    backgroundColor: "#fff",
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: "#7868C8" },

  divider: { height: 1, backgroundColor: "rgba(180,160,230,0.2)", marginVertical: 4 },
});
