import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  ScrollView,
  useWindowDimensions,
  PanResponder,
  AppState,
  InteractionManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomSpace } from "@/lib/layout";
import { useRouter } from "expo-router";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle,
  Ellipse,
} from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchSunTimes,
  getCurrentLocation,
  computeSunState,
  sunArcPosition,
  type SunTimes,
} from "@/lib/sun";

// GPU 레이어 힌트 — transform/opacity 만 바뀌는 뷰에 붙인다.
//
// 홈 화면은 전체 화면 레이어를 여러 겹 쌓는다(그라디언트 4장 + 딤 + 구름 +
// 별 + 날씨 + 구슬). 이 힌트가 없으면 안드로이드는 매 프레임 각 레이어의
// 내용을 다시 래스터라이즈한다 — 특히 구슬은 SVG 표면이 20장 가까이 들어있는데
// 계속 위아래로 떠다녀서, 매 프레임 그걸 전부 다시 그린다. 프레임을 놓치면
// 터치 이벤트 처리도 같이 밀려서 "눌러도 반응이 없다"로 나타난다.
//
// 힌트를 주면 한 번 텍스처로 구워두고 이후엔 텍스처만 옮긴다.
// 주의: 내용이 매 프레임 바뀌는 뷰에 붙이면 오히려 손해다(매번 재굽기).
const GPU_LAYER = {
  renderToHardwareTextureAndroid: true,
  shouldRasterizeIOS: true,
} as const;

// 시간 기반 테마 — 오전 6시~오후 6시 = 낮, 그 외 = 밤
function getDefaultDarkMode(): boolean {
  const h = new Date().getHours();
  return h < 6 || h >= 18;
}

// 로컬 날짜 키 (YYYY-MM-DD) — 자정에 자동 리셋되도록
function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

import BottomNav from "@/components/ui/BottomNav";
import { BellIcon } from "@/components/ui/icons";
import Toast from "@/components/ui/Toast";
// 챗봇은 실제로 열 때만 로드 — 홈 시작/탭 진입 시 무거운 챗 모듈을 지연시킨다.
// 단, 화면이 뜬 뒤 idle 에 백그라운드로 미리 로드해 첫 열기는 즉시 되게 한다(아래 예열).
const importChatModal = () => import("@/components/chat/ChatBotModal");
const ChatBotModal = lazy(importChatModal);
// 챗봇 버튼 첫 사용 안내를 한 번이라도 봤는지. 마스코트 아이콘만 떠 있으면
// 장식으로 읽혀서 챗봇인 줄 모른다 — 첫 진입에만 말풍선을 띄운다.
const CHAT_HINT_SEEN_KEY = "chat_fab_hint_seen";
import NoticeModal from "@/components/notice/NoticeModal";
import { hasUnreadNotices } from "@/features/notice/notices";
import FortuneGradeGuide from "@/components/fortune/FortuneGradeGuide";
import GradeBadgeCard from "@/components/fortune/GradeBadgeCard";
import CategoryCard from "@/components/fortune/CategoryCard";
import AdSlot from "@/components/ads/AdSlot";
import { Fortune, FortuneCategory, FortuneCategoryKey } from "@/types/fortune";
import {
  commitDailyFortuneToDB,
  getDailyFortune,
  getSmokePalette,
  FORTUNE_VIEWED_DATE_KEY,
} from "@/features/fortune/dailyFortune";
import { useSession } from "@/features/auth/auth";
import { prefetchMyDreams } from "@/features/dream/dreams";
import { prefetchDreamBrowse } from "@/features/dream/dreamQueries";
import {
  useWeatherCondition,
  type WeatherCondition,
} from "@/features/weather/weather";
import WeatherOverlay from "@/components/weather/WeatherOverlay";

// ⚠️ 개발용 강제 날씨 스위치 — 실제 비/눈이 올 때만 보여 테스트가 어려우므로,
// 화면 좌상단 테스트 버튼으로 연출을 순환시킨다(null = 실제 날씨 사용).
//
// __DEV__ 로 가드해 프로덕션 빌드엔 절대 새어나가지 않게 한다.
// (이전엔 그냥 `= true` 라 "배포 전 false 로" 주석에만 의존했고, 실제로
//  스토어 스크린샷에 디버그 배지가 찍혀서야 발견됐다.)
// 개발 빌드에서도 숨겨야 할 때(스토어 스크린샷 촬영 등)는 아래를 false 로.
const ENABLE_DEV_WEATHER_BUTTON = false;
const DEV_WEATHER_BUTTON = __DEV__ && ENABLE_DEV_WEATHER_BUTTON;

// 테스트 버튼이 순환하는 순서 (null = 실제 날씨)
const WEATHER_CYCLE: (WeatherCondition | null)[] = [
  null,
  "rain",
  "snow",
  "sleet",
];
const WEATHER_LABEL: Record<string, string> = {
  rain: "🌧 비",
  snow: "❄️ 눈",
  sleet: "🌨 진눈깨비",
  clear: "☀️ 실제",
};

// 5카테고리 전부 노출 (무료 공개). 순서는 types/fortune CATEGORY_KEYS 와 동일.
const CATEGORY_ORDER: readonly FortuneCategoryKey[] = [
  "love", "work", "money", "health", "social",
];

// 아코디언 기본 펼침 대상 — 점수가 가장 높은 카테고리 (동점 시 앞 순서 우선).
function pickTopCategory(
  categories: Record<FortuneCategoryKey, FortuneCategory>,
): FortuneCategoryKey {
  return CATEGORY_ORDER.reduce(
    (best, k) => (categories[k].score > categories[best].score ? k : best),
    CATEGORY_ORDER[0],
  );
}

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  라벤더: { bg: "#E6E0FA", text: "#3D2B5E" },
  보라: { bg: "#C084FC", text: "#fff" },
  파랑: { bg: "#93C5FD", text: "#1E3A5F" },
  하늘: { bg: "#BAE6FD", text: "#0C4A6E" },
  초록: { bg: "#86EFAC", text: "#14532D" },
  민트: { bg: "#6EE7B7", text: "#065F46" },
  연두: { bg: "#BEF264", text: "#365314" },
  노랑: { bg: "#FDE68A", text: "#78350F" },
  주황: { bg: "#FDBA74", text: "#7C2D12" },
  빨강: { bg: "#FCA5A5", text: "#7F1D1D" },
  분홍: { bg: "#F9A8D4", text: "#831843" },
  핑크: { bg: "#F9A8D4", text: "#831843" },
  코랄: { bg: "#FF7F7F", text: "#fff" },
  갈색: { bg: "#C4A47C", text: "#fff" },
  베이지: { bg: "#F5F0DC", text: "#4A3728" },
  금색: { bg: "#FFD700", text: "#4A3000" },
  남색: { bg: "#3B4C7A", text: "#fff" },
  청록: { bg: "#4A9D9C", text: "#fff" },
  쑥색: { bg: "#8A9A6B", text: "#fff" },
  잿빛: { bg: "#9AA0A8", text: "#fff" },
  은색: { bg: "#D1D5DB", text: "#1F2937" },
  흰색: { bg: "#F9FAFB", text: "#374151" },
  검정: { bg: "#374151", text: "#fff" },
};

function getLuckyColorStyle(colorName: string) {
  return COLOR_MAP[colorName] ?? { bg: "#F9F7FF", text: "#3D2B5E" };
}

