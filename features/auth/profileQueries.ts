import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import {
  AVATAR_URL_TTL_SEC,
  avatarUrlKey,
  getAvatarSignedUrl,
  getMyProfile,
  profileKey,
} from "@/features/auth/profile";

// 마이페이지 프로필 카드. 프로필은 updateMyProfile 이 invalidate 하므로 기본 staleTime
// (1h) 으로 충분하다. 예전엔 진입마다 다시 받았다.
export function useMyProfile(sessionUser: User | null) {
  return useQuery({
    queryKey: profileKey(sessionUser?.id ?? ""),
    queryFn: async () => {
      const res = await getMyProfile(sessionUser);
      if (res.error) throw new Error(res.error.message);
      return { profile: res.data, email: res.email };
    },
    enabled: !!sessionUser,
  });
}

// 아바타 signed URL. 예전엔 진입마다 새 토큰의 URL 을 만들어서 같은 사진을 매번
// 다시 받고 깜빡였다. 만료 전까지 같은 URL 을 재사용해 이미지 캐시가 먹게 한다.
const AVATAR_URL_REUSE_MS = (AVATAR_URL_TTL_SEC - 10 * 60) * 1000; // 만료 10분 전까지

export function useAvatarUrl(userId: string | null, path: string | null | undefined) {
  return useQuery({
    queryKey: avatarUrlKey(userId ?? "", path ?? ""),
    queryFn: () => getAvatarSignedUrl(path),
    enabled: !!userId && !!path,
    staleTime: AVATAR_URL_REUSE_MS,
    gcTime: AVATAR_URL_REUSE_MS,
  });
}
