import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import {
  listActiveNotices,
  markNoticesRead,
  type NoticeRow,
} from "@/features/notice/notices";

interface Props {
  visible: boolean;
  onClose: () => void;
  // 보여진 공지를 모두 읽음 처리한 직후 부모에 알려서 벨 빨간 점을 끄도록.
  onRead?: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function NoticeModal({ visible, onClose, onRead }: Props) {
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 위에서 살짝 슬라이드 + 페이드인
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      translateY.setValue(-8);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: err } = await listActiveNotices();
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setNotices([]);
      } else {
        setNotices(data ?? []);
        if (data && data.length > 0) {
          await markNoticesRead(data.map((n) => n.id));
          if (!cancelled) onRead?.();
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, onRead, opacity, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* 바깥 영역 탭하면 닫힘 — Pressable 로 잡으면 RN 의 responder 시스템이
          드롭다운 안쪽 탭은 안쪽 Pressable 이 가로채서 바깥 onPress 가 안 터진다. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.dropdown,
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <Pressable>
            <View style={styles.header}>
              <Text style={styles.title}>공지사항</Text>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#7868C8" />
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>{error}</Text>
              </View>
            ) : notices.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>새로운 공지가 없어요 🌙</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {notices.map((n) => (
                  <View key={n.id} style={styles.item}>
                    <View style={styles.itemHead}>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {n.title}
                      </Text>
                      <Text style={styles.itemDate}>
                        {formatDate(n.created_at)}
                      </Text>
                    </View>
                    {n.content ? (
                      <Text style={styles.itemContent} numberOfLines={3}>
                        {n.content}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// 벨 아이콘 좌표 — 헤더 paddingTop: 60, 벨 32px → 우상단 끝점이 (top ~92, right 20).
// 드롭다운은 벨 바로 아래(top: 98)에 우측 정렬로 띄움.
const DROPDOWN_WIDTH = 290;
const DROPDOWN_TOP = 98;
const DROPDOWN_RIGHT = 16;

const styles = StyleSheet.create({
  backdrop: { flex: 1 },

  dropdown: {
    position: "absolute",
    top: DROPDOWN_TOP,
    right: DROPDOWN_RIGHT,
    width: DROPDOWN_WIDTH,
    maxHeight: 360,
    backgroundColor: "#F8F6FB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.25)",
    shadowColor: "#5838B0",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    overflow: "hidden",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(180,160,230,0.18)",
  },
  title: {
    fontFamily: "OnglyphPDH",
    fontSize: 15,
    color: "#5848A8",
    letterSpacing: 0.4,
  },

  center: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "OnglyphPDH",
    fontSize: 13,
    color: "#9888CC",
    textAlign: "center",
  },

  list: { maxHeight: 300 },
  listContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },

  item: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(180,160,230,0.14)",
  },
  itemHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#5848A8",
    lineHeight: 18,
  },
  itemDate: {
    fontSize: 10,
    color: "#9B8BB4",
    paddingTop: 2,
  },
  itemContent: {
    fontSize: 12,
    color: "#7868B8",
    lineHeight: 18,
  },
});