// 낮 모드 — 가로로 흐르는 구름들
const CLOUDS = [
  { y: "12%", size: 110, opacity: 0.62, dur: 55000, delay: 0 },
  { y: "32%", size: 85, opacity: 0.55, dur: 70000, delay: 9000 },
  { y: "72%", size: 95, opacity: 0.58, dur: 60000, delay: 22000 },
] as const;

function Cloud({ size, opacity }: { size: number; opacity: number }) {
  return (
    <View style={{ opacity }}>
      <Svg width={size} height={size * 0.5}>
        <Ellipse
          cx={size * 0.2}
          cy={size * 0.34}
          rx={size * 0.16}
          ry={size * 0.13}
          fill="#fff"
        />
        <Ellipse
          cx={size * 0.4}
          cy={size * 0.24}
          rx={size * 0.2}
          ry={size * 0.18}
          fill="#fff"
        />
        <Ellipse
          cx={size * 0.6}
          cy={size * 0.22}
          rx={size * 0.22}
          ry={size * 0.2}
          fill="#fff"
        />
        <Ellipse
          cx={size * 0.8}
          cy={size * 0.32}
          rx={size * 0.18}
          ry={size * 0.15}
          fill="#fff"
        />
        <Ellipse
          cx={size * 0.5}
          cy={size * 0.4}
          rx={size * 0.32}
          ry={size * 0.09}
          fill="#fff"
        />
      </Svg>
    </View>
  );
}

// 배경에 떠다니는 별들 (구슬 바깥, 화면 전체)
const BG_STARS = [
  // 상단 영역
  { left: "15%", top: "10%", size: 2, period: 1800, delay: 200 },
  { left: "55%", top: "13%", size: 1.8, period: 2000, delay: 700 },
  { left: "85%", top: "10%", size: 2.5, period: 2400, delay: 300 },
  // 구슬 양옆
  { left: "6%", top: "34%", size: 3, period: 2400, delay: 0 },
  { left: "92%", top: "32%", size: 2.8, period: 2800, delay: 500 },
  { left: "8%", top: "58%", size: 3, period: 2600, delay: 1100 },
  { left: "90%", top: "56%", size: 3.2, period: 3000, delay: 800 },
  // 하단 영역
  { left: "20%", top: "78%", size: 2, period: 2100, delay: 600 },
  { left: "55%", top: "82%", size: 1.6, period: 1900, delay: 1300 },
  { left: "82%", top: "80%", size: 2, period: 2300, delay: 1200 },
] as const;

// 낮→밤 전환 4단계 그라디언트 — 일출/일몰 보간용
const DAY_GRADIENT = ["#B5D4ED", "#D4E5F2", "#F5F0E8"] as const;
const SUNSET_GRADIENT = ["#F0B5C5", "#F8C5A8", "#FFD8B8"] as const;
const TWILIGHT_GRADIENT = ["#8270B0", "#9788C0", "#B0A0D0"] as const;
const NIGHT_GRADIENT = ["#4A4270", "#564B85", "#6A5C9A"] as const;

// 구슬 내부 연기 — 원형 링 배치 (중앙 + 안쪽 링 + 바깥 링).
// cy 가 클수록(아래쪽) 먼저 등장. 바깥 링이 구슬 가장자리까지 색 도달.
const BLOBS = [
  // 중앙
  { cx: 105, cy: 105, size: 60, colorIdx: 0 },
  // 안쪽 링 (구슬 중심에서 반지름 ~45)
  { cx: 105, cy: 60, size: 50, colorIdx: 1 },
  { cx: 150, cy: 105, size: 50, colorIdx: 2 },
  { cx: 105, cy: 150, size: 50, colorIdx: 0 },
  { cx: 60, cy: 105, size: 50, colorIdx: 1 },
  { cx: 73, cy: 73, size: 48, colorIdx: 2 },
  { cx: 137, cy: 73, size: 48, colorIdx: 0 },
  { cx: 73, cy: 137, size: 48, colorIdx: 1 },
  { cx: 137, cy: 137, size: 48, colorIdx: 2 },
  // 바깥 링 (구슬 중심에서 반지름 ~80, 가장자리 도달)
  { cx: 105, cy: 25, size: 45, colorIdx: 0 },
  { cx: 165, cy: 50, size: 45, colorIdx: 1 },
  { cx: 185, cy: 105, size: 45, colorIdx: 2 },
  { cx: 165, cy: 160, size: 45, colorIdx: 0 },
  { cx: 105, cy: 185, size: 45, colorIdx: 1 },
  { cx: 45, cy: 160, size: 45, colorIdx: 2 },
  { cx: 25, cy: 105, size: 45, colorIdx: 0 },
  { cx: 45, cy: 50, size: 45, colorIdx: 1 },
] as const;

