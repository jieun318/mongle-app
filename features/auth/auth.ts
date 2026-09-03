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

// ── 인증 코드 교환 ─────────────────────────────────────────────
// 교환은 반드시 한 번만. 인증 코드는 1회용이라 두 번째 교환은 실패하고, 그
// 실패가 사용자에게 "로그인 실패"로 뜬다 — 이미 로그인에 성공한 뒤에.
// 전역 딥링크 핸들러와 signInWithKakaoNative 의 로컬 리스너가 같은 url 이벤트를
// 각각 받는 것이 설계 전제라, 중복 호출은 버그가 아니라 정상 경로다.
//   inFlight — 진행 중인 교환. settle 되면 지운다(결과 객체 참조 정리).
//   consumed — 이미 성공한 코드. 재교환 없이 성공으로 답한다.
// 실패한 코드는 어느 쪽에도 남기지 않아 재시도가 가능하다.
const inFlightExchanges = new Map<string, Promise<{ error: Error | null }>>();
const consumedCodes = new Set<string>();

// URL 에 ?code= 가 있으면 세션으로 교환한다. code 가 없으면 null.
// Map 등록이 await 앞에서 동기로 끝나므로 동시 호출도 하나로 합쳐진다.
function exchangeAuthCode(
  url: string,
): Promise<{ error: Error | null } | null> {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code as string | undefined;
  if (!code) return Promise.resolve(null);
  if (consumedCodes.has(code)) return Promise.resolve({ error: null });

  const existing = inFlightExchanges.get(code);
  if (existing) return existing;

  const pending = supabase.auth
    .exchangeCodeForSession(code)
    .then(({ error }) => {
      if (!error) consumedCodes.add(code);
      return { error: (error as Error | null) ?? null };
    })
    .catch((e) => ({
      error: e instanceof Error ? e : new Error(String(e)),
    }))
    .finally(() => {
      inFlightExchanges.delete(code);
    });

  inFlightExchanges.set(code, pending);
  return pending;
}

// ── 세션 스토어 ────────────────────────────────────────────────
// useSession 을 쓰는 화면마다 getSession() 을 따로 호출하면, 액세스 토큰이 만료된
// 콜드스타트에서 여러 갱신이 동시에 나간다. refresh token 은 1회용이라 뒤늦은
// 갱신이 refresh_token_already_used 로 실패하고, GoTrue 는 그때 세션을 삭제한다.
// (= 앱 재시작마다 다시 로그인) 구독을 하나로 모아 getSession 을 1회만 부른다.
type SessionSnapshot = { session: Session | null; loading: boolean };

let snapshot: SessionSnapshot = { session: null, loading: true };
const listeners = new Set<() => void>();
let started = false;

// 콜드스타트 딥링크에 code 가 있는지 확인하고 교환이 끝날 때까지 true.
// onAuthStateChange 는 구독 즉시 INITIAL_SESSION(null) 을 쏘므로(GoTrueClient
// _emitInitialSession), 이 플래그가 없으면 교환 전에 loading 이 풀린다.
// 그러면 (app)/_layout 이 "세션 없음"으로 보고 로그인으로 튕긴다.
let bootLinkPending = false;

// getInitialURL 이나 교환이 네트워크에서 멈춰도 loading 이 영영 안 풀리면
// 앱이 스피너에 갇힌다. 상한을 둔다.
const BOOT_LINK_TIMEOUT_MS = 5000;

function setSnapshot(next: SessionSnapshot): void {
  snapshot = next;
  listeners.forEach((l) => l());
}

function start(): void {
  if (started) return;
  started = true;

  // 네이티브만 콜드스타트 딥링크를 확인한다. 이 플래그는 onAuthStateChange 를
  // 구독하기 전에 세워야 한다 — 구독 즉시 INITIAL_SESSION 이 날아오기 때문.
  bootLinkPending = Platform.OS !== "web";

  supabase.auth.onAuthStateChange((_event, s) => {
    // 세션이 실제로 들어왔으면 대기할 이유가 없다.
    setSnapshot({ session: s, loading: !s && bootLinkPending });
  });

  // 웹은 detectSessionInUrl 이 URL 의 code 를 자동 교환한다. 여기서 또 교환하면
  // 1회용 code 를 두고 충돌하므로 건드리지 않는다.
  if (Platform.OS === "web") {
    void supabase.auth.getSession().then(({ data }) => {
      setSnapshot({ session: data.session, loading: false });
    });
    return;
  }

  // 딥링크를 앱 전역에서 상시로 받는다. signInWithKakaoNative 안의 리스너만으로는
  // 놓치는 경로가 있다:
  //  - 커스텀탭/카카오톡이 떠 있는 동안 프로세스가 회수되면 콜드스타트로 들어오는데,
  //    그 리스너는 사라진 프로세스에 있었다 → getInitialURL 로만 잡을 수 있다.
  //  - 유예시간(DEEP_LINK_GRACE_MS) 뒤에 도착하면 finally 가 이미 리스너를 제거한 뒤다.
  // 이 리스너는 앱 수명 내내 유지한다(제거하지 않는다).
  Linking.addEventListener("url", (e) => {
    void exchangeAuthCode(e.url);
  });

  void Promise.race([
    Linking.getInitialURL()
      .then((url) => (url ? exchangeAuthCode(url) : null))
      .catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), BOOT_LINK_TIMEOUT_MS)),
  ])
    .then(() => {
      bootLinkPending = false;
      return supabase.auth.getSession();
    })
    .then(({ data }) => {
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

    // createTask: false 가 이 파일에서 유일하게 바뀐 곳이다.
    //
    // 기본값(true)은 커스텀탭을 앱과 "별도 태스크"로 띄운다. 그러면 화면 스택이
    // [몽글 태스크] + [커스텀탭 태스크] 로 갈라지는데, 여기서 카카오톡 앱까지
    // 끼어들면 카카오톡이 인증을 마치고 돌아올 때 커스텀탭 태스크가 아니라
    // 몽글 태스크가 앞으로 나온다. 사용자 눈에는 커스텀탭이 빈 화면으로 남고
    // 곧바로 몽글 로그인 화면이 뜬다 — 지금 증상 그대로다.
    // 브라우저 종류와 무관한 안드로이드 태스크 문제라, 삼성 인터넷과 Chrome 에서
    // 똑같이 재현되는 것도 이걸로 설명된다.
    // false 로 두면 커스텀탭이 몽글과 같은 태스크에 들어가 복귀 대상이 하나가 된다.
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      createTask: false,
    });

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
      // 전역 딥링크 핸들러가 먼저 처리했을 수 있다(유예시간 초과 등).
      // 세션이 생겼으면 성공이다 — 여기서 canceled 로 단정하면 성공한 로그인이
      // 아무 메시지 없이 로그인 화면으로 되돌아간다.
      const { data: cur } = await supabase.auth.getSession();
      if (cur.session) return { error: null };
      if (res.type === "cancel" || res.type === "dismiss") {
        return { error: null, canceled: true };
      }
      return { error: new Error("카카오 로그인에 실패했어요") };
    }

    const result = await exchangeAuthCode(callbackUrl);
    if (!result) return { error: new Error("인증 코드를 받지 못했어요") };
    return { error: result.error };
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
