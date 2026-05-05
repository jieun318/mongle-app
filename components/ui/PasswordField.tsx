import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

interface PasswordFieldProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

export default function PasswordField({
  placeholder,
  value,
  onChangeText,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const Icon = showPassword ? EyeIcon : EyeOffIcon;

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#C4B8D6"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.eyeBtn}
        onPress={() => setShowPassword(!showPassword)}
        activeOpacity={0.7}
      >
        <Icon size={20} color="#9888CC" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EDE9F0",
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#3D3240",
  },
  eyeBtn: { padding: 4 },
});
