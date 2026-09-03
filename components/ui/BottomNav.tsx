import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ComponentType } from "react";
import {
  HomeIcon,
  SearchIcon,
  StarIcon,
  MypageIcon,
  type IconProps,
} from "@/components/ui/icons";

type NavItem = "home" | "search" | "storage" | "mypage";

interface BottomNavProps {
  active: NavItem;
}

const ACTIVE_COLOR = "#5848A8";
const INACTIVE_COLOR = "#C4B8DC";

// 시스템 내비 영역 위로 항상 확보하는 최소 간격 (제스처 핸들 오터치 방지)
const MIN_SYSTEM_GAP = 12;
// 그 위에 얹는 디자인상의 기본 여백
const BASE_GAP = 20;

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items: {
    key: NavItem;
    href: string;
    Icon: ComponentType<IconProps>;
  }[] = [
    { key: "home",    href: "/(app)/",        Icon: HomeIcon },
    { key: "search",  href: "/(app)/search",  Icon: SearchIcon },
    { key: "storage", href: "/(app)/storage", Icon: StarIcon },
    { key: "mypage",  href: "/(app)/mypage",  Icon: MypageIcon },
  ];

  // 안드로이드 시스템 네비게이션 바 위로 띄운다.
  //
  // insets.bottom 만 더하면 제스처 내비게이션 기기에서 문제가 된다 — 인셋이
  // 0 이나 아주 작게 잡히는데, 화면 맨 아래엔 여전히 시스템 제스처 핸들이
  // 깔려 있어서 탭이 앱이 아니라 시스템으로 먹힌다. 그래서 인셋과 무관하게
  // 최소 여백(MIN_SYSTEM_GAP)을 보장한다.
  const bottomOffset = BASE_GAP + Math.max(insets.bottom, MIN_SYSTEM_GAP);

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View style={styles.container}>
        {items.map(({ key, href, Icon }) => {
          const isActive = active === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.navItem}
              onPress={() => router.navigate(href)}
              activeOpacity={0.7}
            >
              <Icon size={24} color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    // bottom 은 인셋에 따라 인라인으로 지정 (BASE_GAP + max(insets.bottom, MIN_SYSTEM_GAP)).
    left: 16,
    right: 16,
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 24,
    justifyContent: "space-around",
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  navItem: { alignItems: "center", flex: 1 },
});
