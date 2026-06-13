import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
} from "react-native-svg";

interface Props {
  // 첫 화면 첫 paint 에 필요한 준비가 끝났는지. 애니메이션 최소 노출과 AND 로 묶인다.
  isAppReady: boolean;
  onFinish: () => void;
}

// 홈 화면 구슬(app/(app)/(tabs)/index.tsx 의 orbShell) 과 동일한 크기로 맞춤.
const ORB_SIZE = 210;
// 최종 자세는 몽이가 뒤에서 양팔로 구슬을 감싸안는 느낌 — 구슬보다 훨씬 크게.
const MONGI_HUG_SIZE = 480;

// 최종 자세: 구슬 뒤에서 안는 모습 — body 가 구슬 양옆을 감싸고 머리는 위로.
const HUG_FINAL_Y = -110;
const HUG_START_Y = 0;

const HUG_POSE = require("@/assets/images/mongi0.png");

// 시퀀스 — 공전(orbit) 단계 제거. 구슬만 잠깐 떴다가 반짝하면서 mongi0 등장.
const INTRO_MS = 300; // 구슬 페이드인
const WAIT_MS = 400; // 구슬만 잠깐 보이는 대기
const SETTLE_MS = 350; // 반짝 + mongi0 슬라이드업
// mongi0 등장 후 최소 유지 시간. 앱이 빨리 준비되면 이 직후 종료,
// 느리면 isAppReady 가 될 때까지 "꿈을 해석하는 중..." 텍스트가 자연스럽게 더 머문다.
const HOLD_MS = 500;
// 애니메이션 최소 노출 시간. onFinish 는 (이 시간 경과) AND (isAppReady) 둘 다 만족 시 발화.
const MIN_TOTAL_MS = INTRO_MS + WAIT_MS + SETTLE_MS + HOLD_MS;

