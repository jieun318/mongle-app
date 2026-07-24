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
  Dimensions,
  AppState,
  InteractionManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useRef, useEffect, useCallback } from "react";
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

const SCREEN_W = Dimensions.get("window").width;

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

const VIEWED_DATE_KEY = "fortune.viewedDate";
import BottomNav from "@/components/ui/BottomNav";
import { BellIcon } from "@/components/ui/icons";
import Toast from "@/components/ui/Toast";
import ChatBotModal from "@/components/chat/ChatBotModal";
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
} from "@/features/fortune/dailyFortune";
import { prefetchMyDreams } from "@/features/dream/dreams";
import { prefetchDreamBrowse } from "@/features/dream/dreamQueries";
import {
  useWeatherCondition,
  type WeatherCondition,
} from "@/features/weather/weather";
import WeatherOverlay from "@/components/weather/WeatherOverlay";

// ⚠️ 개발용 강제 날씨 스위치 — 실제 비/눈이 올 때만 보여 테스트가 어려우므로,
// 화면 좌상단 테스트 버튼으로 연출을 순환시킨다(null = 실제 날씨 사용).
// 배포 전 DEV_WEATHER_BUTTON 을 false 로 바꿔 버튼을 숨길 것.
const DEV_WEATHER_BUTTON = true;

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

export default function HomeScreen() {
  const router = useRouter();
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [darkMode, setDarkMode] = useState(getDefaultDarkMode);
  const [alreadyViewed, setAlreadyViewed] = useState(false);
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [sunReady, setSunReady] = useState(false); // 첫 자동 업데이트 후 true
  const [showChat, setShowChat] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  // 개발용 강제 날씨 (null = 실제 날씨). 좌상단 테스트 버튼이 WEATHER_CYCLE 순환.
  const [forceWeatherIdx, setForceWeatherIdx] = useState(0);
  const forceWeather = WEATHER_CYCLE[forceWeatherIdx];

  // 마운트 시 + 포그라운드 복귀 시 안 읽은 공지 여부 확인
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const unread = await hasUnreadNotices();
      if (!cancelled) setHasUnread(unread);
    };
    refresh();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
  const isAnimating = useRef(false);
  const smokeColors = getSmokePalette(fortune?.luckyColor ?? "라벤더");

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
  const sunCX = useRef(new Animated.Value(SCREEN_W * 0.5)).current;
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
        const { cx, cy } = sunArcPosition(state.arcT, SCREEN_W);
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
        const { cx, cy } = sunArcPosition(state.arcT, SCREEN_W);
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
  }, [sunTimes, sunCX, sunCY, transitionProgress]);

  // 매일 1회, 사용자별 운세 로드
  useEffect(() => {
    getDailyFortune().then(setFortune);
  }, []);

  // 오늘 이미 구슬을 탭했는지 확인 — 같은 날이면 구슬 채워진 상태로 시작
  useEffect(() => {
    AsyncStorage.getItem(VIEWED_DATE_KEY)
      .then((saved) => {
        if (saved === getTodayKey()) {
          setAlreadyViewed(true);
          smokeOp.setValue(1);
        }
      })
      .catch(() => {});
  }, []);

  // 위치 권한 요청 + Open-Meteo 에서 오늘 일출/일몰 시각 가져오기
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loc = await getCurrentLocation();
      const times = await fetchSunTimes(loc.lat, loc.lng);
      if (cancelled) return;
      if (times) setSunTimes(times);
    })();
    return () => {
      cancelled = true;
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
  const { data: weather } = useWeatherCondition();

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

  // 홈이 그려지고 상호작용이 끝난 뒤(= 홈 우선) 백그라운드 예열.
  //  - 보관함 목록: 탭 첫 진입 스피너 제거
  //  - 꿈 사전(카테고리): 검색 화면에서 카테고리 카드 첫 진입 스피너 제거
  // (키워드 검색은 입력마다 달라 예열 불가 — 네트워크 유지)
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      prefetchMyDreams();
      prefetchDreamBrowse();
    });
    return () => task.cancel();
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

  const handlePress = () => {
    if (isAnimating.current) return;
    if (!fortune) return; // 운세 로드 전 탭 무시

    // 매 탭마다 commit 시도 — upsert 라 멱등하고, 이전 탭의 저장이 실패했을 때
    // (네트워크/세션 타이밍 등) 다시 탭하면 복구된다. AsyncStorage 의 VIEWED_DATE_KEY 만
    // 보고 일찍 return 해 버리면, 첫 commit 실패 시 mypage 의 이번 주 운세에 영원히
    // 안 뜨는 버그가 생긴다.
    commitDailyFortuneToDB(fortune).catch(() => {});

    // 오늘 이미 봤으면 애니 생략하고 결과만 즉시 표시
    if (alreadyViewed) {
      setShowModal(true);
      return;
    }

    // 첫 탭 → 봤다고 저장 (자정 지나면 자동 리셋)
    AsyncStorage.setItem(VIEWED_DATE_KEY, getTodayKey()).catch(() => {});
    setAlreadyViewed(true);

    isAnimating.current = true;

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
        style={[StyleSheet.absoluteFillObject, { opacity: sunsetOp }]}
      >
        <LinearGradient
          colors={SUNSET_GRADIENT}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { opacity: twilightOp }]}
      >
        <LinearGradient
          colors={TWILIGHT_GRADIENT}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
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
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: cloudsEnvelope },
        ]}
      >
        {CLOUDS.map((c, i) => (
            <Animated.View
              key={`cloud${i}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                top: c.y,
                transform: [
                  {
                    translateX: cloudAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-c.size, SCREEN_W],
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
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: starsEnvelope },
        ]}
      >
        {BG_STARS.map((s, i) => (
          <Animated.View
            key={`bgstar${i}`}
            pointerEvents="none"
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
          <Animated.View
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
                    각 블롭은 가장자리가 그라디언트로 흐려져서 직선 경계 없음. */}
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

      <TouchableOpacity
        style={styles.floatingBtn}
        onPress={() => setShowChat(true)}
        activeOpacity={0.85}
      >
        <Image
          source={require("@/assets/images/chatboticon.png")}
          style={styles.floatingIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <ChatBotModal
        visible={showChat}
        onClose={() => setShowChat(false)}
        onSaved={(msg) => setToastMessage(msg)}
      />

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

      <Modal visible={showModal && !!fortune} transparent animationType="slide">
        {fortune && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={handleModalClose}
            />
            <View style={styles.modalContainer}>
              <View style={styles.handle} />
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
            </View>

            {showGuide && (
              <>
                <TouchableOpacity
                  style={[StyleSheet.absoluteFillObject, styles.guideOverlayBg]}
                  activeOpacity={1}
                  onPress={() => setShowGuide(false)}
                />
                <View style={styles.guideModalContainer}>
                  <View style={styles.handle} />
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
  floatingBtn: {
    position: "absolute",
    bottom: 110,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingIcon: { width: 70, height: 70 },

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
    maxHeight: "78%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1C9E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
