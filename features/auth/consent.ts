import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { queryClient } from "@/lib/queryClient";
import { CONSENT_META_KEY } from "@/features/auth/auth";
import { profileKey, updateMyProfile } from "@/features/auth/profile";
import { useMyProfile } from "@/features/auth/profileQueries";

// 약관·개인정보 동의 게이트.
//   pending  — 프로필을 아직 못 읽음. (app) 화면을 그리지 않고 기다린다.
//              홈이 먼저 뜨면 동의 전에 위치 권한 요청·날씨 조회(국외 이전)가 나간다.
//   agreed   — 통과.
//   required — 동의 기록이 없다 → /consent 로 보낸다.
export type ConsentState = "pending" | "agreed" | "required";

// 동의 시각을 profiles 에 남기고, 게이트가 보는 프로필 캐시도 즉시 바꾼다.
// updateMyProfile 의 invalidate 만 믿고 바로 화면을 넘기면 다시 받아오기 전의
// 캐시(terms_agreed_at=null)를 보고 게이트가 동의 화면으로 되돌려 보낸다.
export async function recordConsent(
  userId: string,
  agreedAt: string = new Date().toISOString(),
) {
  const res = await updateMyProfile({ termsAgreedAt: agreedAt });
  if (!res.error && res.data) {
    const profile = res.data;
    queryClient.setQueryData(
      profileKey(userId),
      (old: { profile: unknown; email: string | null } | undefined) =>
        old ? { ...old, profile } : old,
    );
  }
  return res;
}

export function useConsentState(user: User | null): ConsentState {
  const query = useMyProfile(user);
  const agreedAt = query.data?.profile?.terms_agreed_at;
  const metaAgreedAt = user?.user_metadata?.[CONSENT_META_KEY];
  const hasMeta = typeof metaAgreedAt === "string";

  // 이메일 가입자는 가입 폼에서 동의했다(user_metadata). 보통은 handle_new_user
  // 트리거(0022)가 이미 옮겨 놨다. 0022 적용 전에 가입했거나 profiles 행을 앱이
  // 만든 경우(getMyProfile 폴백)만 여기서 옮겨 적는다. 실패해도 막지 않는다.
  // 예전 이메일 가입자는 이 값이 없다 → 동의 화면을 거친다.
  const syncing = useRef(false);
  useEffect(() => {
    if (!user || agreedAt !== null || !hasMeta || syncing.current) return;
    syncing.current = true;
    void recordConsent(user.id, metaAgreedAt).finally(() => {
      syncing.current = false;
    });
  }, [user, agreedAt, hasMeta, metaAgreedAt]);

  if (!user) return "pending";
  if (query.isPending) return "pending";
  // 오프라인 등으로 프로필을 못 읽으면 막지 않는다. 앱 전체가 잠기는 것보다 낫고,
  // 다음 실행 때 다시 확인한다.
  if (query.isError) return "agreed";
  // 행이 없거나(받는 즉시 생성되므로 드묾) 0022 적용 전이라 컬럼이 없으면(undefined) 통과.
  if (agreedAt !== null) return "agreed";
  return hasMeta ? "agreed" : "required";
}
