import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Platform } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

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

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </QueryClientProvider>
  );
}
