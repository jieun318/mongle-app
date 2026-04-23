import { ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LoginForm from "@/features/auth/components/LoginForm";

export default function LoginScreen() {
  return (
    <LinearGradient
      colors={["#EEE8F8", "#FFF9EC", "#FDFBF7"]}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <LoginForm />
      </ScrollView>
    </LinearGradient>
  );
}
