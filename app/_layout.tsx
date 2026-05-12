import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Platform, View } from "react-native";
import { useCallback, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { queryClient } from "@/lib/queryClient";
import SplashAnimation from "@/components/SplashAnimation";
import { setupNotificationHandler } from "@/lib/notifications";

// 네이티브 스플래시는 폰트 로드 후 onLayout 시점에 직접 hide 한다.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [splashDone, setSplashDone] = useState(false);

  // 첫 paint 직후 네이티브 스플래시 hide → 커스텀 오버레이가 자연스럽게 이어받음
  const onRootLayout = useCallback(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1 }} onLayout={onRootLayout}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
          {!splashDone ? (
            <SplashAnimation onFinish={() => setSplashDone(true)} />
          ) : null}
        </View>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
