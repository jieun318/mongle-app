import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env",
  );
}

// Expo Router 의 web static rendering 은 Node 환경에서 React 트리를 prerender 한다.
// AsyncStorage 의 web 빌드는 window.localStorage 에 의존하므로 SSR 패스에서 호출되면
// ReferenceError(window is not defined) 가 난다. 서버 패스에선 no-op 로 대체.
const noopStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};
const authStorage = typeof window === "undefined" ? noopStorage : AsyncStorage;

// 웹에선 Supabase 가 풀페이지 redirect 후 URL 의 ?code 를 자동으로 세션으로 교환한다.
// 네이티브에선 브라우저를 직접 열고 code 를 수동 교환하므로 자동 처리는 꺼둔다.
const detectSessionInUrl =
  Platform.OS === "web" && typeof window !== "undefined";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl,
    // PKCE 플로우여야 exchangeCodeForSession / detectSessionInUrl 양쪽에서
    // 세션 발급이 된다.
    flowType: "pkce",
  },
});
