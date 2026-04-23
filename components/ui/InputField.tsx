import { View, TextInput, StyleSheet } from "react-native";
import { forwardRef } from "react";

interface InputFieldProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
  keyboardType?: "default" | "email-address" | "numeric";
}

const InputField = forwardRef<any, InputFieldProps>(
  (
    {
      placeholder,
      value,
      onChangeText,
      autoCapitalize = "none",
      maxLength,
      keyboardType = "default",
    },
    ref,
  ) => {
    return (
      <TextInput
        ref={ref}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#C4B8D6"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        keyboardType={keyboardType}
      />
    );
  },
);

InputField.displayName = "InputField";
export default InputField;

const styles = StyleSheet.create({
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#3D3240",
    borderWidth: 1.5,
    borderColor: "#EDE9F0",
  },
});