function LuckyCell({
  label,
  value,
  swatch,
}: {
  label: string;
  value: string;
  swatch?: string;
}) {
  return (
    <View style={styles.luckyCell}>
      <Text style={styles.luckyCellLabel}>{label}</Text>
      {swatch ? (
        <View
          style={[styles.luckyCellSwatch, { backgroundColor: swatch }]}
        />
      ) : null}
      <Text
        style={styles.luckyCellValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

// 손잡이 드래그로 시트를 닫는 기준.
// 거리(100px) 또는 속도(0.8px/ms) 중 하나만 넘으면 닫는다 — 짧고 빠르게
// 튕기는 동작도 닫힘으로 받아야 자연스럽다.
const SHEET_CLOSE_DISTANCE = 100;
const SHEET_CLOSE_VELOCITY = 0.8;

export default function HomeScreen() {
  // 해의 호(arc)와 구름 이동 범위는 하늘 배경 전체를 가로지르므로 창 너비를
  // 그대로 쓴다. Dimensions.get 을 모듈 최상단에서 쓰면 앱 시작 시 한 번만
  // 계산돼 회전·창 크기 변경에 반응하지 못한다 — 훅으로 구독한다.
  const { width: screenW } = useWindowDimensions();
  const router = useRouter();
  const space = useBottomSpace();
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  // 운세·구슬 상태는 소유자(userId)와 함께 보관한다. 계정이 바뀌면 이펙트가
  // 돌기 전, 즉 리렌더 시점에 이미 무효로 판정돼야 이전 계정 값이 한 프레임
  // 새어나가지 않는다.
  const [fortuneState, setFortuneState] = useState<{
    userId: string;
    fortune: Fortune;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [darkMode, setDarkMode] = useState(getDefaultDarkMode);
  const [viewedState, setViewedState] = useState<{
    userId: string;
    viewed: boolean;
  } | null>(null);

  // ── 렌더 시점 파생값 ──────────────────────────────────────
  // 소유자가 현재 userId 와 다르면 "없는 것"으로 본다. 이펙트를 기다리지
  // 않으므로 stale 프레임이 원천적으로 생기지 않는다.
  const fortune = fortuneState?.userId === userId ? fortuneState.fortune : null;
  const alreadyViewed =
    viewedState?.userId === userId ? viewedState.viewed : false;
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [sunReady, setSunReady] = useState(false); // 첫 자동 업데이트 후 true
  const [showChat, setShowChat] = useState(false);
  // 챗봇을 한 번이라도 열었는지 — 열린 뒤엔 계속 마운트 유지(닫힘 애니 보존).
  const [chatMounted, setChatMounted] = useState(false);
  // 챗봇을 한 번도 안 열어본 사용자에게만 보이는 안내 말풍선.
  const [showChatHint, setShowChatHint] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  // 개발용 강제 날씨 (null = 실제 날씨). 좌상단 테스트 버튼이 WEATHER_CYCLE 순환.
  const [forceWeatherIdx, setForceWeatherIdx] = useState(0);
  const forceWeather = WEATHER_CYCLE[forceWeatherIdx];

  // 안 읽은 공지 여부 — 벨 위의 작은 점 하나를 위한 네트워크 호출이라
  // 첫 페인트를 막을 이유가 없다. 홈이 그려진 뒤에 확인한다.
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const unread = await hasUnreadNotices();
      if (!cancelled) setHasUnread(unread);
    };
    const task = InteractionManager.runAfterInteractions(refresh);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      cancelled = true;
      task.cancel();
      sub.remove();
    };
  }, []);
  const isAnimating = useRef(false);
  // 구슬 안 연기 색 — 매 렌더마다 새 배열을 만들면 아래 블롭 메모가 통째로 깨진다.
  const luckyColor = fortune?.luckyColor ?? "라벤더";
  const smokeColors = useMemo(() => getSmokePalette(luckyColor), [luckyColor]);

  // 첫 방문 판정은 로컬만 본다 — 서버 왕복 없이 즉시 결정돼야 안내가 늦게 튀지 않는다.
  useEffect(() => {
    AsyncStorage.getItem(CHAT_HINT_SEEN_KEY)
      .then((seen) => setShowChatHint(seen !== "1"))
      .catch(() => {});
  }, []);

  const openChat = useCallback(() => {
    setChatMounted(true);
    setShowChat(true);
    setShowChatHint((wasShown) => {
      if (wasShown) AsyncStorage.setItem(CHAT_HINT_SEEN_KEY, "1").catch(() => {});
      return false;
    });
  }, []);

  const theme = darkMode
    ? {
        title: "#E8DEFF",
        hint: "#C4B0E8",
        icon: "#D4C5F2",
      }
    : {
        title: "#3D5A78",
        hint: "#5C7A98",
        icon: "#3D5A78",
      };

  // 구슬 색상 — 다크: 보라 신비, 라이트: 투명한 비눗방울
  const orbColors = darkMode
    ? {
        border: "rgba(180, 155, 225, 0.28)",
        shadow: "#a070e0",
        bg: "transparent",
        bgCircle: "#ddd0ff",
        bgCircleOp: 0.06,
        volMid: "#f0ecff",
        volEdge: "#a090c8",
        limbEdge: "#7060b0",
        caustic: "#e8dcff",
        glareCore: 0.75,
        glareMid: 0.18,
        topGlareCore: 0.7,
        topGlareMid: 0.16,
        glareBottom: "rgba(255,255,255,0.55)",
      }
    : {
        border: "rgba(255,255,255,0.45)",
        shadow: "#ffffff",
        bg: "rgba(255,255,255,0.15)",
        bgCircle: "#ffffff",
        bgCircleOp: 0.08,
        volMid: "#f5f8fb",
        volEdge: "#dde6ee",
        limbEdge: "#c5d5e2",
        caustic: "#ffffff",
        glareCore: 0.45,
        glareMid: 0.12,
        topGlareCore: 0.4,
        topGlareMid: 0.1,
        glareBottom: "rgba(255,255,255,0.4)",
      };

  // 낮(0) ↔ 밤(1) 전환 진행도 — 시간 기반 자동 모드가 이 값을 구동
  const transitionProgress = useRef(
    new Animated.Value(getDefaultDarkMode() ? 1 : 0),
  ).current;

  // 해 위치 — 호(arc) 위에서 (cx, cy) 절대 좌표로 추적 (auto 모드 시 시간 기반 갱신)
  const sunCX = useRef(new Animated.Value(screenW * 0.5)).current;
  const sunCY = useRef(new Animated.Value(50)).current; // 정오 높이

  // 4단계 그라디언트 레이어 opacity (낮 base 위에 노을→황혼→밤 순서로 깔림)
  const sunsetOp = transitionProgress.interpolate({
    inputRange: [0, 0.33, 1],
    outputRange: [0, 1, 1],
  });
  const twilightOp = transitionProgress.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0, 0, 1, 1],
  });
  const nightOp = transitionProgress.interpolate({
    inputRange: [0, 0.66, 1],
    outputRange: [0, 0, 1],
  });

  // 해 opacity — darkness 와 반비례 (밤엔 0, 낮엔 1, 트랜지션 중간엔 0.5)
  const sunOpacity = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // 구름 — 노을 시작 직후 페이드아웃
  const cloudsEnvelope = transitionProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0, 0],
  });

  // 별 — 황혼(0.66) 부터 페이드인
  const starsEnvelope = transitionProgress.interpolate({
    inputRange: [0, 0.66, 1],
    outputRange: [0, 0, 1],
  });

  // 시간 기반 자동 업데이트 — sunTimes 와 현재 시각 비교해서 darkness/해 위치 갱신
  const isFirstAutoUpdate = useRef(true);
  const updateAutoSunState = useCallback(() => {
    if (!sunTimes) return;
    const state = computeSunState(new Date(), sunTimes);
    const first = isFirstAutoUpdate.current;
    if (first) {
      // 첫 동기화는 스냅 (애니메이션 없이 즉시 정확한 위치로)
      transitionProgress.setValue(state.darkness);
      if (state.arcT !== null) {
        const { cx, cy } = sunArcPosition(state.arcT, screenW);
        sunCX.setValue(cx);
        sunCY.setValue(cy);
      }
      isFirstAutoUpdate.current = false;
      setSunReady(true); // 위치 스냅 후 비로소 해 렌더 허용
    } else {
      Animated.timing(transitionProgress, {
        toValue: state.darkness,
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
      if (state.arcT !== null) {
        const { cx, cy } = sunArcPosition(state.arcT, screenW);
        Animated.parallel([
          Animated.timing(sunCX, {
            toValue: cx,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(sunCY, {
            toValue: cy,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
    setDarkMode(state.darkness > 0.5);
  }, [sunTimes, screenW, sunCX, sunCY, transitionProgress]);

  // 매일 1회, 사용자별 운세 로드. userId 가 바뀌면(계정 전환) 다시 로드한다.
  useEffect(() => {
    // 이전 계정 값의 무효화는 렌더 시점 파생(fortune)이 이미 처리하므로,
    // 여기서 state 를 비울 필요가 없다. 로드할 게 없으면 그냥 나간다.
    if (!userId) return;
    let cancelled = false;
    getDailyFortune().then((f) => {
      if (!cancelled) setFortuneState({ userId, fortune: f });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 오늘 이미 구슬을 탭했는지 확인 — 같은 날이면 구슬 채워진 상태로 시작.
  // 계정이 바뀌면 구슬 상태도 다시 판정해야 하므로 userId 에 함께 묶는다.
  useEffect(() => {
    // Animated.Value 는 React state 가 아니라 파생 무효화가 닿지 않는다.
    // 계정이 바뀌면 먼저 0 으로 되돌린다 — 이전 계정의 "연기 피어오른" 값이
    // 남아 있으면, 새 운세가 AsyncStorage 읽기보다 먼저 도착했을 때
    // 애니메이션 없이 연기가 즉시 나타난다.
    smokeOp.setValue(0);
    if (!userId) return;
    let cancelled = false;
    AsyncStorage.getItem(FORTUNE_VIEWED_DATE_KEY)
      .then((saved) => {
        if (cancelled) return;
        const viewed = saved === getTodayKey();
        setViewedState({ userId, viewed });
        smokeOp.setValue(viewed ? 1 : 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 위치 권한 요청 + Open-Meteo 에서 오늘 일출/일몰 시각 가져오기.
  //
  // 마운트 즉시 돌리면 첫 실행에서 OS 권한 팝업이 홈이 그려지는 순간과 겹치고,
  // 네트워크 2회가 첫 상호작용 구간의 JS 스레드를 물고 있는다. 하늘 테마는
  // 시각 기반 기본값(getDefaultDarkMode)이 이미 맞는 값을 주므로, 정확한
  // 일출/일몰은 홈이 다 그려진 뒤에 받아와 부드럽게 보정한다.
  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(async () => {
      const loc = await getCurrentLocation();
      const times = await fetchSunTimes(loc.lat, loc.lng);
      if (cancelled) return;
      if (times) setSunTimes(times);
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, []);

  // sunTimes 로드 후 — 즉시 1회 + 5분 주기 + 포그라운드 복귀 시 자동 업데이트
  useEffect(() => {
    if (!sunTimes) return;
    updateAutoSunState();
    const interval = setInterval(updateAutoSunState, 5 * 60 * 1000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") updateAutoSunState();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [sunTimes, updateAutoSunState]);

  const floatY = useRef(new Animated.Value(0)).current;
  const hintOp = useRef(new Animated.Value(0.5)).current;
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbLiftY = useRef(new Animated.Value(0)).current;
  const smokeOp = useRef(new Animated.Value(0)).current; // 탭 전: 투명 유리구슬
  const bgStarAnims = useRef(BG_STARS.map(() => new Animated.Value(0))).current;
  const cloudAnims = useRef(CLOUDS.map(() => new Animated.Value(0))).current;
  const dimOp = useRef(new Animated.Value(0)).current; // 비/눈 시 하늘 어둡게

  // 위치 기반 날씨 (IP → 기상청). 실패/키미설정 시 clear → 오버레이 없음.
  const { data: weather, refetch: refetchWeather } = useWeatherCondition();

  // 실제로 적용되는 날씨 + 강수(비/눈/진눈깨비) 여부.
  const effectiveWeather = forceWeather ?? weather ?? "clear";
  const isPrecip =
    effectiveWeather === "rain" ||
    effectiveWeather === "snow" ||
    effectiveWeather === "sleet";

  // 비/눈 올 때: 해를 숨기고 하늘을 살짝 어둡게 (부드럽게 페이드).
  useEffect(() => {
    Animated.timing(dimOp, {
      toValue: isPrecip ? 1 : 0,
      duration: 600,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isPrecip, dimOp]);

  // 포그라운드 복귀 시 날씨 재조회 — 비가 그쳤는데 연출이 남아있는 상황을 줄인다.
  // (staleTime 30분을 무시하고 즉시 재조회. 위치는 캐시돼 권한 재요청 없음.)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refetchWeather();
    });
    return () => sub.remove();
  }, [refetchWeather]);

  // 홈이 그려지고 상호작용이 끝난 뒤(= 홈 우선) 백그라운드 예열.
  //  - 보관함 목록: 탭 첫 진입 스피너 제거
  //  - 꿈 사전(카테고리): 검색 화면에서 카테고리 카드 첫 진입 스피너 제거
  // (키워드 검색은 입력마다 달라 예열 불가 — 네트워크 유지)
  // 화면에 보이지 않는 예열이라 우선순위가 가장 낮다. 위의 일출/일몰·공지가
  // 먼저 끝나도록 한 박자 더 뒤로 미룬다 — 안 그러면 첫 진입에 네트워크 요청
  // 대여섯 개가 동시에 출발해서 정작 눈에 보이는 것들이 늦어진다.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        prefetchMyDreams();
        prefetchDreamBrowse();
        importChatModal(); // 챗 모듈 예열 — 첫 열기 지연 제거 (import 캐시되어 1회만)
      }, 600);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    // 떠다니는 애니메이션
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -14,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 힌트 텍스트 펄스
    Animated.loop(
      Animated.sequence([
        Animated.timing(hintOp, {
          toValue: 0.9,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(hintOp, {
          toValue: 0.5,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 구름 — 가로로 천천히 흐름 (오프스크린→오프스크린 루프)
    cloudAnims.forEach((anim, i) => {
      const cfg = CLOUDS[i];
      const loop = () => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: cfg.dur,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) loop();
        });
      };
      setTimeout(loop, cfg.delay);
    });

    // 배경 별 — 각자 주기로 반짝임
    bgStarAnims.forEach((anim, i) => {
      const cfg = BG_STARS[i];
      const half = cfg.period / 2;
      const loop = () => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: half,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: half,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(800 + Math.random() * 2200),
        ]).start(loop);
      };
      setTimeout(loop, cfg.delay);
    });
  }, []);

  // 손잡이 드래그 오프셋. 시트가 손가락을 따라 내려온다.
  const sheetY = useRef(new Animated.Value(0)).current;
  const [handlePressed, setHandlePressed] = useState(false);
  // 연기가 피어오르는 1.7초 동안만 true. 이때는 구슬 내용이 매 프레임 바뀌므로
  // GPU 텍스처 캐싱을 끈다 — 켜두면 매 프레임 텍스처를 다시 구워 오히려 느려진다.
  const [revealing, setRevealing] = useState(false);

  // 손잡이 띠 전용 제스처. 이 영역은 ScrollView 바깥(형제)이고 레이아웃상
  // 겹치지도 않아, 배경 탭·스크롤과 responder 를 다투지 않는다.
  // gesture-handler 없이 PanResponder 로 충분한 이유.
  const handlePan = useRef(
    PanResponder.create({
      // 탭도 여기서 받는다(release 에서 이동량으로 구분). 별도 Pressable 을
      // 겹치면 두 responder 가 같은 터치를 두고 다툰다.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 2,
      onPanResponderGrant: () => setHandlePressed(true),
      onPanResponderMove: (_e, g) => {
        // 아래로만. 위로 끌면 시트가 천장을 뚫고 올라간다.
        if (g.dy > 0) sheetY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        setHandlePressed(false);
        const moved = Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5;
        const shouldClose =
          !moved || // 움직임이 없었으면 탭 → 닫기
          g.dy > SHEET_CLOSE_DISTANCE ||
          g.vy > SHEET_CLOSE_VELOCITY;
        if (shouldClose) {
          // 끌던 위치에서 그대로 Modal 의 slide-out 으로 이어진다.
          handleModalCloseRef.current();
          return;
        }
        Animated.spring(sheetY, {
          toValue: 0,
          bounciness: 4,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        setHandlePressed(false);
        Animated.spring(sheetY, {
          toValue: 0,
          bounciness: 4,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  // 구슬 안 연기 — 블롭 17개 × 보간 3개 = 51개의 Animated 노드다.
  // 렌더할 때마다 새로 만들면(공지 뱃지, 토스트, 날씨 갱신 등 사소한 state
  // 변화마다) 그 51개가 통째로 재생성된다. 실제로 바뀌는 건 운세 색과
  // 다크모드뿐이라 그 둘에만 묶어둔다.
  const smokeBlobs = useMemo(() => {
    if (!fortune) return null;
    return (
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 210,
          height: 210,
        }}
      >
        {BLOBS.map((cfg, i) => {
          const diameter = cfg.size * 2;
          const color = smokeColors[cfg.colorIdx];
          // cy 25(top) ~ 185(bottom) 을 delay 0.65 ~ 0 으로 매핑 — 아래일수록 먼저 등장
          const delay = ((185 - cfg.cy) / 160) * 0.65;
          // 다크 모드에선 블롭 채도 낮춤 — 어두운 배경에서 색이 너무 진해지는 현상 완화
          const maxBlobOpacity = darkMode ? 0.45 : 0.65;
          const opacity = smokeOp.interpolate({
            inputRange: [delay, delay + 0.3, 1],
            outputRange: [0, maxBlobOpacity, maxBlobOpacity],
            extrapolate: "clamp",
          });
          const scale = smokeOp.interpolate({
            inputRange: [delay, delay + 0.35, 1],
            outputRange: [0.55, 1, 1],
            extrapolate: "clamp",
          });
          const translateY = smokeOp.interpolate({
            inputRange: [delay, delay + 0.35, 1],
            outputRange: [12, 0, 0],
            extrapolate: "clamp",
          });
          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: "absolute",
                width: diameter,
                height: diameter,
                left: cfg.cx - cfg.size,
                top: cfg.cy - cfg.size,
                opacity,
                transform: [{ scale }, { translateY }],
              }}
            >
              <Svg width={diameter} height={diameter}>
                <Defs>
                  <RadialGradient
                    id={`sg${i}`}
                    cx="50%"
                    cy="50%"
                    rx="50%"
                    ry="50%"
                  >
                    <Stop
                      offset="0%"
                      stopColor={color}
                      stopOpacity="0.95"
                    />
                    <Stop
                      offset="50%"
                      stopColor={color}
                      stopOpacity="0.6"
                    />
                    <Stop
                      offset="100%"
                      stopColor={color}
                      stopOpacity="0"
                    />
                  </RadialGradient>
                </Defs>
                <Circle
                  cx={cfg.size}
                  cy={cfg.size}
                  r={cfg.size}
                  fill={`url(#sg${i})`}
                />
              </Svg>
            </Animated.View>
          );
        })}
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fortune, smokeColors, darkMode, smokeOp]);

  const handlePress = () => {
    if (isAnimating.current) return;
    // 드래그 오프셋을 여는 시점에 미리 0 으로 되돌린다. 닫을 때 되돌리면
    // Modal 의 slide-out 이 시작되는 순간 시트가 위로 튀어오르고, 여는 쪽
    // useEffect 로 미루면 첫 프레임이 끌던 위치로 한 번 그려질 수 있다.
    // Modal 이 마운트되기 전에 동기로 끝내는 게 확실하다.
    sheetY.setValue(0);
    // userId 체크는 아래 setViewedState 의 소유자 태그용 (fortune 이 있으면
    // 사실상 항상 존재하지만, 타입상 좁혀지지 않는다).
    if (!fortune || !userId) return; // 운세 로드 전 탭 무시

    // 매 탭마다 commit 시도 — upsert 라 멱등하고, 이전 탭의 저장이 실패했을 때
    // (네트워크/세션 타이밍 등) 다시 탭하면 복구된다. AsyncStorage 의 FORTUNE_VIEWED_DATE_KEY 만
    // 보고 일찍 return 해 버리면, 첫 commit 실패 시 mypage 의 이번 주 운세에 영원히
    // 안 뜨는 버그가 생긴다.
    commitDailyFortuneToDB(fortune).catch(() => {});

    // 오늘 이미 봤으면 애니 생략하고 결과만 즉시 표시
    if (alreadyViewed) {
      setShowModal(true);
      return;
    }

    // 첫 탭 → 봤다고 저장 (자정 지나면 자동 리셋)
    AsyncStorage.setItem(FORTUNE_VIEWED_DATE_KEY, getTodayKey()).catch(() => {});
    setViewedState({ userId, viewed: true });

    isAnimating.current = true;
    setRevealing(true);

    // 구슬 흔들림 + 위로 살짝 이동
    Animated.sequence([
      Animated.timing(orbScale, {
        toValue: 0.93,
        duration: 80,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(orbScale, {
        toValue: 1.07,
        duration: 200,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
    ]).start();
    Animated.timing(orbLiftY, {
      toValue: -6,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    Animated.timing(smokeOp, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      setShowModal(true);
      isAnimating.current = false;
      setRevealing(false);
    }, 1700);
  };


  const handleModalClose = () => {
    setShowModal(false);
    // 구슬은 채워진 상태로 유지 (오늘 봤다는 시각적 표시)
    Animated.parallel([
      Animated.timing(orbScale, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(orbLiftY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // PanResponder 는 useRef 로 한 번만 만들어져 첫 렌더의 클로저를 붙든다.
  // 최신 핸들러를 보도록 ref 로 우회한다.
  const handleModalCloseRef = useRef(handleModalClose);
  useEffect(() => {
    handleModalCloseRef.current = handleModalClose;
  });

  return (
    <View style={{ flex: 1 }}>
      {/* 배경 그라디언트 4단계 — 낮(base) 위에 노을/황혼/밤 레이어가 opacity 로 보간 */}
      <LinearGradient
        colors={DAY_GRADIENT}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <Animated.View
        pointerEvents="none"
        {...GPU_LAYER}
        style={[StyleSheet.absoluteFillObject, { opacity: sunsetOp }]}
      >
        <LinearGradient
          colors={SUNSET_GRADIENT}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        {...GPU_LAYER}
        style={[StyleSheet.absoluteFillObject, { opacity: twilightOp }]}
      >
        <LinearGradient
          colors={TWILIGHT_GRADIENT}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        {...GPU_LAYER}
        style={[StyleSheet.absoluteFillObject, { opacity: nightOp }]}
      >
        <LinearGradient
          colors={NIGHT_GRADIENT}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* 해 — 호(arc) 위 위치. sunReady 가 true 가 된 후 (sunTimes 로드 + 첫 스냅 완료)
          비로소 렌더 → 초기 깜빡임 / "가운데 → 오른쪽 슬라이드" 이슈 방지 */}
      {sunReady && (
        <Animated.View
          pointerEvents="none"
          {...GPU_LAYER}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 280,
            height: 280,
            // 밤엔 sunOpacity 로, 비/눈엔 dimOp 로 이중 페이드아웃.
            opacity: Animated.multiply(
              sunOpacity,
              dimOp.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            ),
            transform: [
              { translateX: Animated.subtract(sunCX, 140) },
              { translateY: Animated.subtract(sunCY, 140) },
            ],
          }}
        >
          <Svg width={280} height={280}>
            <Defs>
              <RadialGradient id="sunGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#FFE066" stopOpacity={0.85} />
                <Stop offset="35%" stopColor="#FFD56B" stopOpacity={0.4} />
                <Stop offset="100%" stopColor="#FFD56B" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={140} cy={140} r={140} fill="url(#sunGlow)" />
          </Svg>
        </Animated.View>
      )}

      {/* 흐르는 구름들 — opacity 가 낮 단계에서만 1, 그 외엔 0 */}
      <Animated.View
        pointerEvents="none"
        {...GPU_LAYER}
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: cloudsEnvelope },
        ]}
      >
        {CLOUDS.map((c, i) => (
            <Animated.View
              key={`cloud${i}`}
              pointerEvents="none"
              {...GPU_LAYER}
              style={{
                position: "absolute",
                top: c.y,
                transform: [
                  {
                    translateX: cloudAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-c.size, screenW],
                    }),
                  },
                ],
              }}
            >
              <Cloud size={c.size} opacity={c.opacity} />
            </Animated.View>
          ))}
      </Animated.View>

      {/* 배경 별들 — 황혼(0.66) 부터 fadeIn */}
      <Animated.View
        pointerEvents="none"
        {...GPU_LAYER}
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: starsEnvelope },
        ]}
      >
        {BG_STARS.map((s, i) => (
          <Animated.View
            key={`bgstar${i}`}
            pointerEvents="none"
            {...GPU_LAYER}
            style={{
              position: "absolute",
              left: s.left,
              top: s.top,
              width: s.size * 2,
              height: s.size * 2,
              borderRadius: s.size,
              backgroundColor: "#fff",
              opacity: bgStarAnims[i],
              shadowColor: "#ffffff",
              shadowOpacity: 0.9,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
              transform: [
                {
                  scale: bgStarAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1.2],
                  }),
                },
              ],
            }}
          />
        ))}
      </Animated.View>

      {/* 비/눈 시 하늘을 살짝 어둡게 — 배경/구름/해 위, 구슬·텍스트(body) 뒤.
          body 는 아래에서 일반 흐름으로 렌더되므로 딤을 덮지 않아 가독성 유지. */}
      <Animated.View
        pointerEvents="none"
        {...GPU_LAYER}
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: "#20233A",
            opacity: dimOp.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.28],
            }),
          },
        ]}
      />

      {/* 위치 기반 비/눈 — 배경 위, 콘텐츠 뒤로 은은하게.
          forceWeather 가 설정되면(개발용 버튼) 실제 날씨 대신 그걸 띄운다. */}
      <WeatherOverlay condition={effectiveWeather} />

      {/* 개발용 날씨 테스트 버튼 — 탭할 때마다 실제→비→눈→진눈깨비 순환.
          배포 전 DEV_WEATHER_BUTTON 을 false 로. */}
      {DEV_WEATHER_BUTTON && (
        <TouchableOpacity
          style={styles.weatherDebugBtn}
          onPress={() =>
            setForceWeatherIdx((i) => (i + 1) % WEATHER_CYCLE.length)
          }
          activeOpacity={0.8}
        >
          <Text style={styles.weatherDebugText}>
            {WEATHER_LABEL[forceWeather ?? "clear"]}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowNotice(true)}
          hitSlop={8}
          style={styles.bellBtn}
        >
          <BellIcon size={24} color={theme.icon} />
          {hasUnread ? <View style={styles.bellDot} /> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.title }]}>오늘의 운세</Text>

        <TouchableOpacity activeOpacity={1} onPress={handlePress}>
          {/* 구슬은 계속 떠다닌다. 안에 SVG 표면이 20장 가까이 들어있어서
              힌트 없이는 매 프레임 그걸 전부 다시 그린다 — 홈에서 터치가
              굼떴던 가장 큰 원인. */}
          <Animated.View
            renderToHardwareTextureAndroid={!revealing}
            shouldRasterizeIOS={!revealing}
            style={{
              alignItems: "center",
              transform: [{ translateY: Animated.add(floatY, orbLiftY) }],
            }}
          >
            <View style={{ width: 210, height: 210 }}>
              {/* 유리 구슬 껍데기 - overflow:hidden 으로 연기 클리핑 */}
              <Animated.View
                style={[
                  styles.orbShell,
                  {
                    transform: [{ scale: orbScale }],
                    borderColor: orbColors.border,
                    shadowColor: orbColors.shadow,
                    backgroundColor: orbColors.bg,
                  },
                ]}
              >
                {/* ── 구체 배경 ── */}
                <Svg
                  style={{ position: "absolute", top: 0, left: 0 }}
                  width={210}
                  height={210}
                >
                  <Defs>
                    {/* 부피감: 좌상단 밝음 → 가장자리 살짝 어둠 */}
                    <RadialGradient
                      id="vol"
                      cx="38%"
                      cy="34%"
                      rx="70%"
                      ry="70%"
                    >
                      <Stop
                        offset="0%"
                        stopColor="#ffffff"
                        stopOpacity={0.42}
                      />
                      <Stop
                        offset="60%"
                        stopColor={orbColors.volMid}
                        stopOpacity={0.05}
                      />
                      <Stop
                        offset="100%"
                        stopColor={orbColors.volEdge}
                        stopOpacity={0.1}
                      />
                    </RadialGradient>
                    {/* 림 다크닝 */}
                    <RadialGradient
                      id="limb"
                      cx="50%"
                      cy="50%"
                      rx="50%"
                      ry="50%"
                    >
                      <Stop offset="72%" stopColor="#000000" stopOpacity={0} />
                      <Stop
                        offset="100%"
                        stopColor={orbColors.limbEdge}
                        stopOpacity={0.13}
                      />
                    </RadialGradient>
                    {/* 하단 반사 */}
                    <RadialGradient
                      id="caustic"
                      cx="54%"
                      cy="80%"
                      rx="28%"
                      ry="18%"
                    >
                      <Stop
                        offset="0%"
                        stopColor={orbColors.caustic}
                        stopOpacity={0.3}
                      />
                      <Stop
                        offset="100%"
                        stopColor={orbColors.caustic}
                        stopOpacity={0}
                      />
                    </RadialGradient>
                    {/* 광택: 딱딱한 타원 대신 부드러운 radial glow */}
                    <RadialGradient
                      id="glare"
                      cx="36%"
                      cy="30%"
                      rx="30%"
                      ry="22%"
                    >
                      <Stop
                        offset="0%"
                        stopColor="#ffffff"
                        stopOpacity={orbColors.glareCore}
                      />
                      <Stop
                        offset="55%"
                        stopColor="#ffffff"
                        stopOpacity={orbColors.glareMid}
                      />
                      <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Circle
                    cx="105"
                    cy="105"
                    r="104"
                    fill={orbColors.bgCircle}
                    fillOpacity={orbColors.bgCircleOp}
                  />
                  <Circle cx="105" cy="105" r="104" fill="url(#vol)" />
                  <Circle cx="105" cy="105" r="104" fill="url(#limb)" />
                  <Circle cx="105" cy="105" r="104" fill="url(#caustic)" />
                  <Circle cx="105" cy="105" r="104" fill="url(#glare)" />
                </Svg>

                {/* 연기 — cy(세로위치)에 따라 아래쪽 블롭 먼저, 위쪽 블롭 나중에 부드럽게 페이드인.
                    각 블롭은 가장자리가 그라디언트로 흐려져서 직선 경계 없음.
                    운세가 확정되기 전에는 레이어 자체를 렌더하지 않는다 — smokeOp
                    (Animated.Value)는 리렌더로 리셋되지 않으므로, 가시성 판정을
                    React 파생값으로 올려야 계정 전환 시 stale 프레임이 안 생긴다. */}
                {smokeBlobs}

                {/* 연기 위에 다시 얹는 유리 표면 shine — 색이 들어와도 유리 질감 유지 */}
                <Svg
                  pointerEvents="none"
                  style={{ position: "absolute", top: 0, left: 0 }}
                  width={210}
                  height={210}
                >
                  <Defs>
                    <RadialGradient
                      id="topGlare"
                      cx="36%"
                      cy="30%"
                      rx="30%"
                      ry="22%"
                    >
                      <Stop
                        offset="0%"
                        stopColor="#ffffff"
                        stopOpacity={orbColors.topGlareCore}
                      />
                      <Stop
                        offset="55%"
                        stopColor="#ffffff"
                        stopOpacity={orbColors.topGlareMid}
                      />
                      <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient
                      id="topSheen"
                      cx="50%"
                      cy="50%"
                      rx="50%"
                      ry="50%"
                    >
                      <Stop offset="78%" stopColor="#ffffff" stopOpacity={0} />
                      <Stop
                        offset="100%"
                        stopColor="#ffffff"
                        stopOpacity={0.08}
                      />
                    </RadialGradient>
                  </Defs>
                  <Circle cx="105" cy="105" r="104" fill="url(#topGlare)" />
                  <Circle cx="105" cy="105" r="104" fill="url(#topSheen)" />
                </Svg>

                {/* 작은 포인트 하이라이트 — 낮 모드에서만 표시 */}
                {!darkMode && (
                  <View
                    style={[
                      styles.glareBottom,
                      { backgroundColor: orbColors.glareBottom },
                    ]}
                  />
                )}
              </Animated.View>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {alreadyViewed ? (
          <View style={styles.hintGroup}>
            <TouchableOpacity
              onPress={handlePress}
              activeOpacity={0.6}
              hitSlop={12}
            >
              <Text style={[styles.hintSecondary, { color: theme.hint }]}>
                오늘의 운세 다시 보기 ›
              </Text>
            </TouchableOpacity>
            {/* 깜빡임 없음 — 가독성 우선 */}
            <Text style={[styles.hint, { color: theme.hint }]}>
              ✨ 내일의 운세가 기다리고 있어요
            </Text>
          </View>
        ) : (
          // 첫 진입 — call-to-action 이라 깜빡임 유지 (탭 유도)
          <Animated.Text
            style={[styles.hint, { opacity: hintOp, color: theme.hint }]}
          >
            ✦ 구슬을 살며시 눌러보세요 ✦
          </Animated.Text>
        )}
      </View>

      {/* 챗봇 진입 — 아이콘만 두면 마스코트 장식으로 읽힌다.
          라벨을 항상 붙이고, 첫 방문에만 말풍선으로 한 번 더 알린다. */}
      <View
        // BottomNav 바로 위. 계산은 lib/layout 이 단일 소스.
        style={[styles.floatingWrap, { bottom: space.aboveNav }]}
        pointerEvents="box-none"
      >
        {showChatHint && (
          <TouchableOpacity
            style={[
              styles.chatHint,
              {
                backgroundColor: darkMode
                  ? "rgba(42,32,72,0.88)"
                  : "rgba(255,255,255,0.92)",
              },
            ]}
            onPress={openChat}
            activeOpacity={0.85}
          >
            <Text style={[styles.chatHintText, { color: theme.title }]}>
              꿈 해몽이 궁금하면 몽이에게 물어보세요
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.floatingBtn}
          onPress={openChat}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="AI 꿈해몽 챗봇 열기"
        >
          <Image
            source={require("@/assets/images/chatboticon.png")}
            style={styles.floatingIcon}
            resizeMode="contain"
          />
          <View
            style={[
              styles.floatingLabel,
              {
                backgroundColor: darkMode
                  ? "rgba(42,32,72,0.88)"
                  : "rgba(255,255,255,0.92)",
              },
            ]}
          >
            <Text style={[styles.floatingLabelText, { color: theme.title }]}>
              AI 꿈해몽
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {chatMounted && (
        <Suspense fallback={null}>
          <ChatBotModal
            visible={showChat}
            onClose={() => setShowChat(false)}
            onSaved={(msg) => setToastMessage(msg)}
          />
        </Suspense>
      )}

      <Toast
        message={toastMessage}
        onHide={() => setToastMessage(null)}
        // 보관함에 저장된 경우(✨ 로 시작) 만 탭 → 보관함 이동.
        // 저장 실패 토스트는 그냥 알림만 띄우고 탭 액션 없음.
        onPress={
          toastMessage?.startsWith("✨")
            ? () => {
                setToastMessage(null);
                router.push("/(app)/storage" as never);
              }
            : undefined
        }
      />

      <NoticeModal
        visible={showNotice}
        onClose={() => setShowNotice(false)}
        onRead={() => setHasUnread(false)}
      />

      <BottomNav active="home" />

      <Modal
        visible={showModal && !!fortune}
        transparent
        animationType="slide"
        // 이 Modal 만 onRequestClose 가 빠져 있어 안드로이드 하드웨어 백이
        // 무반응이었다. 가이드가 열려 있으면 가이드부터 닫는다.
        onRequestClose={() => {
          if (showGuide) setShowGuide(false);
          else handleModalClose();
        }}
      >
        {/* 닫혀 있을 때도 시트 전체(카테고리 카드 5장 + 가이드)를 매 렌더마다
            엘리먼트로 만들고 있었다. 열려 있을 때만 만든다. */}
        {showModal && fortune && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={handleModalClose}
            />
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ translateY: sheetY }],
                  // 시트가 화면 맨 아래에 붙는다 — 시스템 내비 영역만큼 더 띄워야
                  // 맨 아래 "확인" 버튼이 안 잘린다.
                  paddingBottom: 24 + space.system,
                },
              ]}
            >
              {/* 손잡이 "띠" 전체가 터치 대상 — pill(40×4)만 노리게 하면
                  사실상 못 누른다. 시트 최상단부터 헤더 직전까지, 폭은 시트 전체.
                  음수 마진으로 modalContainer 의 padding(상 12 / 좌우 24)을 상쇄. */}
              <View
                style={styles.handleZone}
                accessibilityRole="button"
                accessibilityLabel="닫기"
                {...handlePan.panHandlers}
              >
                <View
                  style={[styles.handle, handlePressed && styles.handleActive]}
                />
              </View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>오늘의 운세</Text>
                <TouchableOpacity
                  style={styles.questionBtn}
                  onPress={() => setShowGuide(true)}
                >
                  <Text style={styles.questionBtnText}>?</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalCookieWrap}>
                  <Text style={styles.modalDate}>{fortune.date}</Text>
                  <GradeBadgeCard
                    // 레거시 데이터(🌧)가 DB 에 남아있을 수 있어 render 시점에 보정.
                    icon={fortune.grade === "조심" ? "⚠️" : fortune.gradeIcon}
                    label={fortune.grade}
                    title={fortune.gradeTitle}
                    bgColor={fortune.gradeBgColor}
                    textColor={fortune.gradeColor}
                    size="sm"
                  />
                </View>
                <View style={styles.messageBox}>
                  <Text style={styles.messageLabel}>오늘의 메세지</Text>
                  <Text style={styles.messageText}>❝{fortune.message}❞</Text>
                </View>

                <Text style={styles.sectionLabel}>오늘의 행운</Text>
                <View style={styles.luckyGrid}>
                  <LuckyCell label="숫자" value={fortune.luckyNumber} />
                  <LuckyCell
                    label="색"
                    value={fortune.luckyColor}
                    swatch={getLuckyColorStyle(fortune.luckyColor).bg}
                  />
                  <LuckyCell
                    label="아이템"
                    value={fortune.lucky?.item ?? "—"}
                  />
                </View>

                <View style={styles.tipBox}>
                  <Text style={styles.tipLabel}>💡 오늘의 팁</Text>
                  <Text style={styles.tipText}>{fortune.caution}</Text>
                </View>

                {fortune.categories && (
                  <View style={styles.categoriesSection}>
                    <Text style={styles.sectionLabel}>
                      카테고리별 자세히 보기
                    </Text>
                    <View style={styles.categoriesList}>
                      {CATEGORY_ORDER.map((key) => (
                        <CategoryCard
                          key={key}
                          categoryKey={key}
                          category={fortune.categories![key]}
                          collapsible
                          defaultExpanded={key === pickTopCategory(fortune.categories!)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                <AdSlot slot="fortune_modal_bottom" />

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleModalClose}
                >
                  <Text style={styles.closeBtnText}>확인</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>

            {showGuide && (
              <>
                <TouchableOpacity
                  style={[StyleSheet.absoluteFillObject, styles.guideOverlayBg]}
                  activeOpacity={1}
                  onPress={() => setShowGuide(false)}
                />
                <View
                  style={[
                    styles.guideModalContainer,
                    { paddingBottom: 24 + space.system },
                  ]}
                >
                  {/* handle 의 marginBottom 은 운세 시트의 handleZone 이 대신하게
                      되면서 스타일에서 빠졌다. 가이드는 이번 변경 대상이 아니라
                      기존 간격을 인라인으로 유지한다. */}
                  <View style={[styles.handle, { marginBottom: 16 }]} />
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <FortuneGradeGuide />
                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={() => setShowGuide(false)}
                    >
                      <Text style={styles.closeBtnText}>닫기</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  bellIcon: { width: 24, height: 24 },
  bellBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  // 안 읽은 공지가 있을 때 벨 우상단에 표시되는 작은 점
  bellDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E54F60",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
    paddingBottom: 110, // 구슬+텍스트를 화면 가운데보다 살짝 위로 — 더 의식적인 무드
  },

  title: {
    fontFamily: "OnglyphPDH",
    fontSize: 22,
    letterSpacing: 2,
    color: "#E8DEFF",
  },

  orbGlow: {
    position: "absolute",
    width: 274,
    height: 274,
    borderRadius: 137,
    backgroundColor: "rgba(180, 140, 255, 0.22)",
  },
  orbShell: {
    width: 210,
    height: 210,
    borderRadius: 105,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(180, 155, 225, 0.28)",
    backgroundColor: "transparent",
    shadowColor: "#a070e0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  glareBottom: {
    position: "absolute",
    bottom: 50,
    right: 42,
    width: 20,
    height: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  hint: {
    fontFamily: "OnglyphPDH",
    fontSize: 16,
    letterSpacing: 1,
    color: "#C4B0E8",
  },
  hintGroup: {
    alignItems: "center",
    gap: 6,
  },
  hintSecondary: {
    fontFamily: "OnglyphPDH",
    fontSize: 13,
    letterSpacing: 0.5,
    opacity: 0.55,
  },

  // 개발용 날씨 테스트 버튼 — 좌상단, 실제 UI 와 겹치지 않게
  weatherDebugBtn: {
    position: "absolute",
    top: 60,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 999,
  },
  weatherDebugText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  floatingWrap: {
    position: "absolute",
    right: 20,
    alignItems: "flex-end",
    gap: 8,
  },
  floatingBtn: {
    alignItems: "center",
    justifyContent: "center",
    // 라벨 폭이 아이콘보다 넓어도 아이콘이 오른쪽 기준으로 정렬되게 한다.
    alignSelf: "flex-end",
  },
  floatingIcon: { width: 70, height: 70 },
  floatingLabel: {
    marginTop: -6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    shadowColor: "#2A2048",
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  floatingLabelText: {
    fontFamily: "OnglyphPDH",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  chatHint: {
    maxWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    shadowColor: "#2A2048",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chatHintText: {
    fontFamily: "OnglyphPDH",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 12,
    // 배경 탭 영역을 넓힌다. 78% 면 위쪽 배경이 22% 띠뿐이라 조준이 필요했다.
    maxHeight: "72%",
  },
  // 시트 최상단 ~ 헤더 직전. pill 중심은 y=14 로 기존과 동일하다
  // (기존: paddingTop 12 + pill 4 → 중심 14 / 변경: 28 띠의 중앙 → 14).
  handleZone: {
    height: 28,
    marginTop: -12, // modalContainer paddingTop 상쇄 → 시트 맨 위까지
    marginHorizontal: -24, // 좌우 padding 상쇄 → 시트 폭 전체
    marginBottom: 4, // 기존 헤더 위치(y=32) 유지
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1C9E0",
    borderRadius: 2,
    alignSelf: "center",
  },
  handleActive: { backgroundColor: "#A594C4" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginBottom: 16,
    position: "relative",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#3D2B5E" },
  questionBtn: {
    position: "absolute",
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EDE9F4",
    alignItems: "center",
    justifyContent: "center",
  },
  questionBtnText: { fontSize: 18, fontWeight: "700", color: "#5C4A7A" },
  guideOverlayBg: { backgroundColor: "rgba(0,0,0,0.3)" },
  guideModalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 12,
    maxHeight: "78%",
  },

  modalCookieWrap: { alignItems: "center", gap: 8, marginBottom: 16 },
  modalBubbleEmoji: { fontSize: 64, lineHeight: 80 },
  modalDate: { fontSize: 13, color: "#9B8BB4" },
  messageBox: {
    backgroundColor: "#EBE2FA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D8C9F2",
  },
  messageLabel: { fontSize: 12, color: "#9B8BB4" },
  messageText: {
    fontSize: 15,
    color: "#3D2B5E",
    textAlign: "center",
    lineHeight: 24,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#9B8BB4",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  categoriesSection: { marginBottom: 16 },
  categoriesList: { gap: 8 },

  luckyGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  luckyCell: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
    minHeight: 84,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8E2F0",
  },
  luckyCellLabel: { fontSize: 11, color: "#9B8BB4" },
  // 색 swatch — 둥근 사각형 (원보다 색을 더 명확히 보여줌)
  luckyCellSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  luckyCellValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2B5E",
    textAlign: "center",
  },
  tipBox: {
    backgroundColor: "#F3EEFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 6,
  },
  tipLabel: { fontSize: 13, fontWeight: "700", color: "#5C4A7A" },
  tipText: { fontSize: 13, color: "#5C4A7A", lineHeight: 20 },
  closeBtn: {
    backgroundColor: "#C4B0E8",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  closeBtnText: { fontSize: 15, fontWeight: "700", color: "#3D2B5E" },
});
