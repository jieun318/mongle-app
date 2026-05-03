import { ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import SignupForm from "@/features/auth/components/SignupForm";

export default function SignupScreen() {
  return (
    <LinearGradient
      colors={["#E8DEFF", "#EEF6FF", "#FFF8E7"]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-start",
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <SignupForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
