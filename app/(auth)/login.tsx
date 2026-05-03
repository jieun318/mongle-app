import { ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LoginForm from "@/features/auth/components/LoginForm";

export default function LoginScreen() {
  return (
    <LinearGradient colors={["#E8DEFF", "#EEF6FF", "#FFF8E7"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-start", paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <LoginForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}