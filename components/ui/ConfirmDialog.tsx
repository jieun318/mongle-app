import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useRef } from "react";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  // cancelLabel 이 주어지면 두 버튼 confirm 모드, 없으면 단일 알림 모드.
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const isConfirmMode = !!cancelLabel;

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      scale.setValue(0.94);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }),
    ]).start();
  }, [visible, opacity, scale]);

  const handleBackdrop = () => {
    if (isConfirmMode) onCancel?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={() => (isConfirmMode ? onCancel?.() : onConfirm())}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdrop} />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.btnRow}>
            {isConfirmMode ? (
              <Pressable
                style={[styles.btn, styles.cancelBtn]}
                onPress={onCancel}
                android_ripple={{ color: "rgba(120,104,200,0.12)" }}
              >
                <Text style={styles.cancelLabel}>{cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[
                styles.btn,
                destructive ? styles.destructiveBtn : styles.confirmBtn,
              ]}
              onPress={onConfirm}
              android_ripple={{ color: "rgba(255,255,255,0.18)" }}
            >
              <Text style={styles.confirmLabel}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(36,24,56,0.42)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 14,
    shadowColor: "#3D2B5E",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3D2B5E",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#6858B8",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#F4F0FA",
  },
  confirmBtn: {
    backgroundColor: "#7868C8",
  },
  destructiveBtn: {
    backgroundColor: "#D85858",
  },
  cancelLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7868B8",
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
