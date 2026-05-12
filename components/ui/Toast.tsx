import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  message: string | null;
  onHide: () => void;
  // 토스트 본체를 탭하면 호출되는 핸들러 — 보관함 이동 등에 사용.
  onPress?: () => void;
  durationMs?: number;
}

// 화면 하단에 잠깐 떠올랐다 사라지는 토스트.
// 부모가 message 를 set 하면 표시되고, 일정 시간 후 onHide 로 비워달라고 알린다.
export default function Toast({
  message,
  onHide,
  onPress,
  durationMs = 2600,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!message) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }, durationMs);

    return () => clearTimeout(t);
  }, [message, durationMs, onHide, opacity, translateY]);

  if (!message) return null;

  // onPress 가 있으면 탭 가능한 토스트, 없으면 비탭 (pointerEvents='none')
  const content = (
    <View style={styles.inner}>
      <Text style={styles.text}>{message}</Text>
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </View>
  );

  return (
    <Animated.View
      pointerEvents={onPress ? "box-none" : "none"}
      style={[styles.toast, { opacity, transform: [{ translateY }] }]}
    >
      {onPress ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 130,
    alignSelf: "center",
    backgroundColor: "rgba(60, 45, 95, 0.92)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    maxWidth: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  chevron: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    opacity: 0.9,
    marginTop: -2,
  },
});
