import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { clearUserScopedCaches } from "@/lib/sessionCleanup";
import * as ImageManipulator from "expo-image-manipulator";
import Constants from "expo-constants";

const AVATAR_BUCKET = "avatars";
const AVATAR_FILENAME = "avatar.jpg";
const AVATAR_MAX_SIZE = 500;
const AVATAR_QUALITY = 0.85;

// ── 쿼리 키 ──────────────────────────────────────────────────
// userId 를 넣어 계정별로 캐시를 나눈다. 로그아웃·탈퇴 시엔 clearUserScopedCaches 가
// queryClient.clear() 로 통째로 비운다.
export const PROFILE_KEY = ["profile"] as const;
export const profileKey = (userId: string) => [...PROFILE_KEY, userId] as const;
export const AVATAR_URL_KEY = ["avatarUrl"] as const;
export const avatarUrlKey = (userId: string, path: string) =>
  [...AVATAR_URL_KEY, userId, path] as const;
// signed URL 유효시간. 캐시는 그보다 조금 일찍 버려 만료된 주소를 쓰지 않게 한다.
export const AVATAR_URL_TTL_SEC = 3600;

export const AVATAR_OPTIONS = [
  "🐷",
  "🐯",
  "🐰",
  "🐶",
  "🐼",
  "🦊",
  "🐱",
  "🐧",
  "🌙",
  "⭐",
] as const;

export interface ProfileRecord {
  uid: string;
  nickname: string | null;
  profile_image_url: string | null;
  avatar_emoji: string;
  notify_enabled: boolean;
  notify_dream_reminder: boolean;
  created_at: string;
  // 0022 적용 전 DB 에는 컬럼이 없어 undefined 로 온다. 동의 게이트는 null 일 때만
  // 동의 화면으로 보낸다 — 마이그레이션 전에 앱이 먼저 나가도 전원이 갇히지 않게.
  terms_agreed_at?: string | null;
}

type SupaError = { message: string } | null;

// sessionUser 는 호출부가 세션 스토어(useSession)의 session.user 를 넘긴다.
// 예전엔 getUser() 로 Auth 서버에 매번 물었는데, 마이페이지 진입마다 그 왕복이
// profiles 조회 앞에 직렬로 끼었다. 넘길 수 없는 곳(모달 등)만 getSession 으로
// 기기에 저장된 세션을 읽는다 — 네트워크 없음. 신원 검증은 RLS 가 맡는다.
export async function getMyProfile(sessionUser?: User | null): Promise<{
  data: ProfileRecord | null;
  email: string | null;
  error: SupaError;
}> {
  let user = sessionUser ?? null;
  if (!user) {
    const { data: sessionRes, error: sessionErr } =
      await supabase.auth.getSession();
    if (sessionErr) return { data: null, email: null, error: sessionErr };
    user = sessionRes.session?.user ?? null;
  }
  if (!user) {
    return { data: null, email: null, error: { message: "로그인이 필요해요" } };
  }

  // maybeSingle: 행이 없어도 에러를 던지지 않고 data: null 로 돌려줌
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("uid", user.id)
    .maybeSingle<ProfileRecord>();

  if (error) return { data: null, email: user.email ?? null, error };

  // handle_new_user 트리거가 누락됐거나 트리거 추가 이전에 가입한 사용자는
  // profiles 행이 없을 수 있다. 이 경우 기본값으로 즉시 생성한다.
  if (!data) {
    // handle_new_user 트리거(0018)와 같은 우선순위를 쓴다. 두 곳이 어긋나면
    // 같은 계정이 경로에 따라 다른 닉네임을 갖게 된다.
    // 카카오는 nickname 키를 만들지 않고 name/full_name/user_name/
    // preferred_username 에 같은 값을 넣는다.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const pickMeta = (key: string): string | undefined => {
      const v = meta[key];
      return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };
    const fallbackNickname =
      pickMeta("nickname") ??
      pickMeta("name") ??
      pickMeta("full_name") ??
      pickMeta("user_name") ??
      pickMeta("preferred_username") ??
      "몽글이";
    const { data: created, error: createErr } = await supabase
      .from("profiles")
      .insert({ uid: user.id, nickname: fallbackNickname })
      .select()
      .single<ProfileRecord>();
    if (createErr) {
      return { data: null, email: user.email ?? null, error: createErr };
    }
    return { data: created, email: user.email ?? null, error: null };
  }

  return { data, email: user.email ?? null, error: null };
}

export interface UpdateProfileInput {
  nickname?: string;
  avatarEmoji?: string;
  // null 로 명시적으로 비우면 photo 제거 후 emoji 폴백
  profileImageUrl?: string | null;
  notifyEnabled?: boolean;
  notifyDreamReminder?: boolean;
  // ISO 시각. 동의 화면·가입 폼 동의 기록용(features/auth/consent.ts)
  termsAgreedAt?: string;
}

export async function updateMyProfile(input: UpdateProfileInput) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { data: null, error: userErr };
  const user = userRes.user;
  if (!user) {
    return { data: null, error: { message: "로그인이 필요해요" } };
  }

  // upsert 로 처리 — profiles 행이 없는 사용자(트리거 누락 등)에게도
  // 안전하게 동작한다. uid 충돌 시 update.
  const patch: Record<string, unknown> = { uid: user.id };
  if (input.nickname !== undefined) patch.nickname = input.nickname;
  if (input.avatarEmoji !== undefined) patch.avatar_emoji = input.avatarEmoji;
  if (input.profileImageUrl !== undefined)
    patch.profile_image_url = input.profileImageUrl;
  if (input.notifyEnabled !== undefined)
    patch.notify_enabled = input.notifyEnabled;
  if (input.notifyDreamReminder !== undefined)
    patch.notify_dream_reminder = input.notifyDreamReminder;
  if (input.termsAgreedAt !== undefined)
    patch.terms_agreed_at = input.termsAgreedAt;

  const res = await supabase
    .from("profiles")
    .upsert(patch, { onConflict: "uid" })
    .select()
    .single<ProfileRecord>();
  // 마이페이지 프로필 카드가 바뀐 닉네임·아바타를 보도록 프로필 쿼리만 다시 받게 한다.
  if (!res.error) void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
  return res;
}

