import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Keyboard,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Svg, { Path } from "react-native-svg";
import Constants from "expo-constants";
import { getMyProfile } from "@/features/auth/profile";
import { supabase } from "@/lib/supabase";
import { createDream, todayISODate } from "@/features/dream/dreams";
import { reportAiMessage } from "@/features/chat/reports";
import {
  clearChatSession,
  loadChatSession,
  saveChatSession,
  type DreamMeta,
} from "@/features/chat/chatSession";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Props {
  visible: boolean;
  onClose: () => void;
  // 보관함 저장 결과를 부모(홈 화면) 토스트로 알리는 콜백
  onSaved?: (message: string) => void;
  // 모달을 열 때 입력창에 미리 채워둘 텍스트 (예: 검색어). 자동 전송은 하지 않는다.
  initialText?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  // 클라이언트에서 즉시 띄우는 공감 한 줄. API 요청에는 포함하지 않는다.
  isStub?: boolean;
}

// 가위눌림(수면마비). "가위" 와 "눌" 사이에 부사·시간 표현이 끼는 경우가 많아
// 문자열 포함으로는 대부분 놓친다. 문장 경계는 넘지 않게 10자로 제한.
const GAWI_RE = /가위[^.!?\n]{0,10}눌/;

// 자주 등장하는 꿈 키워드에 대한 contextual 공감 멘트. 위에서부터 먼저 매칭되는 항목 사용.
const CONTEXTUAL_EMPATHY: ReadonlyArray<{
  keywords: readonly string[];
  // 사이에 다른 말이 끼는 표현을 위한 선택적 정규식 (keywords 와 OR)
  pattern?: RegExp;
  line: string;
}> = [
  // 가위눌림은 꿈이 아니라 수면마비다. 목록 맨 위에 둬서 다른 키워드보다 먼저
  // 잡히게 하고, 문구에서도 "꿈"이라 부르지 않는다.
  {
    keywords: ["가위눌", "수면마비", "몸이 안 움직", "몸을 못 움직"],
    // "가위에 자주 눌려", "어젯밤 가위 심하게 눌렸어" 처럼 사이에 말이 끼는 게
    // 오히려 흔하다. 단순 문자열 매칭으로는 다 놓친다.
    pattern: GAWI_RE,
    line: "가위에 눌리셨군요, 몸이 안 움직여서 많이 무서우셨겠어요 😰",
  },
  { keywords: ["좀비"], line: "좀비 꿈, 정말 무서웠겠어요 🧟" },
  { keywords: ["쫓기", "도망"], line: "쫓기는 꿈, 마음이 많이 졸였겠어요 😨" },
  { keywords: ["물에 빠지", "홍수", "바다"], line: "물에 빠지는 꿈, 정말 숨막혔겠어요 🌊" },
  { keywords: ["수영"], line: "수영하는 꿈, 시원한 느낌이었겠어요 🏊" },
  {
    keywords: ["자전거"],
    line: "자전거 타는 꿈이라니, 시원하게 달리는 기분이었겠어요 🚲",
  },
  {
    keywords: ["달리", "뛰는", "뛰어", "계주", "마라톤"],
    line: "달리는 꿈이라니, 활기찬 장면이었겠어요 🏃",
  },
  { keywords: ["떨어지", "추락", "낙하"], line: "떨어지는 꿈, 가슴이 철렁했겠어요 🪂" },
  {
    keywords: ["날아", "하늘", "비행기"],
    line: "하늘을 나는 꿈이라니, 자유로운 기분이었겠어요 ✨",
  },
  { keywords: ["뱀"], line: "뱀 꿈, 강렬한 장면이었겠어요 🐍" },
  { keywords: ["용 ", "용꿈", "용을"], line: "용 꿈이라니, 정말 신비로웠겠어요 🐉" },
  { keywords: ["호랑이"], line: "호랑이 꿈, 위엄 있는 장면이었겠어요 🐯" },
  { keywords: ["강아지", "개꿈", "개를"], line: "강아지 꿈, 따뜻한 느낌이었겠어요 🐶" },
  { keywords: ["고양이"], line: "고양이 꿈, 인상 깊은 장면이었겠어요 🐱" },
  {
    keywords: ["시험", "수능", "공부", "학교", "면접"],
    line: "시험 꿈, 마음이 조마조마했겠어요 📝",
  },
  { keywords: ["결혼"], line: "결혼 꿈이라니, 설레는 마음이었겠어요 💍" },
  { keywords: ["이별", "헤어"], line: "이별 꿈, 마음이 시렸겠어요 💔" },
  { keywords: ["임신", "태몽"], line: "태몽 같은 꿈, 따뜻한 기운이 느껴져요 🤰" },
  { keywords: ["아기", "신생아"], line: "아기 꿈이라니, 마음이 포근해졌겠어요 👶" },
  { keywords: ["죽", "사망", "장례"], line: "죽음이 나오는 꿈, 마음이 무거웠겠어요" },
  { keywords: ["피"], line: "피 나오는 꿈, 많이 놀라셨겠어요" },
  { keywords: ["불 ", "불꿈", "화재"], line: "불이 나오는 꿈, 강렬했겠어요 🔥" },
  { keywords: ["돈", "금", "복권", "로또"], line: "돈이 나오는 꿈, 마음이 두근했겠어요 💰" },
  {
    keywords: ["똥", "대변"],
    line: "똥 꿈이라니, 살짝 당황하셨죠? 사실 길몽으로 알려져있어요 💩",
  },
  { keywords: ["싸움", "다투", "싸우"], line: "다투는 꿈, 마음이 답답했겠어요 🥊" },
  { keywords: ["이사", "집을 옮"], line: "이사하는 꿈, 마음이 분주했겠어요 🏠" },
  { keywords: ["여행"], line: "여행하는 꿈, 마음이 설레었겠어요 ✈️" },
  { keywords: ["요리", "음식"], line: "음식이 나오는 꿈, 마음이 따뜻해졌겠어요 🍽️" },
];

