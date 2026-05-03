import { View, Text, StyleSheet } from "react-native";

interface GradeBadgeCardProps {
  icon: string;
  label: string;
  title: string;
  bgColor: string;
  textColor: string;
  size?: "sm" | "md";
}

export default function GradeBadgeCard({
  icon,
  label,
  title,
  bgColor,
  textColor,
  size = "md",
}: GradeBadgeCardProps) {
  const sm = size === "sm";
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor },
        sm && styles.containerSm,
      ]}
    >
      <Text style={[styles.icon, sm && styles.iconSm]}>{icon}</Text>
      <Text style={[styles.text, { color: textColor }, sm && styles.textSm]}>
        {label}-{title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  containerSm: {
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "center",
  },
  icon: { fontSize: 24 },
  iconSm: { fontSize: 15 },
  text: { fontSize: 16, fontWeight: "600" },
  textSm: { fontSize: 13 },
});
