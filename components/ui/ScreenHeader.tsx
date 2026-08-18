import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  // 되돌아갈 스택이 없을 때 갈 곳. 웹 URL 직접 진입/딥링크 대비.
  // 기본값 "/" 는 웹=랜딩, 네이티브=세션 게이트라 양쪽 다 안전하다.
  fallbackHref?: string;
  // 본문이 maxWidth 로 가운데 정렬된 화면(약관 등)에서 헤더도 같이 맞춘다.
  maxWidth?: number;
};

// 화면 상단 뒤로가기 + 타이틀. headerShown:false 인 화면들이 공유한다.
export default function ScreenHeader({
  title,
  fallbackHref = "/",
  maxWidth,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    // push 로 들어왔으면 back 이 정상 동작하고(마이페이지·회원가입 경로),
    // URL 직접 진입이면 히스토리가 없어 무반응이 되므로 폴백으로 보낸다.
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View
        style={[styles.row, maxWidth ? { maxWidth, alignSelf: "center" } : null]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  row: {
    width: "100%",
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
});
