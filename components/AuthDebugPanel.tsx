import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

// ⚠️ 임시 진단 패널 — 세션이 앱 재시작 후 유지되지 않는 원인을 기기에서 확인하려고
// 붙였다. 원인 확정되면 이 파일과 LoginForm 의 사용처를 함께 제거할 것.
//
// 확인하려는 것: 로그인 후 앱을 완전히 종료했다가 다시 열었을 때
//   1) AsyncStorage 에 supabase 세션 키가 실제로 남아 있는가
//   2) getSession() 이 그걸 읽어오는가
// 둘이 어긋나는 지점이 곧 원인이다.

type Probe = {
  keys: string[];
  tokenKey: string | null;
  tokenLen: number | null;
  sessionUser: string | null;
  sessionErr: string | null;
  storageErr: string | null;
};

export default function AuthDebugPanel() {
  const [p, setP] = useState<Probe | null>(null);

  useEffect(() => {
    (async () => {
      const probe: Probe = {
        keys: [],
        tokenKey: null,
        tokenLen: null,
        sessionUser: null,
        sessionErr: null,
        storageErr: null,
      };
      try {
        const keys = await AsyncStorage.getAllKeys();
        probe.keys = [...keys];
        const tk = keys.find((k) => k.includes("auth-token"));
        probe.tokenKey = tk ?? null;
        if (tk) {
          const v = await AsyncStorage.getItem(tk);
          probe.tokenLen = v ? v.length : 0;
        }
      } catch (e) {
        probe.storageErr = e instanceof Error ? e.message : String(e);
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        probe.sessionUser = data.session?.user?.id?.slice(0, 8) ?? null;
        probe.sessionErr = error?.message ?? null;
      } catch (e) {
        probe.sessionErr = e instanceof Error ? e.message : String(e);
      }
      setP(probe);
    })();
  }, []);

  if (!p) return null;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>[진단] 세션 상태</Text>
      <Text style={styles.line}>스토리지 키 {p.keys.length}개</Text>
      <Text style={styles.line}>
        auth-token 키: {p.tokenKey ? `있음 (${p.tokenLen}자)` : "없음"}
      </Text>
      <Text style={styles.line}>
        getSession: {p.sessionUser ? `세션 있음 ${p.sessionUser}` : "null"}
      </Text>
      {p.sessionErr ? (
        <Text style={styles.err}>세션 에러: {p.sessionErr}</Text>
      ) : null}
      {p.storageErr ? (
        <Text style={styles.err}>스토리지 에러: {p.storageErr}</Text>
      ) : null}
      <Text style={styles.keys} numberOfLines={4}>
        {p.keys.join(", ") || "(키 없음)"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: 1,
    borderColor: "#C9BBE4",
  },
  title: { fontSize: 12, fontWeight: "700", color: "#3D2B5E", marginBottom: 4 },
  line: { fontSize: 11, color: "#3D3240", lineHeight: 17 },
  err: { fontSize: 11, color: "#B3261E", lineHeight: 17 },
  keys: { fontSize: 9, color: "#6B5C82", marginTop: 4 },
});
