import { supabase } from "@/lib/supabase";
import * as ImageManipulator from "expo-image-manipulator";

const AVATAR_BUCKET = "avatars";
const AVATAR_FILENAME = "avatar.jpg";
const AVATAR_MAX_SIZE = 500;
const AVATAR_QUALITY = 0.85;

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

export type AvatarEmoji = (typeof AVATAR_OPTIONS)[number];

export interface ProfileRecord {
  uid: string;
  nickname: string | null;
  profile_image_url: string | null;
  avatar_emoji: string;
  notify_enabled: boolean;
  notify_dream_reminder: boolean;
  created_at: string;
}

type SupaError = { message: string } | null;

export async function getMyProfile(): Promise<{
  data: ProfileRecord | null;
  email: string | null;
  error: SupaError;
}> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { data: null, email: null, error: userErr };
  const user = userRes.user;
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
    const fallbackNickname =
      (user.user_metadata?.nickname as string | undefined) ?? "몽글이";
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

  return supabase
    .from("profiles")
    .upsert(patch, { onConflict: "uid" })
    .select()
    .single<ProfileRecord>();
}

// 회원 탈퇴 — schema.sql 의 delete_my_account() RPC 호출.
// auth.users 가 삭제되면 profiles / dreams / bookmarks 는
// ON DELETE CASCADE 로 자동 정리된다.
export async function deleteMyAccount() {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error };
  // 클라이언트 세션도 정리
  await supabase.auth.signOut();
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
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}
