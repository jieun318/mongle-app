import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useBottomSpace } from "@/lib/layout";
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
  const space = useBottomSpace();

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

  // 시스템 내비/제스처 영역 위로 띄운다. 계산 근거는 lib/layout 참고.
  return (
    <View style={[styles.wrapper, { bottom: space.navOffset }]}>
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
    // bottom 은 useBottomSpace().navOffset 으로 인라인 지정.
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