export default function SplashAnimation({ isAppReady, onFinish }: Props) {
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(0.92)).current;
  const hugOpacity = useRef(new Animated.Value(0)).current;
  const hugY = useRef(new Animated.Value(HUG_START_Y)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    // 1. 구슬 페이드인
    Animated.parallel([
      Animated.timing(orbOpacity, {
        toValue: 1,
        duration: INTRO_MS,
        useNativeDriver: true,
      }),
      Animated.timing(orbScale, {
        toValue: 1,
        duration: INTRO_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. 잠깐 구슬만 보여주는 대기
      setTimeout(() => {
        // 3. "반짝" — 구슬 탄성 + 광채 burst + mongi0 슬라이드업
        Animated.sequence([
          Animated.spring(orbScale, {
            toValue: 1.08,
            friction: 4,
            tension: 130,
            useNativeDriver: true,
          }),
          Animated.spring(orbScale, {
            toValue: 1,
            friction: 5,
            tension: 110,
            useNativeDriver: true,
          }),
        ]).start();

        // 광채 burst
        glowOpacity.setValue(0.6);
        glowScale.setValue(0.75);
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.7,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();

        // mongi0 등장
        Animated.parallel([
          Animated.timing(hugOpacity, {
            toValue: 1,
            duration: SETTLE_MS,
            useNativeDriver: true,
          }),
          Animated.spring(hugY, {
            toValue: HUG_FINAL_Y,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // 4. 로딩 텍스트 페이드인
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();
        });
      }, WAIT_MS);
    });
  }, [orbOpacity, orbScale, hugOpacity, hugY, textOpacity, glowOpacity, glowScale]);

  // 5. 애니메이션 최소 노출 시간 경과 표시
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_TOTAL_MS);
    return () => clearTimeout(t);
  }, []);

  // 최소 노출 완료 AND 앱 준비 완료 → 둘 중 늦은 쪽 기준으로 1회만 종료.
  // 빨리 준비되면 애니 끝나자마자, 느리면 준비될 때까지 기다린다.
  const finished = useRef(false);
  useEffect(() => {
    if (minElapsed && isAppReady && !finished.current) {
      finished.current = true;
      onFinish();
    }
  }, [minElapsed, isAppReady, onFinish]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#F8F3FF", "#DDC9F2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.stage}>
          {/* 받침대 — 구슬 아래 어두운 타원 그림자 */}
          <View style={styles.pedestalWrap}>
            <Svg width={ORB_SIZE * 0.92} height={36}>
              <Defs>
                <RadialGradient id="ped" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor="#2D1A55" stopOpacity={0.5} />
                  <Stop offset="60%" stopColor="#2D1A55" stopOpacity={0.18} />
                  <Stop offset="100%" stopColor="#2D1A55" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse
                cx={(ORB_SIZE * 0.92) / 2}
                cy={18}
                rx={ORB_SIZE * 0.42}
                ry={11}
                fill="url(#ped)"
              />
            </Svg>
          </View>

          {/* 광채 burst — 가장 뒤 레이어, 반짝 순간 흰 광원이 펴짐 */}
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          {/* mongi0 — zIndex 1, 항상 구슬 뒤 */}
          <Animated.View
            style={[
              styles.hug,
              {
                opacity: hugOpacity,
                transform: [{ translateY: hugY }],
                zIndex: 1,
                elevation: 1,
              },
            ]}
          >
            <Image
              source={HUG_POSE}
              style={styles.mongiHugImg}
              resizeMode="contain"
            />
          </Animated.View>

          {/* 구슬 backdrop — 투명 구슬 너머로 mongi0 가 비치지 않게,
              그라데이션 중간 톤의 솔리드 디스크. 구슬과 같이 스케일/페이드. */}
          <Animated.View
            style={[
              styles.orbBackdrop,
              {
                opacity: orbOpacity,
                transform: [{ scale: orbScale }],
                zIndex: 3,
                elevation: 3,
              },
            ]}
          />

          {/* 구슬 — zIndex 5, mongi0/backdrop 위 */}
          <Animated.View
            style={[
              styles.orb,
              {
                opacity: orbOpacity,
                transform: [{ scale: orbScale }],
                zIndex: 5,
                elevation: 5,
              },
            ]}
          >
            <Svg width={ORB_SIZE} height={ORB_SIZE}>
              <Defs>
                <RadialGradient id="vol" cx="38%" cy="32%" rx="70%" ry="70%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
                  <Stop offset="55%" stopColor="#E8DEFF" stopOpacity={0.1} />
                  <Stop offset="100%" stopColor="#7A5BBE" stopOpacity={0.18} />
                </RadialGradient>
                <RadialGradient id="rim" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="78%" stopColor="#000000" stopOpacity={0} />
                  <Stop offset="100%" stopColor="#5838A0" stopOpacity={0.18} />
                </RadialGradient>
                <RadialGradient id="glare" cx="36%" cy="28%" rx="30%" ry="22%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.78} />
                  <Stop offset="55%" stopColor="#FFFFFF" stopOpacity={0.18} />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle
                cx={ORB_SIZE / 2}
                cy={ORB_SIZE / 2}
                r={ORB_SIZE / 2 - 1}
                fill="#D8C5FA"
                fillOpacity={0.28}
              />
              <Circle
                cx={ORB_SIZE / 2}
                cy={ORB_SIZE / 2}
                r={ORB_SIZE / 2 - 1}
                fill="url(#vol)"
              />
              <Circle
                cx={ORB_SIZE / 2}
                cy={ORB_SIZE / 2}
                r={ORB_SIZE / 2 - 1}
                fill="url(#rim)"
              />
              <Circle
                cx={ORB_SIZE / 2}
                cy={ORB_SIZE / 2}
                r={ORB_SIZE / 2 - 1}
                fill="url(#glare)"
              />
            </Svg>
          </Animated.View>
        </View>

        {/* 브랜드 — 구슬 바로 아래 "몽글" */}
        <Animated.Text style={[styles.brand, { opacity: orbOpacity }]}>
          몽글
        </Animated.Text>

        {/* 로딩 텍스트 */}
        <Animated.Text style={[styles.loading, { opacity: textOpacity }]}>
          꿈을 해석하는 중...
        </Animated.Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  stage: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pedestalWrap: {
    position: "absolute",
    bottom: -22,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: "#FFFFFF",
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  orbBackdrop: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    // 배경 그라데이션 중간 톤 (#F8F3FF ↔ #DDC9F2 의 중간) — 구슬 투명도와 합쳐졌을 때
    // 자연스러운 옅은 보라 디스크처럼 보이고 mongi0 본체를 가린다.
    backgroundColor: "#EADEF8",
  },
  hug: {
    position: "absolute",
    width: MONGI_HUG_SIZE,
    height: MONGI_HUG_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  mongiHugImg: {
    width: MONGI_HUG_SIZE,
    height: MONGI_HUG_SIZE,
  },
  brand: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    // 화면 세로 중앙 = stage 중심. 거기서 구슬 반경(90) + 받침대(약 14) + 여유(40) 만큼 아래로.
    marginTop: ORB_SIZE / 2 + 54,
    fontFamily: "OnglyphPDH",
    fontSize: 38,
    color: "#5838A0",
    letterSpacing: 6,
  },
  loading: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    fontFamily: "OnglyphPDH",
    fontSize: 16,
    color: "#7858B8",
    letterSpacing: 1,
  },
});