// api/kakao-unlink 주소 — api/chat·api/weather 와 같은 규칙.
function getKakaoUnlinkUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (base) return `${base.replace(/\/$/, "")}/api/kakao-unlink`;
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (hostUri) return `http://${hostUri.split(":")[0]}:8081/api/kakao-unlink`;
  return "/api/kakao-unlink";
}

// 회원 탈퇴 — 아바타 삭제 → 카카오 연결 끊기 → delete_my_account() RPC → 로그아웃.
// auth.users 가 삭제되면 profiles / dreams / bookmarks 는
// ON DELETE CASCADE 로 자동 정리된다.
export async function deleteMyAccount() {
  // 아바타 파일은 RPC 앞에서 지운다. storage.objects 는 SQL DELETE 가 막혀 있어
  // (0017 참고) 함수 안에서 처리할 수 없고, auth.users 를 지운 뒤에는 RLS 가
  // 본인 폴더를 인정하지 못할 수 있다.
  //
  // 실패는 무시한다 — 파일 하나가 남는 것보다 탈퇴가 막히는 쪽이 훨씬 나쁘다.
  // (아바타를 한 번도 올리지 않은 계정이면 지울 대상이 없는 게 정상이다.
  //  Storage API 의 remove 는 없는 경로에도 에러를 내지 않는다.)
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (uid) {
      await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath(uid)]);
    }
  } catch {
    // 무시
  }

  // 카카오 연결 끊기 — RPC 앞이어야 한다(auth.users 가 지워지면 서버가 카카오
  // 회원번호를 조회할 수 없다). 카카오 계정이 아니면 서버가 skipped 로 답한다.
  // 실패는 무시한다 — 아바타와 같은 이유. 원인은 서버 로그(console.error)에 남는다.
  try {
    const { data: sessionRes } = await supabase.auth.getSession();
    const token = sessionRes.session?.access_token;
    if (token) {
      const res = await fetch(getKakaoUnlinkUrl(), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      // fetch 는 4xx/5xx 에도 throw 하지 않는다. 확인 안 하면 실패가 흔적 없이 묻힌다.
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[deleteMyAccount] kakao unlink failed:", res.status, body);
      }
    }
  } catch (e) {
    console.error("[deleteMyAccount] kakao unlink request error:", e);
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error };
  // 클라이언트 세션도 정리
  await supabase.auth.signOut();
  await clearUserScopedCaches();
  return { error: null };
}

// ============================================================
// 프로필 이미지 — Supabase Storage (avatars 버킷)
//   파일 경로: {user.id}/avatar.jpg
//   업로드 전 expo-image-manipulator 로 최대 500x500 + JPEG 압축.
//   profile_image_url 컬럼에는 storage path 만 저장하고,
//   표시 시점에 createSignedUrl 로 1시간짜리 URL 을 생성한다.
// ============================================================

function avatarPath(userId: string): string {
  return `${userId}/${AVATAR_FILENAME}`;
}

async function resizeForUpload(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: AVATAR_MAX_SIZE, height: AVATAR_MAX_SIZE } }],
    {
      compress: AVATAR_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  return result.uri;
}

export async function uploadAvatar(localUri: string): Promise<{
  data: ProfileRecord | null;
  error: SupaError;
}> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { data: null, error: userErr };
  const user = userRes.user;
  if (!user) {
    return { data: null, error: { message: "로그인이 필요해요" } };
  }

  // 1) 리사이즈
  let resizedUri: string;
  try {
    resizedUri = await resizeForUpload(localUri);
  } catch (e) {
    return {
      data: null,
      error: { message: "이미지를 처리하지 못했어요" },
    };
  }

  // 2) 바이너리로 읽기 — RN 의 fetch 가 file:// URI 를 지원하므로
  //    arrayBuffer 로 직접 가져온다.
  let bytes: ArrayBuffer;
  try {
    const response = await fetch(resizedUri);
    bytes = await response.arrayBuffer();
  } catch (e) {
    return { data: null, error: { message: "이미지를 읽지 못했어요" } };
  }

  // 3) Storage 업로드 (upsert)
  const path = avatarPath(user.id);
  const { error: uploadErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (uploadErr) return { data: null, error: uploadErr };

  // 4) profiles.profile_image_url 에 path 저장
  // 파일 경로는 늘 같으므로(uid/avatar.jpg) 캐시된 signed URL 도 버려야 새 사진이 보인다.
  void queryClient.invalidateQueries({ queryKey: AVATAR_URL_KEY });
  return updateMyProfile({ profileImageUrl: path });
}

export async function removeAvatar(): Promise<{
  data: ProfileRecord | null;
  error: SupaError;
}> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { data: null, error: userErr };
  const user = userRes.user;
  if (!user) {
    return { data: null, error: { message: "로그인이 필요해요" } };
  }

  const path = avatarPath(user.id);
  // 파일 삭제 (없어도 무해)
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  void queryClient.invalidateQueries({ queryKey: AVATAR_URL_KEY });

  return updateMyProfile({ profileImageUrl: null });
}

// 비공개 버킷이므로 표시 시 1시간 유효 signed URL 을 생성.
// path 가 비어있으면 null.
export async function getAvatarSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_TTL_SEC);
  if (error) return null;
  return data?.signedUrl ?? null;
}
