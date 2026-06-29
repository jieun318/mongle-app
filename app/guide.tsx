import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

// 이용 안내 — 마이페이지 > 약관 및 정보 에서 접근. 기능별 사용법 안내.
export default function GuideScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "이용 안내", headerShown: false }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>이용 안내</Text>
        <Text style={styles.meta}>
          몽글의 주요 기능과 사용 방법을 안내합니다.
        </Text>

        <Section n="1" title="오늘의 운세 보기">
          <Bullet label="구슬 탭">
            홈 화면의 구슬을 탭하면 오늘의 운세 모달이 열려요.
          </Bullet>
          <Bullet label="카테고리 운세">
            종합운과 함께 연애·직장·금전·건강·대인 5개 카테고리 점수를 볼 수 있어요.
          </Bullet>
          <Bullet label="지난 운세">
            마이페이지 &gt; 지난 운세 보기에서 이전 기록을 다시 볼 수 있어요.
          </Bullet>
        </Section>

        <Section n="2" title="꿈 해몽 검색·기록">
          <Bullet label="검색">
            검색 탭에서 카테고리나 키워드로 꿈의 의미를 찾아볼 수 있어요.
          </Bullet>
          <Bullet label="기록">
            꿈을 직접 작성해 저장하고, 나중에 수정·삭제할 수 있어요.
          </Bullet>
        </Section>

        <Section n="3" title="AI 챗봇">
          <Bullet label="대화 시작">
            챗봇에게 꿈이나 고민을 이야기하면 AI가 함께 풀어드려요.
          </Bullet>
          <P style={styles.small}>
            AI 응답은 정보 제공 목적이며, 전문적인 의학·법률·재정 조언을
            대체하지 않습니다.
          </P>
        </Section>

        <Section n="4" title="보관함">
          <Bullet label="모아 보기">
            저장한 꿈 해몽과 챗봇 대화 기록을 보관함에서 한눈에 볼 수 있어요.
          </Bullet>
        </Section>

        <Section n="5" title="알림 설정">
          <Bullet label="아침 운세 알림">
            설정에서 매일 받을 운세 알림 시간을 지정할 수 있어요.
          </Bullet>
        </Section>

        <Section n="6" title="계정 관리">
          <Bullet label="프로필 편집">
            마이페이지 &gt; 프로필 편집에서 닉네임·프로필 사진을 바꿀 수 있어요.
          </Bullet>
          <Bullet label="로그아웃 / 회원 탈퇴">
            설정 화면에서 로그아웃하거나 회원 탈퇴를 할 수 있어요. 탈퇴 시 데이터는
            개인정보처리방침에 따라 처리됩니다.
          </Bullet>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            더 궁금한 점은 「사업자 정보」의 문의 이메일로 연락해 주세요.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>
        {n}. {title}
      </Text>
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
  small: { fontSize: 12, color: "#6B5C82", lineHeight: 19 },
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
