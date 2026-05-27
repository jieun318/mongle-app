import { useEffect, useState } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";

// 소셜 로그인 결과 — error 가 null 이면 성공, 사용자가 취소하면 canceled=true
export type SocialResult = { error: Error | null; canceled?: boolean };

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export async function signOut() {
  return supabase.auth.signOut();
}

// 카카오 로그인 — 플랫폼별로 흐름이 다르다.
//  - 네이티브: 시스템 브라우저로 OAuth URL 을 열고, mongle://auth-callback 으로
//    돌아온 code 를 PKCE 로 세션 교환.
//  - 웹: Supabase 가 직접 풀페이지 redirect 처리. /auth-callback 라우트에서
//    detectSessionInUrl 이 code 를 자동으로 세션으로 교환.
export async function signInWithKakao(): Promise<SocialResult> {
  if (Platform.OS === "web") return signInWithKakaoWeb();
  return signInWithKakaoNative();
}

async function signInWithKakaoWeb(): Promise<SocialResult> {
  try {
    if (typeof window === "undefined") {
      return { error: new Error("브라우저 환경이 아니에요") };
    }
    const redirectTo = `${window.location.origin}/auth-callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo, scopes: "profile_nickname profile_image" },
    });
    // 성공 시 Supabase 가 풀페이지 redirect 를 시작하므로 이 아래는 실행되지 않음.
    return { error: error ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

async function signInWithKakaoNative(): Promise<SocialResult> {
  try {
    const redirectTo = makeRedirectUri({ scheme: "mongle", path: "auth-callback" });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes: "profile_nickname profile_image",
      },
    });
    if (error) return { error };
    if (!data?.url) return { error: new Error("카카오 인증 URL 을 만들지 못했어요") };

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === "cancel" || res.type === "dismiss") {
      return { error: null, canceled: true };
    }
    if (res.type !== "success" || !res.url) {
      return { error: new Error("카카오 로그인에 실패했어요") };
    }

    const { queryParams } = Linking.parse(res.url);
    const code = queryParams?.code as string | undefined;
    if (!code) return { error: new Error("인증 코드를 받지 못했어요") };

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    return { error: exchangeError ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

// 애플: iOS 네이티브 시트로만 동작 (App Store 정책상 iOS 는 네이티브 필수).
// identityToken 을 Supabase signInWithIdToken 으로 교환.
export async function signInWithApple(): Promise<SocialResult> {
  if (Platform.OS !== "ios") {
    return { error: new Error("애플 로그인은 iOS 에서만 지원돼요") };
  }
  try {
    const AppleAuthentication = await import("expo-apple-authentication");
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return { error: new Error("애플 인증 토큰을 받지 못했어요") };
    }
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    return { error: error ?? null };
  } catch (e) {
    // 사용자가 시트를 닫으면 ERR_REQUEST_CANCELED
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "ERR_REQUEST_CANCELED"
    ) {
      return { error: null, canceled: true };
    }
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
