import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

// 서비스 소개 — 마이페이지 > 약관 및 정보 에서 접근. 인앱 신뢰/소개용.
export default function AboutScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "서비스 소개", headerShown: false }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>몽글 소개</Text>
        <Text style={styles.meta}>
          몽글(Mongle)은 매일의 운세와 꿈 해몽, 그리고 AI 챗봇 대화를 감성적인
          무드로 담은 모바일 앱입니다. 하루를 여는 작은 위로와 호기심을 위한
          공간을 지향합니다.
        </Text>

        <Section title="이런 서비스예요">
          <Bullet label="오늘의 운세">
            매일 구슬을 탭하면 종합운과 연애·직장·금전·건강·대인 카테고리별 운세를
            확인할 수 있어요.
          </Bullet>
          <Bullet label="꿈 해몽">
            꿈을 검색하거나 직접 기록하고, 상징과 의미를 찾아볼 수 있어요.
          </Bullet>
          <Bullet label="AI 챗봇">
            꿈이나 고민을 AI와 편하게 이야기하며 풀어볼 수 있어요.
          </Bullet>
          <Bullet label="보관함">
            나의 해몽과 대화 기록을 모아두고 다시 볼 수 있어요.
          </Bullet>
        </Section>

        <Section title="이용 안내">
          <P>
            운세·꿈 해몽·AI 챗봇 응답은 오락 및 정보 제공을 목적으로 하며,
            의학적·법률적·재정적 조언을 대체하지 않습니다. 자세한 이용 방법은
            「이용 안내」를, 권리·의무 사항은 「이용약관」을 참고해 주세요.
          </P>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>몽글 (Mongle)</Text>
        </View>
      </ScrollView>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

function P({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <Text style={[styles.p, style]}>{children}</Text>;
}

function Bullet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>
        <Text style={styles.bulletLabel}>{label}</Text>
        {"  "}
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF8FE" },
  container: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 64,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  h1: { fontSize: 24, fontWeight: "700", color: "#3D2B5E", marginBottom: 12 },
  meta: { fontSize: 14, lineHeight: 22, color: "#5C4A7A", marginBottom: 24 },
  section: { marginBottom: 24 },
  h2: { fontSize: 16, fontWeight: "700", color: "#3D2B5E", marginBottom: 10 },
  p: { fontSize: 14, lineHeight: 22, color: "#3D3240", marginBottom: 8 },
  bulletRow: { flexDirection: "row", marginBottom: 6, paddingLeft: 4 },
  bulletDot: { fontSize: 14, color: "#7868C8", width: 14, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 22, color: "#3D3240" },
  bulletLabel: { fontWeight: "700", color: "#3D2B5E" },
  footer: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2D8F0",
  },
  footerText: { fontSize: 12, color: "#6B5C82", marginBottom: 4 },
});
