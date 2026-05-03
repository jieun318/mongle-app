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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useRef, useEffect } from "react";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import BottomNav from "@/components/ui/BottomNav";
import FortuneGradeGuide from "@/components/fortune/FortuneGradeGuide";
import GradeBadgeCard from "@/components/fortune/GradeBadgeCard";
import { Fortune } from "@/types/fortune";
import {
  getDailyFortune,
  getSmokePalette,
  rollRandomFortune,
} from "@/features/fortune/dailyFortune";

// 구슬 안에서 반짝이는 스파클 위치 (210x210 기준)
const SPARKLES = [
  { x: 58, y: 72, size: 4, period: 2400, delay: 0 },
  { x: 148, y: 58, size: 3, period: 2800, delay: 700 },
  { x: 168, y: 118, size: 5, period: 2200, delay: 1400 },
  { x: 62, y: 142, size: 3, period: 2600, delay: 500 },
  { x: 112, y: 168, size: 4, period: 3000, delay: 1900 },
  { x: 118, y: 88, size: 3, period: 2500, delay: 1100 },
] as const;

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
  은색: { bg: "#D1D5DB", text: "#1F2937" },
  흰색: { bg: "#F9FAFB", text: "#374151" },
  검정: { bg: "#374151", text: "#fff" },
};

function getLuckyColorStyle(colorName: string) {
  return COLOR_MAP[colorName] ?? { bg: "#F9F7FF", text: "#3D2B5E" };
}

// cx를 0~210 전체에 고르게 분산
const BLOBS = [
  { cx: 18, size: 72, colorIdx: 0, dur: 3800 },
  { cx: 55, size: 58, colorIdx: 1, dur: 4200 },
  { cx: 95, size: 66, colorIdx: 2, dur: 3600 },
  { cx: 140, size: 62, colorIdx: 0, dur: 4000 },
  { cx: 182, size: 54, colorIdx: 1, dur: 3900 },
  { cx: 35, size: 48, colorIdx: 2, dur: 4300 },
  { cx: 75, size: 60, colorIdx: 0, dur: 3700 },
  { cx: 118, size: 54, colorIdx: 1, dur: 4100 },
  { cx: 160, size: 70, colorIdx: 2, dur: 3500 },
  { cx: 105, size: 50, colorIdx: 0, dur: 4400 },
  { cx: 8, size: 52, colorIdx: 1, dur: 4600 },
  { cx: 48, size: 46, colorIdx: 2, dur: 3400 },
  { cx: 88, size: 50, colorIdx: 0, dur: 4500 },
  { cx: 130, size: 48, colorIdx: 1, dur: 3300 },
  { cx: 170, size: 54, colorIdx: 2, dur: 4700 },
  { cx: 200, size: 44, colorIdx: 0, dur: 3550 },
] as const;

