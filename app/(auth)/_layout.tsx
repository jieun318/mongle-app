import { Redirect, Stack } from "expo-router";
import { useSession } from "@/features/auth/auth";

// 로그인 성공 시 화면 전환은 여기서만 일어난다.
// 로그인 버튼 핸들러에서 router.replace 를 직접 부르면, 안드로이드에서 커스텀탭이
// 닫히며 앱이 포그라운드로 돌아오는 타이밍과 겹쳐 네비게이션이 유실될 수 있다.
// 세션 존재 여부를 단일 소스로 삼아 선언형으로 보낸다.
export default function AuthLayout() {
  const { session, loading } = useSession();

  if (!loading && session) return <Redirect href="/(app)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
