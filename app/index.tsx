import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSession } from "@/features/auth/auth";

export default function Index() {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace("/(app)");
    } else {
      router.replace("/(auth)/login");
    }
  }, [session, loading]);

  return (
    <LinearGradient
      colors={["#E8DEFF", "#EEF6FF", "#FFF8E7"]}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <ActivityIndicator color="#7B6A9E" />
      <View />
    </LinearGradient>
  );
}
