import { ScrollView, View, Text, StyleSheet, Linking, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";
import { showNotice } from "@/lib/dialog";

// 사업자 정보 — 「전자상거래법」 제10조 사업자 정보 표시 + 문의처.
// 무료 서비스(통신판매 행위 없음)라 통신판매업 신고·전화번호 표시 의무 없음.
const CONTACT_EMAIL = "mongle.help@gmail.com";

async function openContactEmail(): Promise<void> {
  try {
    await Linking.openURL(`mailto:${CONTACT_EMAIL}`);
  } catch {
    // 로그인 없이 열리는 공개 페이지 — 웹 노출이 잦다. Alert.alert 는
    // react-native-web 에서 빈 함수라 인앱 다이얼로그로 알려야 한다.
    showNotice(
      "메일 앱을 열 수 없어요",
      `아래 주소로 문의해 주세요.\n\n${CONTACT_EMAIL}`,
    );
  }
}

export default function BusinessScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "사업자 정보", headerShown: false }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>사업자 정보</Text>
        <Text style={styles.meta}>
          「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 사업자 정보를
          안내합니다.
        </Text>

        <View style={styles.card}>
          <Row label="상호" value="몽글 (Mongle)" />
          <Row label="대표자" value="박지은" />
          <Row label="사업자등록번호" value="213-07-26662" />
          <Row
            label="사업장 소재지"
            value="서울특별시 구로구 개봉로6길 5-2"
            last
          />
        </View>
        <Text style={styles.exempt}>
          본 서비스는 통신판매 행위가 없어 통신판매업 신고 대상이 아닙니다.
        </Text>

        <Section title="문의">
          <P>
            서비스 이용 관련 문의·불편 사항은 아래 이메일로 연락해 주세요.
            평일 기준 순차적으로 답변드립니다.
          </P>
          <TouchableOpacity
            onPress={openContactEmail}
            activeOpacity={0.7}
          >
            <Text style={styles.link}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>
        </Section>

        <Text style={styles.small}>
          개인정보 처리에 관한 사항은 「개인정보처리방침」을, 서비스 이용 조건은
          「이용약관」을 참고해 주세요.
        </Text>
      </ScrollView>
    </>
  );
}

function Row({
  label,
  value,
  muted,
  last,
}: {
  label: string;
  value: string;
  muted?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last ? styles.rowLast : null]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, muted ? styles.rowValueMuted : null]}>
        {value}
      </Text>
    </View>
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
  card: {
    borderWidth: 1,
    borderColor: "#E2D8F0",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  exempt: { fontSize: 12, color: "#A898D0", lineHeight: 18, marginBottom: 24 },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE6F8",
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    width: 110,
    fontSize: 13,
    fontWeight: "700",
    color: "#5C4A7A",
    lineHeight: 20,
  },
  rowValue: { flex: 1, fontSize: 13, color: "#3D3240", lineHeight: 20 },
  rowValueMuted: { color: "#A092B8" },
  section: { marginBottom: 20 },
  h2: { fontSize: 16, fontWeight: "700", color: "#3D2B5E", marginBottom: 10 },
  p: { fontSize: 14, lineHeight: 22, color: "#3D3240", marginBottom: 8 },
  link: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7868C8",
    textDecorationLine: "underline",
  },
  small: { fontSize: 12, color: "#6B5C82", lineHeight: 19 },
});
