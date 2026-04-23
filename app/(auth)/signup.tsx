import { ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import SignupForm from "@/features/auth/components/SignupForm";
export default function SignupScreen() {
  return (
    <LinearGradient
      colors={["#EEE8F8", "#FFF9EC", "#FDFBF7"]}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <SignupForm />
      </ScrollView>
    </LinearGradient>
  );
}
