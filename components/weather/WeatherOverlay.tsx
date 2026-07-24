import { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import type { WeatherCondition } from "@/features/weather/weather";

const { width: W, height: H } = Dimensions.get("window");

// 결정적 의사난수 — 파티클 위치/속도를 인덱스로 흩뿌린다(Math.random 없이 안정적).
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface Particle {
  x: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  opacity: number;
}

function makeParticles(count: number, kind: "rain" | "snow"): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const r1 = rand(i + 1);
    const r2 = rand(i + 7.3);
    const r3 = rand(i + 13.1);
    if (kind === "rain") {
      return {
        x: r1 * W,
        delay: r2 * 1200,
        duration: 650 + r3 * 450, // 빠르게
        size: 18 + r3 * 16, // 더 긴 빗줄기 (18~34)
        drift: 6,
        opacity: 0.4 + r2 * 0.35, // 0.4~0.75 로 진하게
      };
    }
    return {
      x: r1 * W,
      delay: r2 * 4000,
      duration: 5000 + r3 * 4000, // 느리게 부유
      size: 4 + r3 * 5,
      drift: 24 + r2 * 30,
      opacity: 0.5 + r2 * 0.35,
    };
  });
}

function Drop({ p, kind }: { p: Particle; kind: "rain" | "snow" }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: kind === "rain" ? Easing.in(Easing.quad) : Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [t, p.duration, p.delay, kind]);

  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, H + 40],
  });
  // 눈은 좌우로 살랑이게, 비는 거의 직선.
  const translateX = t.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange:
      kind === "snow" ? [0, p.drift, 0] : [0, p.drift * 0.3, p.drift * 0.6],
  });

  if (kind === "rain") {
    return (
      <Animated.View
        style={{
          position: "absolute",
          left: p.x,
          top: 0,
          width: 2.5,
          height: p.size,
          borderRadius: 1.5,
          backgroundColor: "#D6E4FB", // 더 밝은 물빛 — 어두운 하늘에서 잘 보이게
          opacity: p.opacity,
          transform: [{ translateY }, { translateX }],
        }}
      />
    );
  }
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: p.x,
        top: 0,
        width: p.size,
        height: p.size,
        borderRadius: p.size / 2,
        backgroundColor: "#FFFFFF",
        opacity: p.opacity,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

// sleet(비/눈)은 눈처럼 렌더(부드럽게). count 는 S8 등 저사양 고려해 절제.
export default function WeatherOverlay({
  condition,
}: {
  condition: WeatherCondition;
}) {
  const kind: "rain" | "snow" | null =
    condition === "rain"
      ? "rain"
      : condition === "snow" || condition === "sleet"
        ? "snow"
        : null;

  const particles = useMemo(
    () => (kind ? makeParticles(kind === "rain" ? 45 : 18, kind) : []),
    [kind],
  );

  if (!kind) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Drop key={i} p={p} kind={kind} />
      ))}
    </View>
  );
}
