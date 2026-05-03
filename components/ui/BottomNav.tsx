import { View, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

type NavItem = "home" | "search" | "storage" | "mypage";

interface BottomNavProps {
  active: NavItem;
}

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();

  const items = [
    { key: "home", href: "/(app)/", icon: require("@/assets/images/home.png") },
    {
      key: "search",
      href: "/(app)/search",
      icon: require("@/assets/images/search.png"),
    },
    {
      key: "storage",
      href: "/(app)/storage",
      icon: require("@/assets/images/star.png"),
    },
    {
      key: "mypage",
      href: "/(app)/mypage",
      icon: require("@/assets/images/mypage.png"),
    },
  ] as const;

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => router.replace(item.href)}
          >
            <Image
              source={item.icon}
              style={[styles.icon, active !== item.key && styles.inactive]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 24,
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
  icon: { width: 24, height: 24 },
  inactive: { opacity: 0.35 },
});
