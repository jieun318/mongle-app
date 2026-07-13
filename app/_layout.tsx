import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Platform, View } from "react-native";
import { useCallback, useRef, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { queryClient } from "@/lib/queryClient";
import SplashAnimation from "@/components/SplashAnimation";
import DialogHost from "@/components/ui/DialogHost";
import { setupNotificationHandler } from "@/lib/notifications";

// 네이티브 스플래시는 커스텀 스플래시 첫 레이아웃 시점에 직접 hide 한다.
SplashScreen.preventAutoHideAsync().catch(() => {});

// [측정용 임시 — STEP 2-2] JS 모듈 평가 시점 기준 콜드스타트 측정. 검증 후 제거.
const __coldStartAt = Date.now();

// 앱 foreground 에서도 알림이 표시되도록
setupNotificationHandler();

// 웹(react-native-web)에서 브라우저 자동완성 시 노란 배경(:-webkit-autofill) 제거
if (Platform.OS === "web" && typeof document !== "undefined") {
  const id = "rn-autofill-fix";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active,
      textarea:-webkit-autofill {
        -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
        -webkit-text-fill-color: #3D3240 !important;
        caret-color: #3D3240 !important;
        transition: background-color 9999s ease-in-out 0s !important;
      }
    `;
    document.head.appendChild(style);
  }
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    OnglyphPDH: require("../assets/fonts/OnglyphPDH.ttf"),
  });
  // 웹에선 커스텀 스플래시를 띄우지 않는다. 정적 익스포트라 스플래시가 HTML 에
  // 그대로 박혀, 루트를 여는 사람(과 크롤러)이 랜딩 대신 "꿈을 해석하는 중..."
  // 만 보게 된다. 네이티브 콜드스타트를 가리려는 장치이므로 웹엔 불필요.
  const [splashDone, setSplashDone] = useState(Platform.OS === "web");

  // 첫 paint(홈 진입)에 필요한 준비 완료 신호 = 폰트 로드.
  // 폰트를 더 이상 첫 렌더의 하드 블로커(`return null`)로 두지 않는다 → 스플래시가 즉시 뜸.
  // 대신 스플래시 종료(onFinish) 게이트로 연결 → 홈은 폰트가 적용된 상태로 등장한다.
  // (폰트 로드 동안 스플래시의 "몽글" 텍스트는 잠깐 시스템 폰트로 보일 수 있음 — FOUT)
  const isAppReady = fontsLoaded;

  // 커스텀 스플래시가 첫 레이아웃으로 그려진 직후 네이티브 스플래시를 hide.
  // 비차단이라 폰트 로드와 무관하게 즉시 인계 → 깜빡임 없음.
  const firstPaintLogged = useRef(false);
  const onRootLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
    // [측정용 임시 — STEP 2-2] 커스텀 스플래시 첫 paint 까지. 검증 후 제거.
    if (!firstPaintLogged.current) {
      firstPaintLogged.current = true;
      console.log(`[coldstart] module→firstPaint ${Date.now() - __coldStartAt}ms`);
    }
  }, []);

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1 }} onLayout={onRootLayout}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
          <DialogHost />
          {!splashDone ? (
            <SplashAnimation
              isAppReady={isAppReady}
              onFinish={() => {
                // [측정용 임시 — STEP 2-2] 검증 후 이 로그 제거
                console.log(
                  `[coldstart] module→splashDone ${Date.now() - __coldStartAt}ms`,
                );
                setSplashDone(true);
              }}
            />
          ) : null}
        </View>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
