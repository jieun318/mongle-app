import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (isLoggedIn === "true") {
        router.replace("/(app)");
      } else {
        router.replace("/(auth)/login");
      }
    };
    checkLogin();
  }, []);

  return null;
}