export default function HomeScreen() {
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const isAnimating = useRef(false);
  const smokeColors = getSmokePalette(fortune?.luckyColor ?? "라벤더");

  // 매일 1회, 사용자별 운세 로드
  useEffect(() => {
    getDailyFortune().then(setFortune);
  }, []);

  const floatY = useRef(new Animated.Value(0)).current;
  const hintOp = useRef(new Animated.Value(0.5)).current;
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbLiftY = useRef(new Animated.Value(0)).current;
  const smokeOp = useRef(new Animated.Value(0)).current; // 탭 전: 투명 유리구슬
  const blobAnims = useRef(BLOBS.map(() => new Animated.Value(0))).current;
  const sparkleAnims = useRef(
    SPARKLES.map(() => new Animated.Value(0)),
  ).current;

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

    // 연기 블롭 - 처음부터 구슬이 차 있어 보이도록 오프셋 분산
    const runBlob = (anim: Animated.Value, dur: number) => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: dur,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) runBlob(anim, dur);
      });
    };

    blobAnims.forEach((anim, i) => {
      const offset = i / BLOBS.length;
      anim.setValue(offset);
      Animated.timing(anim, {
        toValue: 1,
        duration: BLOBS[i].dur * (1 - offset),
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) runBlob(anim, BLOBS[i].dur);
      });
    });

    // 유리구슬 내부 스파클 — 각자 주기로 반짝임
    sparkleAnims.forEach((anim, i) => {
      const cfg = SPARKLES[i];
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
          Animated.delay(600 + Math.random() * 1200),
        ]).start(loop);
      };
      setTimeout(loop, cfg.delay);
    });
  }, []);

  const handlePress = () => {
    if (isAnimating.current) return;
    if (!fortune) return; // 운세 로드 전 탭 무시
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
      duration: 1600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      setShowModal(true);
      isAnimating.current = false;
    }, 2800);
  };

  // DEV: 구슬 길게 눌러 운세 랜덤 굴리기 + 색 미리보기 (배포 전 제거)
  const handleOrbLongPress = () => {
    if (!__DEV__) return;
    setFortune(rollRandomFortune());
    smokeOp.stopAnimation();
    smokeOp.setValue(0);
    Animated.sequence([
      Animated.timing(smokeOp, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(smokeOp, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleModalClose = () => {
    setShowModal(false);
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
      Animated.timing(smokeOp, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <LinearGradient
      colors={["#E8DEFF", "#EEF6FF", "#FFF8E7"]}
      style={{ flex: 1 }}
    >
      <View style={styles.header}>
        <TouchableOpacity>
          <Image
            source={require("@/assets/images/bell.png")}
            style={styles.bellIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>오늘의 운세</Text>

        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onLongPress={handleOrbLongPress}
          delayLongPress={500}
        >
          <Animated.View
            style={{
              alignItems: "center",
              transform: [{ translateY: Animated.add(floatY, orbLiftY) }],
            }}
          >
            <View style={{ width: 210, height: 210 }}>
              {/* 유리 구슬 껍데기 - overflow:hidden 으로 연기 클리핑 */}
              <Animated.View
                style={[styles.orbShell, { transform: [{ scale: orbScale }] }]}
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
                        stopColor="#f0ecff"
                        stopOpacity={0.05}
                      />
                      <Stop
                        offset="100%"
                        stopColor="#a090c8"
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
                        stopColor="#7060b0"
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
                      <Stop offset="0%" stopColor="#e8dcff" stopOpacity={0.3} />
                      <Stop offset="100%" stopColor="#e8dcff" stopOpacity={0} />
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
                        stopOpacity={0.75}
                      />
                      <Stop
                        offset="55%"
                        stopColor="#ffffff"
                        stopOpacity={0.18}
                      />
                      <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Circle
                    cx="105"
                    cy="105"
                    r="104"
                    fill="#ddd0ff"
                    fillOpacity={0.06}
                  />
                  <Circle cx="105" cy="105" r="104" fill="url(#vol)" />
                  <Circle cx="105" cy="105" r="104" fill="url(#limb)" />
                  <Circle cx="105" cy="105" r="104" fill="url(#caustic)" />
                  <Circle cx="105" cy="105" r="104" fill="url(#glare)" />
                </Svg>

                {/* 연기 컨테이너 — smokeOp 0→1 로 전체 페이드인, 각 블롭은 내부에서 위로 이동 */}
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 210,
                    height: 210,
                    opacity: smokeOp,
                  }}
                >
                  {BLOBS.map((cfg, i) => {
                    const diameter = cfg.size * 2;
                    const translateY = blobAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [210, -diameter],
                    });
                    const opacity = blobAnims[i].interpolate({
                      inputRange: [0, 0.08, 0.9, 1],
                      outputRange: [0, 0.62, 0.62, 0],
                    });
                    const color = smokeColors[cfg.colorIdx];
                    return (
                      <Animated.View
                        key={i}
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          width: diameter,
                          height: diameter,
                          left: cfg.cx - cfg.size,
                          top: 0,
                          opacity,
                          transform: [{ translateY }],
                        }}
                      >
                        <Svg width={diameter} height={diameter}>
                          <Defs>
                            {/* 색만 — 흰점 코어 제거 */}
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
                </Animated.View>

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
                      <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.7} />
                      <Stop
                        offset="55%"
                        stopColor="#ffffff"
                        stopOpacity={0.16}
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

                {/* 작은 포인트 하이라이트만 남김 */}
                <View style={styles.glareBottom} />

                {/* 구슬 내부 스파클 — 매일 봐도 생동감 있도록 */}
                {SPARKLES.map((s, i) => (
                  <Animated.View
                    key={`sp${i}`}
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: s.x - s.size,
                      top: s.y - s.size,
                      width: s.size * 2,
                      height: s.size * 2,
                      borderRadius: s.size,
                      backgroundColor: "#fff",
                      opacity: sparkleAnims[i],
                      shadowColor: "#ffffff",
                      shadowOpacity: 0.9,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 0 },
                      transform: [
                        {
                          scale: sparkleAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.4, 1.3],
                          }),
                        },
                      ],
                    }}
                  />
                ))}
              </Animated.View>
            </View>
          </Animated.View>
        </TouchableOpacity>

        <Animated.Text style={[styles.hint, { opacity: hintOp }]}>
          ✦ 구슬을 살며시 눌러보세요 ✦
        </Animated.Text>
      </View>

      <TouchableOpacity style={styles.floatingBtn}>
        <Image
          source={require("@/assets/images/chatboticon.png")}
          style={styles.floatingIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

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
                  <Text style={styles.modalBubbleEmoji}>🫧</Text>
                  <GradeBadgeCard
                    icon={fortune.gradeIcon}
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
                <View style={styles.luckyRow}>
                  <View style={styles.luckyBox}>
                    <Text style={styles.luckyLabel}>행운의 숫자</Text>
                    <Text style={styles.luckyValue}>{fortune.luckyNumber}</Text>
                  </View>
                  <View style={styles.luckyBox}>
                    <Text style={styles.luckyLabel}>행운의 색</Text>
                    <View style={styles.luckyColorRow}>
                      <View
                        style={[
                          styles.colorSwatch,
                          {
                            backgroundColor: getLuckyColorStyle(
                              fortune.luckyColor,
                            ).bg,
                          },
                        ]}
                      />
                      <Text style={styles.luckyValue}>
                        {fortune.luckyColor}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.tipBox}>
                  <Text style={styles.tipLabel}>💡 오늘의 팁</Text>
                  <Text style={styles.tipText}>{fortune.caution}</Text>
                </View>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  bellIcon: { width: 24, height: 24 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 36 },

  title: {
    fontFamily: "OnglyphPDH",
    fontSize: 22,
    letterSpacing: 2,
    color: "#7a5db0",
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
    color: "#9b82c8",
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
    backgroundColor: "#F3EEFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    gap: 8,
  },
  messageLabel: { fontSize: 12, color: "#9B8BB4" },
  messageText: {
    fontSize: 15,
    color: "#3D2B5E",
    textAlign: "center",
    lineHeight: 24,
  },
  luckyRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  luckyBox: {
    flex: 1,
    backgroundColor: "#F9F7FF",
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  luckyLabel: { fontSize: 12, color: "#9B8BB4" },
  luckyColorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorSwatch: { width: 22, height: 22, borderRadius: 6 },
  luckyValue: { fontSize: 20, fontWeight: "700", color: "#3D2B5E" },
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