// 키워드에 안 걸린 꿈도 분위기(공포/슬픔/긍정/중립)를 어림해서
// 마무리 표현을 여러 개 중 하나로 골라 매번 똑같이 "인상 깊으셨겠어요" 가
// 반복되지 않도록 한다. (instant 표시용이라 AI 호출 없이 클라이언트에서 처리)
const SENTIMENT_CUES: Record<"scary" | "sad" | "good", readonly string[]> = {
  scary: [
    "무서", "공포", "쫓", "도망", "괴물", "귀신", "악몽", "피",
    "죽", "사고", "추락", "떨어", "불안", "소름", "오싹", "납치", "위험",
    "수면마비",
  ],
  sad: ["슬프", "울었", "눈물", "이별", "헤어", "그리", "외로", "보고싶", "잃", "장례", "후회"],
  good: [
    "행복", "기쁘", "웃", "신나", "즐거", "설레", "사랑", "예쁘",
    "아름", "선물", "성공", "합격", "용", "빛나", "포근", "따뜻",
  ],
};

// 분위기별 마무리 표현 풀 — 토픽 뒤에 붙여 "○○ 꿈, △△△" 형태로 완성.
const FALLBACK_CLOSERS: Record<"scary" | "sad" | "good" | "neutral", readonly string[]> = {
  scary: [
    "마음이 많이 졸였겠어요 😨",
    "가슴이 철렁했겠어요 😰",
    "꽤 오싹한 장면이었겠어요 😨",
    "놀란 마음이 쉽게 가시질 않았겠어요 😣",
  ],
  sad: [
    "마음이 먹먹했겠어요 🥺",
    "마음이 시렸겠어요 💧",
    "여운이 길게 남았겠어요 🥺",
  ],
  good: [
    "기분 좋은 장면이었겠어요 ✨",
    "좋은 기운이 느껴져요 💫",
    "괜히 설레는 꿈이네요 🌟",
    "왠지 마음이 들뜨는 꿈이에요 ✨",
  ],
  neutral: [
    "인상 깊으셨겠어요 🌙",
    "기억에 오래 남을 장면이네요 💭",
    "어떤 의미일지 궁금해지는 꿈이에요 🌙",
    "마음 한켠에 남는 꿈이네요 💫",
    "묘하게 여운이 남는 꿈이에요 🌙",
  ],
};

// 사용자가 "꿈"이라는 말을 쓰지 않았을 때 쓰는 문구. 무엇을 겪었는지 모르는
// 상태에서 "그런 꿈을 꾸셨군요" 라고 단정하면(가위눌림·불면·잠꼬대 등) 어긋난다.
// 여기선 겪은 일을 꿈으로 규정하지 않고 마음만 받아준다.
const NON_DREAM_OPENERS: Record<"scary" | "sad" | "good" | "neutral", readonly string[]> = {
  scary: [
    "많이 놀라셨겠어요 😰",
    "무서우셨겠어요, 지금은 좀 괜찮으신가요 😨",
  ],
  sad: [
    "마음이 많이 무거우셨겠어요 🥺",
    "그런 밤은 유난히 길게 느껴지죠 💧",
  ],
  good: [
    "좋은 기운이 느껴지네요 ✨",
    "기분 좋은 밤이었겠어요 💫",
  ],
  neutral: [
    "그러셨군요, 편하게 더 들려주세요 🌙",
    "이야기해 주셔서 고마워요. 조금만 더 자세히 들려주실래요? 💭",
  ],
};

