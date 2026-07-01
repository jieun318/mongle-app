import { supabase } from "@/lib/supabase";

export interface ReportContextTurn {
  role: "user" | "assistant";
  text: string;
}

// AI 챗봇 응답 신고 — Google Play 생성형 AI 콘텐츠 정책상 인앱 신고 수단.
// 본인 user_id 로 ai_message_reports 에 insert (RLS 로 본인만 허용).
// context 는 신고된 응답 직전의 대화 맥락(선택), reason 은 향후 확장용.
export async function reportAiMessage(
  message: string,
  context: ReportContextTurn[] = [],
  reason?: string,
): Promise<{ error: Error | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return { error: new Error("로그인이 필요해요") };

  const { error } = await supabase.from("ai_message_reports").insert({
    user_id: user.id,
    message,
    context,
    reason: reason ?? null,
  });
  return { error };
}
