import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeftIcon } from "@/components/ui/icons";

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
        {/* 화살표와 제목을 한 덩어리로 묶는다. 화살표만 누르게 두면
            터치 영역이 약 18×34dp 밖에 안 된다.
            우측 여백은 일부러 제외 — 나중에 우측 버튼이 생겨도 겹치지 않는다. */}
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backHit,
            pressed && styles.backHitPressed,
          ]}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 12 }}
          android_ripple={{ color: "rgba(184,152,240,0.18)", borderless: false }}
          accessibilityRole="button"
          accessibilityLabel={`뒤로 가기, ${title}`}
        >
          <ChevronLeftIcon size={26} color="#8878CC" />
          <Text style={styles.headerText} numberOfLines={1}>
            {title}
          </Text>
        </Pressable>
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
  backHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 48,
    minWidth: 48,
    // 제목 오른쪽에 약간의 여유 — 탭 영역이 글자에 딱 붙지 않게.
    paddingRight: 8,
    // ripple/pressed 배경이 각지지 않게.
    borderRadius: 12,
    // 제목이 길어져도 헤더 밖으로 밀고 나가지 않게.
    flexShrink: 1,
  },
  // android_ripple 은 안드로이드 전용이라 iOS·웹은 이 스타일이 담당.
  backHitPressed: { backgroundColor: "rgba(184,152,240,0.10)" },
  headerText: {
    fontFamily: "OnglyphPDH",
    fontSize: 18,
    color: "#6858B8",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
});