function detectSentiment(text: string): keyof typeof FALLBACK_CLOSERS {
  // 가위눌림은 문자열 큐로 안 잡히므로 먼저 본다.
  if (GAWI_RE.test(text)) return "scary";
  for (const key of ["scary", "sad", "good"] as const) {
    if (SENTIMENT_CUES[key].some((c) => text.includes(c))) return key;
  }
  return "neutral";
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── 위기 발화 감지 ──────────────────────────────────────────────
// 사용자가 "자신의 현재 상태"로 자살·자해를 표현한 경우만 잡는다.
// 꿈 내용 서술("죽는 꿈", "죽었어", "죽이는")은 잡지 않는다 — 한국 해몽에서
// 죽음은 재생·새 출발의 흔한 상징이라 여기서 위기 대응이 나오면 부자연스럽다.
//
// 구분 기준은 어미다. 본인 상태는 "~고 싶다"(의지·희망) 꼴이고,
// 꿈 서술은 과거형·관형형("죽었다/죽는/죽은")이다. 그래서 "죽" 단독이 아니라
// 어미까지 묶어서 매칭한다.
// 과잉 탐지가 미탐보다 UX 를 크게 해치므로, 애매하면 잡지 않는 쪽으로 좁게 둔다.
//
// api/chat.ts 의 최우선 안전 규칙과 같은 기준. 서버가 놓치거나 응답이
// 실패해도 동작하는 마지막 방어선이라 클라이언트에도 둔다.
const CRISIS_PATTERNS: readonly RegExp[] = [
  /죽고\s*싶/,
  /죽어\s*버리고\s*싶/,
  /사라지고\s*싶/,
  /살기\s*싫/,
  /살고\s*싶지\s*않/,
  /자해/,
];

function isCrisisDisclosure(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

// 위기 발화에는 공감 한 줄 대신 이 안내를 띄운다.
// 이모지를 쓰지 않는다 — 다른 스텁과 톤을 맞추려다 가벼워지면 안 된다.
const SAFETY_STUB = `지금 많이 힘드신 것 같아요. 그 마음, 혼자 감당하지 않으셨으면 해요.

전문 상담사와 지금 바로 이야기 나눌 수 있어요.
· 자살예방상담전화 109 (24시간)
· 정신건강위기상담전화 1577-0199 (24시간)

꿈 이야기는 마음이 좀 놓이시면 그때 이어가도 괜찮아요.`;

// 어느 키워드에도 안 걸리면, 입력 텍스트의 분위기 + "꿈" 앞 토픽을 뽑아
// 매번 다른 한 줄을 만든다.
// 예: "자전거 타는 꿈을 꿨어요" → "자전거 타는 꿈, 좋은 기운이 느껴져요 💫"
//     "꿈에서 산을 봤어" → 토픽 매칭 안 됨 → 분위기 기반 보편 폴백
function pickEmpathy(userText: string): string {
  const lower = userText.toLowerCase();
  for (const entry of CONTEXTUAL_EMPATHY) {
    if (
      entry.pattern?.test(userText) ||
      entry.keywords.some((k) => lower.includes(k))
    ) {
      return entry.line;
    }
  }
  const mood = detectSentiment(userText);
  // 토픽 추출: "꿈" 앞에 있는 짧은 문구를 뽑아 템플릿에 끼움.
  const m = userText.match(/([가-힣A-Za-z0-9 ]{1,15}?)\s*꿈/);
  const topic = m?.[1]?.trim();
  if (topic && topic.length > 0 && topic.length <= 12) {
    return `${topic} 꿈, ${pickRandom(FALLBACK_CLOSERS[mood])}`;
  }
  // "꿈" 이라는 말 자체가 없으면 꿈이라고 단정하지 않는다.
  // ("가위에 자주 눌려" → "그런 꿈을 꾸셨군요" 가 나오던 문제)
  if (!userText.includes("꿈")) {
    return pickRandom(NON_DREAM_OPENERS[mood]);
  }
  // "꿈" 은 있는데 토픽만 못 뽑았을 때
  return `그런 꿈을 꾸셨군요, ${pickRandom(FALLBACK_CLOSERS[mood])}`;
}

// DreamMeta(서버가 첫 턴 응답에 함께 내려주는 보관함용 메타)는 대화와 같이
// 저장돼야 해서 features/chat/chatSession 으로 옮겼다.

// AI 가 추출한 태그 라벨을 카드 컴포넌트들이 기대하는 DreamMoodTag 모양으로 감싼다.
// (bg/color 는 AiDreamCard 가 자체 스타일로 그리므로 일관된 기본값으로 두면 충분)
const DEFAULT_TAG_BG = "#F0E8FF";
const DEFAULT_TAG_COLOR = "#7868C8";

// 첫 화면에서 무엇을 입력해야 하는지 보여주는 예시. 탭하면 입력창에 채워진다.
const EXAMPLE_PROMPTS = [
  "누군가에게 쫓기는 꿈을 꿨어요",
  "이가 빠지는 꿈을 꿨어요",
  "돌아가신 할머니가 꿈에 나왔어요",
];

// 프로덕션은 EXPO_PUBLIC_API_BASE_URL (예: https://mongle.vercel.app) 로 절대경로 호출.
// 미설정 시엔 dev 서버 host:8081 로 폴백 (Expo Go / 로컬 web 개발).
function getApiUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (base) {
    return `${base.replace(/\/$/, "")}/api/chat`;
  }
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8081/api/chat`;
  }
  return "/api/chat";
}

const API_URL = getApiUrl();

// AI 응답 대기 중 ●●● 점 3개 로딩
// 점 3개가 물결치듯 위아래로 튀는 타이핑 인디케이터 — "답변 오는 중"을 명확히.
const DOT_COUNT = 3;
const DOT_RISE_MS = 320; // 한 점이 올라갔다 내려오는 시간
const DOT_STAGGER_MS = 140; // 점 사이 시차(웨이브)

function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((anim, i) =>
      Animated.loop(
        // 각 점의 1사이클 길이를 동일하게 맞춘다(앞 delay + 튀기 + 뒤 delay)
        // → 루프가 위상 어긋나지 않고 안정적인 웨이브 유지.
        Animated.sequence([
          Animated.delay(i * DOT_STAGGER_MS),
          Animated.timing(anim, {
            toValue: 1,
            duration: DOT_RISE_MS / 2,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: DOT_RISE_MS / 2,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay((DOT_COUNT - 1 - i) * DOT_STAGGER_MS),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={[styles.bubble, styles.aiBubble, styles.dotsBubble]}>
      <View style={styles.dotsRow}>
        {dots.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 1],
                }),
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -7],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function SendIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19V5M5 12l7-7 7 7"
        stroke="#fff"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// AI 해몽 응답은 "요약 <<MORE>> 전체해석" 형태로 온다. 이 마커로 나눠
// 요약은 항상, 전체 해석은 "내용 더 보기"로 펼친다.
const MORE_MARKER = "<<MORE>>";

// 문단 단위로 분리 — 빈 줄(\n\n) 또는 단일 줄바꿈(\n) 모두 처리
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function ChatBotModal({
  visible,
  onClose,
  onSaved,
  initialText,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // 스트리밍이 진행 중인지 — loading 은 첫 청크 도착 시 false 가 되지만, 토큰이
  // 계속 흘러오는 동안엔 전송 버튼이 막혀야 한다.
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  // AI 응답 신고 — 신고 대상 메시지(확인 다이얼로그) / 결과 알림 문구
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  // 키보드 표시 여부 — 입력바 하단 여백을 시스템 네비바(insets.bottom)에 맞추되,
  // 키보드가 올라오면 KeyboardAvoidingView 가 이미 밀어 올리므로 여분 여백을 뺀다.
  const [kbShown, setKbShown] = useState(false);
  useEffect(() => {
    const s = Keyboard.addListener("keyboardDidShow", () => setKbShown(true));
    const h = Keyboard.addListener("keyboardDidHide", () => setKbShown(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);
  // 어디까지 보관함에 저장했는지. 이 인덱스 뒤의 메시지만 "아직 저장 안 된 꿈".
  // 복원된 대화를 다시 저장해 보관함에 중복이 쌓이는 걸 막는다.
  const savedCountRef = useRef(0);
  // 서버가 첫 턴 응답에 같이 내려주는 보관함용 메타. 저장 시 사용.
  const metaRef = useRef<DreamMeta | null>(null);
  // 저장된 대화를 읽어오는 동안. 이때는 저장 이펙트가 돌면 안 된다
  // (빈 messages 로 덮어써서 대화를 날려버린다).
  const [hydrating, setHydrating] = useState(true);
  // "새 대화" 확인 다이얼로그
  const [confirmReset, setConfirmReset] = useState(false);

  // 모달 열 때: 저장된 대화 복원 + 최신 닉네임 반영 + 이전 세션 잔여 상태 초기화
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    setInput(initialText ?? "");
    setError(null);
    setLoading(false);
    setStreaming(false);
    setReportTarget(null);
    setReportNotice(null);
    setHydrating(true);

    // 24시간 안에 나눈 대화가 있으면 그대로 이어서 보여준다.
    loadChatSession()
      .then((session) => {
        if (cancelled) return;
        if (session) {
          setMessages(session.messages);
          metaRef.current = session.meta;
          savedCountRef.current = session.savedCount;
        } else {
          setMessages([]);
          metaRef.current = null;
          savedCountRef.current = 0;
        }
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([]);
        metaRef.current = null;
        savedCountRef.current = 0;
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    getMyProfile()
      .then(({ data }) => {
        if (!cancelled && data?.nickname) {
          setNickname(data.nickname);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // 대화가 바뀔 때마다 저장. 스트리밍 중엔 토큰마다 setMessages 가 불려서
  // 그때마다 디스크에 쓰면 낭비 — 스트리밍이 끝난 뒤 한 번만 쓴다.
  useEffect(() => {
    if (!visible || hydrating || streaming) return;
    saveChatSession({
      messages,
      meta: metaRef.current,
      savedCount: savedCountRef.current,
    });
  }, [messages, visible, hydrating, streaming]);

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    if (!visible) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages, loading, visible]);

  // 아직 보관함에 저장하지 않은 구간(savedCountRef 뒤)을 저장한다.
  // 저장은 fire-and-forget — UI 는 즉시 닫히고, 결과는 onSaved 콜백으로 토스트에 띄운다.
  //
  // 대화가 24시간 유지되면서 "닫을 때 전체를 저장"은 성립하지 않게 됐다.
  // 어제 저장한 꿈까지 다시 저장돼 보관함에 중복이 쌓이기 때문. 그래서 마지막
  // 저장 지점 뒤에 새로 쌓인 메시지만 하나의 새 꿈으로 저장한다.
  const flushSave = useCallback(() => {
    const pending = messages.slice(savedCountRef.current);
    const userMsgs = pending.filter((m) => m.role === "user");
    if (userMsgs.length === 0) return;

    // 이 구간을 저장하든 건너뛰든 저장 지점은 앞으로 민다 — 위기 발화 구간을
    // 매번 다시 검사하며 저장 여부를 재고할 이유가 없다.
    savedCountRef.current = messages.length;

    // 위기 발화가 한 턴이라도 있으면 보관함에 저장하지 않는다.
    // 저장하면 "✨ '요즘 죽고싶다는 생…' 보관함에 담겼어요" 토스트와 함께
    // 꿈 카드로 남는다.
    if (userMsgs.some((m) => isCrisisDisclosure(m.content))) return;

    const content = userMsgs.map((m) => m.content).join("\n\n");
    const chatPreview = pending.map((m) => ({
      role: m.role,
      // 저장 미리보기엔 요약+전체를 한 흐름으로 (마커는 문단 구분으로 치환)
      text: m.content.split(MORE_MARKER).join("\n\n"),
    }));

    const meta = metaRef.current;
    const moodTags =
      meta?.moodTags?.map((label) => ({
        label,
        emoji: "",
        bg: DEFAULT_TAG_BG,
        color: DEFAULT_TAG_COLOR,
      })) ?? [];

    // 제목: AI 가 추출한 title 우선, 없으면 첫 메시지 앞 10자 + "…"
    const firstLine = userMsgs[0].content.split("\n")[0].trim();
    const fallbackTitle =
      firstLine.length > 10 ? `${firstLine.slice(0, 10)}…` : firstLine;
    const title = meta?.title?.trim() || fallbackTitle || "AI 꿈 해몽";

    createDream({
      title,
      content,
      dreamDate: todayISODate(),
      source: "ai",
      emoji: meta?.emoji || "🌙",
      luckIndex: meta?.luckIndex ?? 0,
      isWarning: meta?.isWarning ?? false,
      moodTags,
      chatPreview,
      interpretationSummary: meta?.interpretation ?? "",
    })
      .then(({ error: saveErr }) => {
        if (saveErr) {
          console.error("[chat] auto-save error:", saveErr);
          onSaved?.("저장에 실패했어요");
        } else {
          onSaved?.(`✨ '${title}' 보관함에 담겼어요`);
        }
      })
      .catch((err) => {
        console.error("[chat] auto-save error:", err);
        onSaved?.("저장에 실패했어요");
      });
  }, [messages, onSaved]);

  const handleClose = useCallback(() => {
    flushSave();
    // 닫는 순간의 대화를 확정 저장한다. 갱신된 savedCount 까지 함께 넣어야
    // 다음에 열었을 때 이미 저장한 구간을 또 저장하지 않는다.
    if (messages.length > 0) {
      saveChatSession({
        messages,
        meta: metaRef.current,
        savedCount: savedCountRef.current,
      });
    }
    onClose();
  }, [flushSave, messages, onClose]);

  // "새 대화" — 화면만 비우는 게 아니라, 아직 저장 안 된 꿈은 보관함에 넣고
  // 비운다. 그냥 지워버리면 방금 받은 해몽이 어디에도 안 남는다.
  const handleReset = useCallback(() => {
    setConfirmReset(false);
    flushSave();
    setMessages([]);
    setInput("");
    setError(null);
    metaRef.current = null;
    savedCountRef.current = 0;
    clearChatSession();
  }, [flushSave]);

  // 신고 확인 → ai_message_reports 에 저장. 직전 대화 맥락을 함께 첨부.
  const submitReport = useCallback(() => {
    const msg = reportTarget;
    if (!msg) return;
    setReportTarget(null);
    const idx = messages.findIndex((m) => m.id === msg.id);
    const context = messages
      .slice(Math.max(0, idx - 2), idx + 1)
      .map((m) => ({ role: m.role, text: m.content }));
    reportAiMessage(msg.content, context)
      .then(({ error: reportErr }) => {
        if (reportErr) {
          console.error("[chat] report error:", reportErr);
          setReportNotice("신고 접수에 실패했어요. 잠시 후 다시 시도해 주세요.");
        } else {
          setReportNotice("신고가 접수되었어요. 검토 후 조치하겠습니다.");
        }
      })
      .catch((err) => {
        console.error("[chat] report error:", err);
        setReportNotice("신고 접수에 실패했어요. 잠시 후 다시 시도해 주세요.");
      });
  }, [reportTarget, messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || streaming) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
    };
    // 공감 한 줄은 "첫 꿈 입력"에만 띄운다. 이후 후속 질문에 답할 때마다
    // 공감 한 줄이 반복되면 어색하므로, 이전에 보낸 사용자 메시지가 없을 때만 stub 추가.
    // AI 는 해몽만 단일 버블로 스트리밍.
    // "첫 꿈"의 기준은 대화 전체가 아니라 아직 저장 안 된 구간이다. 대화가
    // 24시간 남아있게 되면서 messages 에는 어제 꾼 꿈이 들어있을 수 있는데,
    // 그걸 근거로 공감 한 줄을 건너뛰면 오늘의 첫 꿈이 무반응으로 시작한다.
    const isFirstDream =
      messages.slice(savedCountRef.current).filter((m) => m.role === "user")
        .length === 0;
    // 새 꿈이면 이전 꿈의 보관함 메타를 물려받지 않도록 비운다.
    if (isFirstDream) metaRef.current = null;
    // 위기 발화는 첫 턴이 아니어도 안내한다. pickEmpathy 는 키워드 매칭이라
    // "죽고싶다" 에 scary 큐("죽")가 걸려 "마음이 많이 졸였겠어요 😨" 같은
    // 응답을 내놓는다 — 반드시 이 분기보다 먼저 걸러야 한다.
    const crisis = isCrisisDisclosure(trimmed);
    const stubContent = crisis
      ? SAFETY_STUB
      : isFirstDream
        ? pickEmpathy(trimmed)
        : null;
    const stubMsg: ChatMessage | null = stubContent
      ? { id: makeId(), role: "assistant", content: stubContent, isStub: true }
      : null;
    const next = [...messages, userMsg];
    setMessages(stubMsg ? [...next, stubMsg] : next);
    setInput("");
    setLoading(true);
    setStreaming(true);
    setError(null);

    // 해몽 본문이 들어갈 단일 AI 버블 ID
    const aiMsgId = makeId();

    try {
      // 서버는 Supabase JWT 로 사용자를 검증한다
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("로그인이 필요해요");

      // RN 의 fetch 는 Response.body 스트리밍을 지원하지 않는다 (전체 응답을 버퍼링).
      // XMLHttpRequest 의 onprogress 가 점진적으로 responseText 를 누적해주므로
      // 그걸로 토큰 도착 시점마다 UI 를 업데이트한다.
      // 서버는 본문 끝에 `<<META>>{json}<</META>>` sentinel 로 메타를 붙여 보냄 →
      // 화면에 표시할 땐 sentinel 부터 뒤를 잘라낸다.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", API_URL);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.responseType = "text";

        let firstChunk = true;
        let lastLength = 0;

        // 서버가 본문에 흘리는 sentinel:
        //   <<META>>{json}<</META>> — 보관함용 메타
        //   <<ERROR>>{사용자 친화 메시지}<</ERROR>> — 스트림 도중 발생한 에러 (429 등)
        let streamErrorMsg: string | null = null;
        const splitSentinels = (
          full: string,
        ): { text: string; metaJson?: string } => {
          let text = full;

          const errStart = text.indexOf("<<ERROR>>");
          if (errStart >= 0) {
            const errEnd = text.indexOf("<</ERROR>>", errStart + 9);
            if (errEnd >= 0) {
              streamErrorMsg = text.slice(errStart + 9, errEnd);
            }
            text = text.slice(0, errStart).replace(/\n+$/, "");
          }

          const metaStart = text.indexOf("<<META>>");
          if (metaStart < 0) return { text };
          const before = text.slice(0, metaStart).replace(/\n+$/, "");
          const metaEnd = text.indexOf("<</META>>", metaStart + 8);
          if (metaEnd < 0) return { text: before };
          const metaJson = text.slice(metaStart + 8, metaEnd);
          return { text: before, metaJson };
        };

        const applyText = (full: string) => {
          if (full.length === lastLength) return;
          lastLength = full.length;

          const { text, metaJson } = splitSentinels(full);

          if (firstChunk && text.length > 0) {
            firstChunk = false;
            setLoading(false);
            setMessages((prev) => [
              ...prev,
              { id: aiMsgId, role: "assistant", content: text },
            ]);
          } else if (!firstChunk) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: text } : m,
              ),
            );
          }

          if (metaJson && !metaRef.current) {
            try {
              const parsed = JSON.parse(metaJson);
              if (parsed) metaRef.current = parsed as DreamMeta;
            } catch (parseErr) {
              console.warn("[chat] meta sentinel parse failed:", parseErr);
            }
          }
        };

        xhr.onprogress = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            applyText(xhr.responseText);
          }
        };

        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return;

          if (xhr.status < 200 || xhr.status >= 300) {
            // 서버 에러 응답 — JSON 이면 detail 까지 보여줌
            const errText = xhr.responseText ?? "";
            try {
              const parsed = JSON.parse(errText);
              const detail = parsed?.detail
                ? `\n[detail] ${parsed.detail}`
                : "";
              reject(
                new Error(
                  `${parsed?.error ?? "답변을 가져오지 못했어요"}${detail}`,
                ),
              );
            } catch {
              reject(new Error(errText || "답변을 가져오지 못했어요"));
            }
            return;
          }

          // 마지막 잔여 텍스트 flush — sentinel 잘라낸 뒤 메타/에러 모두 파싱
          applyText(xhr.responseText);

          // 스트림 도중 에러 sentinel 이 도착했으면 사용자에게 그 메시지로 알림
          if (streamErrorMsg) {
            reject(new Error(streamErrorMsg));
            return;
          }

          if (firstChunk) {
            reject(new Error("응답 본문 비어있음"));
            return;
          }

          resolve();
        };

        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.ontimeout = () => reject(new Error("응답 시간 초과"));

        // 화면엔 24시간치 대화가 남아있지만 서버로는 "지금 이야기 중인 꿈"만
        // 보낸다. 이미 보관함에 저장된 앞 구간은 다른 꿈이라 해몽에 도움이 안
        // 되고, 매 턴 토큰만 늘려 응답을 느리게 만든다. 한 꿈 안에서도
        // 최근 20턴으로 끊는다.
        const convo = next
          .slice(savedCountRef.current)
          .filter((m) => !m.isStub)
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content }));

        xhr.send(
          JSON.stringify({
            messages: convo,
            nickname,
          }),
        );
      });
    } catch (err) {
      console.error("[chat] send error:", err);
      // 빈 AI 버블 + 공감 stub 제거
      setMessages((prev) =>
        prev.filter((m) => m.id !== aiMsgId && !m.isStub),
      );
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* KAV 를 overlay 바깥으로 빼서 시트 전체가 키보드 위로 밀려 올라가도록 한다.
          시트 안쪽에만 KAV 를 두면 height: 85% 고정 영역 안에서만 padding 이
          더해져 입력창이 키보드 뒤로 가려지는 버그가 발생한다. */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.dismissArea}
            activeOpacity={1}
            onPress={handleClose}
          />

          <View style={styles.sheet}>
            {/* 헤더 */}
            <View style={styles.header}>
              <View style={styles.handle} />
              <View style={styles.headerRow}>
                {/* "몽이"만으로는 처음 온 사용자가 무엇을 하는 화면인지 모른다.
                    기능명(AI 꿈해몽)을 앞에 세우고 캐릭터는 보조 설명으로 내린다. */}
                <View>
                  <Text style={styles.title}>AI 꿈해몽</Text>
                  <Text style={styles.subtitle}>몽이가 꿈을 풀어드려요</Text>
                </View>
                <View style={styles.headerActions}>
                  {/* 대화가 24시간 남아있으니, 새 꿈을 이야기하려는 사람에게
                      비울 방법을 줘야 한다. 없으면 어제 대화 밑에 계속 쌓인다. */}
                  {messages.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => setConfirmReset(true)}
                      hitSlop={8}
                      style={styles.newChatBtn}
                    >
                      <Text style={styles.newChatText}>새 대화</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={handleClose} hitSlop={8}>
                    <Text style={styles.close}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 메시지 */}
            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              onContentSizeChange={() =>
                scrollRef.current?.scrollToEnd({ animated: true })
              }
            >
              {messages.length === 0 && (
                <>
                  <View style={[styles.bubble, styles.aiBubble]}>
                    <Text style={styles.aiText}>
                      안녕하세요{nickname ? `, ${nickname}님` : ""} 🌙
                    </Text>
                    <Text style={[styles.aiText, styles.paragraphGap]}>
                      어젯밤 어떤 꿈을 꾸셨나요? 떠오르는 장면이나 느낌을 편하게
                      들려주세요.
                    </Text>
                    <Text style={[styles.aiText, styles.paragraphGap]}>
                      해몽이 끝나면 꿈 보관함에 저장할 수 있어요.
                    </Text>
                    <Text style={[styles.aiHint, styles.paragraphGap]}>
                      나눈 이야기는 24시간 동안 여기 그대로 있어요 🌙
                    </Text>
                  </View>

                  {/* 빈 입력창 앞에서 무엇을 써야 할지 몰라 이탈하는 걸 막는다.
                      탭하면 입력창에 채워지고, 사용자가 고쳐 쓸 수 있게 전송은 하지 않는다. */}
                  <View style={styles.examples}>
                    <Text style={styles.examplesLabel}>이렇게 적어보세요</Text>
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <TouchableOpacity
                        key={ex}
                        style={styles.exampleChip}
                        onPress={() => setInput(ex)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.exampleChipText}>{ex}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onReport={
                    msg.role === "assistant" && !msg.isStub
                      ? () => setReportTarget(msg)
                      : undefined
                  }
                />
              ))}

              {loading && <LoadingDots />}

              {error && (
                <View
                  style={[styles.bubble, styles.aiBubble, styles.errorBubble]}
                >
                  <Text style={styles.errorText}>
                    ⚠️ 답변을 가져오지 못했어요{"\n"}
                    <Text style={styles.errorDetail}>{error}</Text>
                  </Text>
                </View>
              )}
            </ScrollView>
            {/* 입력 바 — 안드로이드/iOS 시스템 하단 영역만큼 띄운다(키보드 열림 시 제외) */}
            <View
              style={[
                styles.inputBar,
                { paddingBottom: kbShown ? 12 : 12 + insets.bottom },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="기억하고 계신 꿈 내용을 입력해주세요"
                placeholderTextColor="#A898D0"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={handleSend}
              />

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!input.trim() || loading || streaming) &&
                    styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={!input.trim() || loading || streaming}
                activeOpacity={0.85}
              >
                <SendIcon />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* AI 응답 신고 — 확인 + 결과 알림 (생성형 AI 정책 준수) */}
        <ConfirmDialog
          visible={reportTarget !== null}
          title="응답 신고"
          message="이 AI 응답을 부적절한 콘텐츠로 신고할까요?"
          confirmLabel="신고"
          cancelLabel="취소"
          destructive
          onConfirm={submitReport}
          onCancel={() => setReportTarget(null)}
        />
        <ConfirmDialog
          visible={reportNotice !== null}
          title="알림"
          message={reportNotice ?? ""}
          confirmLabel="확인"
          onConfirm={() => setReportNotice(null)}
        />

        {/* 새 대화 — 화면은 비우되 아직 저장 안 된 꿈은 보관함으로 보낸다 */}
        <ConfirmDialog
          visible={confirmReset}
          title="새 대화 시작"
          message="지금까지 나눈 이야기를 지우고 새로 시작할까요? 해몽 결과는 꿈 보관함에 남아요."
          confirmLabel="새로 시작"
          cancelLabel="취소"
          onConfirm={handleReset}
          onCancel={() => setConfirmReset(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

// 메시지 버블 — 문단 단위로 분리해서 렌더. onReport 가 있으면(AI 응답) 신고 버튼 노출.
function MessageBubble({
  msg,
  onReport,
}: {
  msg: ChatMessage;
  onReport?: () => void;
}) {
  const isUser = msg.role === "user";
  const [expanded, setExpanded] = useState(false);

  // 요약(마커 앞) / 전체 해석(마커 뒤)로 분리. 마커 없으면 전부 요약 취급.
  const { summaryParas, fullParas } = useMemo(() => {
    const idx = msg.content.indexOf(MORE_MARKER);
    const summaryRaw = idx < 0 ? msg.content : msg.content.slice(0, idx);
    const fullRaw = idx < 0 ? "" : msg.content.slice(idx + MORE_MARKER.length);
    return {
      summaryParas: splitParagraphs(summaryRaw),
      fullParas: splitParagraphs(fullRaw),
    };
  }, [msg.content]);
  const hasFull = fullParas.length > 0;
  const textStyle = isUser ? styles.userText : styles.aiText;

  return (
    <View style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
      >
        {summaryParas.map((p, i) => (
          <Text key={`s${i}`} style={[textStyle, i > 0 && styles.paragraphGap]}>
            {p}
          </Text>
        ))}

        {hasFull &&
          expanded &&
          fullParas.map((p, i) => (
            <Text key={`f${i}`} style={[textStyle, styles.paragraphGap]}>
              {p}
            </Text>
          ))}

        {hasFull && (
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            hitSlop={6}
            style={styles.moreBtn}
          >
            <Text style={styles.moreText}>
              {expanded ? "접기 ▲" : "🔎 전체 해석 보기"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {onReport ? (
        <TouchableOpacity
          onPress={onReport}
          hitSlop={8}
          style={styles.reportBtn}
        >
          <Text style={styles.reportText}>신고</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const PURPLE_BUBBLE = "#9B8BB4";
const PURPLE_BRAND = "#7868C8";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  dismissArea: { flex: 1 },

  sheet: {
    backgroundColor: "#F8F6FB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "85%",
    overflow: "hidden",
  },

  header: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 12 },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8D0E8",
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "OnglyphPDH",
    fontSize: 18,
    color: "#5848A8",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: "#9888CC",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  close: { fontSize: 20, color: "#9888CC", paddingHorizontal: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  newChatBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#F0EAFF",
    borderWidth: 1,
    borderColor: "rgba(120,104,200,0.25)",
  },
  newChatText: { fontSize: 12, fontWeight: "600", color: "#7868C8" },

  messages: { flex: 1 },
  messagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },

  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: PURPLE_BUBBLE,
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.18)",
  },
  examples: { alignSelf: "flex-start", maxWidth: "88%", gap: 6, marginTop: 4 },
  examplesLabel: {
    fontSize: 12,
    color: "#9888CC",
    marginLeft: 4,
    marginBottom: 2,
  },
  exampleChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F6F2FF",
    borderWidth: 1,
    borderColor: "rgba(120,104,200,0.28)",
  },
  exampleChipText: { fontSize: 13, color: "#5848A8", lineHeight: 18 },

  userText: { fontSize: 14, color: "#fff", lineHeight: 21 },
  aiText: { fontSize: 14, color: "#3828A0", lineHeight: 21 },
  aiHint: { fontSize: 12, color: "#9888CC", lineHeight: 18 },
  paragraphGap: { marginTop: 8 },

  reportBtn: { paddingHorizontal: 6, paddingVertical: 3, marginTop: 2 },
  reportText: { fontSize: 11, color: "#A89CC0", textDecorationLine: "underline" },

  // "전체 해석 보기 / 접기" 유도 버튼 — 요약 아래, 눈에 띄는 칩 형태
  moreBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#EEE8FB",
    borderWidth: 1,
    borderColor: "rgba(120,104,200,0.35)",
  },
  moreText: { fontSize: 13, fontWeight: "700", color: PURPLE_BRAND },

  dotsBubble: { paddingVertical: 14, paddingHorizontal: 16 },
  dotsRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#9888CC",
  },

  errorBubble: { backgroundColor: "#FFF4F4", borderColor: "#F4C8C8" },
  errorText: { fontSize: 13, color: "#B85858" },
  errorDetail: { fontSize: 11, color: "#9F4848" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(180,160,230,0.18)",
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    backgroundColor: "#F4F0FA",
    borderRadius: 18,
    fontSize: 14,
    color: "#3828A0",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PURPLE_BRAND,
  },
  sendBtnDisabled: { backgroundColor: "#C0B0E0" },
});
