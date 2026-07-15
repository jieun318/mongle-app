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

  return (
    // 안드로이드 시스템 네비게이션 바(edge-to-edge) 위로 띄운다. insets.bottom 이
    // 0 인 기기(제스처/구형)에서는 기존과 동일한 24 위치.
    <View style={[styles.wrapper, { bottom: 24 + insets.bottom }]}>
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
    // bottom 은 인셋에 따라 인라인으로 지정 (24 + insets.bottom).
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
