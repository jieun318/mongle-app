import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";
import { clearUserScopedCaches } from "@/lib/sessionCleanup";

// 소셜 로그인 결과 — error 가 null 이면 성공, 사용자가 취소하면 canceled=true
export type SocialResult = { error: Error | null; canceled?: boolean };

// 이메일 인증 결과 — 취소 개념이 없는 대신, 가입 후 메일 확인이 필요하면
// needsEmailConfirm=true (이때 세션은 아직 없다).
export type EmailResult = { error: Error | null; needsEmailConfirm?: boolean };

// ── 세션 스토어 ────────────────────────────────────────────────
// useSession 을 쓰는 화면마다 getSession() 을 따로 호출하면, 액세스 토큰이 만료된
// 콜드스타트에서 여러 갱신이 동시에 나간다. refresh token 은 1회용이라 뒤늦은
// 갱신이 refresh_token_already_used 로 실패하고, GoTrue 는 그때 세션을 삭제한다.
// (= 앱 재시작마다 다시 로그인) 구독을 하나로 모아 getSession 을 1회만 부른다.
type SessionSnapshot = { session: Session | null; loading: boolean };

let snapshot: SessionSnapshot = { session: null, loading: true };
const listeners = new Set<() => void>();
let started = false;

function setSnapshot(next: SessionSnapshot): void {
  snapshot = next;
  listeners.forEach((l) => l());
}

function start(): void {
  if (started) return;
  started = true;

  supabase.auth.onAuthStateChange((_event, s) => {
    setSnapshot({ session: s, loading: false });
  });

  void supabase.auth.getSession().then(({ data }) => {
    setSnapshot({ session: data.session, loading: false });
  });
}

function subscribe(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): SessionSnapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}

export async function signOut() {
  const res = await supabase.auth.signOut();
  // 정리는 signOut 이후에. 먼저 지우면 아직 살아있는 세션으로 진행 중이던
  // 요청이 이전 계정 데이터를 캐시에 다시 채울 수 있다.
  await clearUserScopedCaches();
  return res;
}

// ── 이메일/비밀번호 인증 ────────────────────────────────────────
// 세션 반영은 카카오/애플과 동일하다. 여기서 스냅샷을 직접 건드리지 않고,
// GoTrue 가 세션을 저장할 때 나오는 onAuthStateChange 를 start() 의 구독이
// 받아 setSnapshot 한다.

// GoTrue 에러 → 사용자에게 그대로 보여줄 한국어 문구.
// 호출부(LoginForm)가 error.message 를 다이얼로그에 그대로 띄우므로
// 원문(영문) 메시지가 새어나가지 않게 여기서 전부 갈아끼운다.
function toKoreanAuthError(e: unknown): Error {
  // fetch 실패/타임아웃은 code 가 없으므로 먼저 걸러낸다.
  if (isAuthRetryableFetchError(e)) {
    return new Error("네트워크 연결을 확인해 주세요");
  }
  const code =
    e && typeof e === "object" && "code" in e
      ? (e as { code?: string }).code
      : undefined;

  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return new Error("이미 가입된 이메일이에요");
    case "invalid_credentials":
      return new Error("이메일 또는 비밀번호가 일치하지 않아요");
    case "email_address_invalid":
      return new Error("이메일 형식이 올바르지 않아요");
    case "weak_password":
      return new Error("비밀번호는 8자 이상으로 입력해 주세요");
    case "email_not_confirmed":
      return new Error("메일함에서 인증 링크를 먼저 확인해 주세요");
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return new Error("요청이 너무 잦아요. 잠시 후 다시 시도해 주세요");
    default:
      // RN 의 fetch 실패는 AuthRetryableFetchError 로 안 감싸이고
      // TypeError("Network request failed") 로 올라오는 경로가 있다.
      if (e instanceof TypeError && /network/i.test(e.message)) {
        return new Error("네트워크 연결을 확인해 주세요");
      }
      // validation_failed 는 이메일 형식 외에도 붙는 범용 코드라 여기로 흘린다.
      return new Error("로그인에 실패했어요. 잠시 후 다시 시도해 주세요");
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<EmailResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) return { error: toKoreanAuthError(error) };

    // 이메일 확인이 켜져 있으면 GoTrue 는 이미 가입된 주소에도 에러 대신
    // identities 가 빈 더미 user 를 돌려준다(주소 존재 여부 노출 방지).
    // 이걸 성공으로 넘기면 "가입됨"이라고 안내하게 되므로 여기서 잡는다.
    if (data.user && data.user.identities?.length === 0) {
      return { error: new Error("이미 가입된 이메일이에요") };
    }
    // 확인 메일이 필요한 구성에서는 session 이 null 로 온다.
    return { error: null, needsEmailConfirm: data.session === null };
  } catch (e) {
    return { error: toKoreanAuthError(e) };
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<EmailResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error ? toKoreanAuthError(error) : null };
  } catch (e) {
    return { error: toKoreanAuthError(e) };
  }
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

// 딥링크가 WebBrowser 결과보다 먼저 도착할 때를 대비한 여유 시간.
const DEEP_LINK_GRACE_MS = 1500;

async function signInWithKakaoNative(): Promise<SocialResult> {
  let sub: { remove: () => void } | undefined;
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

    // MainActivity 가 singleTask 라 mongle:// 리다이렉트가 커스텀탭 결과 대신
    // 딥링크 인텐트로 들어오는 경우가 있다. 그때 openAuthSessionAsync 는
    // dismiss 를 돌려주므로, 딥링크 URL 도 같이 받아서 어느 쪽이든 코드를 잡는다.
    let deepLinkUrl: string | undefined;
    const deepLink = new Promise<string>((resolve) => {
      sub = Linking.addEventListener("url", (e) => {
        deepLinkUrl = e.url;
        resolve(e.url);
      });
    });

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    let callbackUrl: string | undefined;
    if (res.type === "success" && res.url) {
      callbackUrl = res.url;
    } else {
      callbackUrl =
        deepLinkUrl ??
        (await Promise.race([
          deepLink,
          new Promise<undefined>((r) =>
            setTimeout(() => r(undefined), DEEP_LINK_GRACE_MS),
          ),
        ]));
    }

    if (!callbackUrl) {
      // 딥링크도 안 왔으면 사용자가 브라우저를 닫은 것으로 본다.
      if (res.type === "cancel" || res.type === "dismiss") {
        return { error: null, canceled: true };
      }
      return { error: new Error("카카오 로그인에 실패했어요") };
    }

    const { queryParams } = Linking.parse(callbackUrl);
    const code = queryParams?.code as string | undefined;
    if (!code) return { error: new Error("인증 코드를 받지 못했어요") };

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    return { error: exchangeError ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  } finally {
    sub?.remove();
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
