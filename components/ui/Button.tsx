import { TouchableOpacity, Text, StyleSheet } from "react-native";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}

export default function Button({
  label,
  onPress,
  variant = "primary",
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, variant === "secondary" && styles.secondary]}
      onPress={onPress}
    >
      <Text
        style={[styles.text, variant === "secondary" && styles.secondaryText]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
    backgroundColor: "#d8b4fe",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "#EDE8F5",
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
    color: "#615172",
  },
  secondaryText: {
    color: "#826c98",
  },
});
