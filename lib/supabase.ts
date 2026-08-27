import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { createClient, processLock } from "@supabase/supabase-js";

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
// 네이티브는 조건에서 아예 빼둔다. window 유무만 보면, RN 이 InitializeCore 에서
// global.window = global 로 별칭을 까는 부수 효과에 세션 영속화 전체가 매달린다.
// 그게 흔들리면 네이티브가 조용히 noopStorage 로 떨어지면서 세션 영속화와
// PKCE code_verifier 가 동시에 죽는다 — "재시작마다 로그아웃 + 카카오 로그인 실패".
const authStorage =
  Platform.OS === "web" && typeof window === "undefined"
    ? noopStorage
    : AsyncStorage;

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
    // 네이티브에는 navigator.locks 가 없어 GoTrueClient 가 lockNoOp(잠금 없음)으로
    // 떨어진다(GoTrueClient 의 lock 선택 로직). 그러면 토큰 갱신이 동시에 두 번
    // 실행될 수 있는데 refresh token 은 1회용이라 두 번째가 실패하면서 세션이
    // 통째로 삭제된다 → 앱을 껐다 켜면 다시 로그인. processLock 으로 직렬화한다.
    lock: processLock,
  },
});

// 포그라운드에서만 자동 갱신 타이머를 돌린다. 백그라운드에서 타이머가 살아 있으면
// 복귀 시점의 갱신과 겹칠 수 있다. (Supabase React Native 권장 구성)
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
