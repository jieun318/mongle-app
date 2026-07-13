import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import { Link } from "expo-router";

// 웹 루트(/) 랜딩 — 앱 셸이 아니라 "서비스를 설명하는 공개 웹사이트"여야 한다.
// Google Play 조직 웹사이트 인증은 심사자가 이 URL 을 직접 열어보고 조직 실재
// 여부를 확인하므로, 서비스 소개 + 사업자 정보 + 법적 고지 링크가 첫 화면에
// 보여야 한다. (정적 익스포트라 JS 없이도 HTML 에 그대로 담긴다)

const CONTACT_EMAIL = "mongle.help@gmail.com";

const FEATURES = [
  {
    emoji: "🔮",
    title: "오늘의 운세",
    body: "매일 구슬을 탭하면 종합운과 함께 연애·직장·금전·건강·대인 5가지 카테고리 운세를 확인할 수 있습니다.",
  },
  {
    emoji: "🌙",
    title: "꿈 해몽",
    body: "간밤의 꿈을 키워드로 검색하거나 직접 기록하고, 꿈 속 상징과 의미를 찾아볼 수 있습니다.",
  },
  {
    emoji: "💬",
    title: "AI 챗봇",
    body: "꿈이나 마음속 고민을 AI와 편하게 이야기하며 풀어볼 수 있습니다.",
  },
  {
    emoji: "📒",
    title: "보관함",
    body: "나의 꿈 해몽과 대화 기록을 한곳에 모아두고 언제든 다시 꺼내 볼 수 있습니다.",
  },
];

const BUSINESS_ROWS: [string, string][] = [
  ["상호", "몽글 (Mongle)"],
  ["대표자", "박지은"],
  ["사업자등록번호", "213-07-26662"],
  ["사업장 소재지", "서울특별시 구로구 개봉로6길 5-2"],
  ["문의", CONTACT_EMAIL],
];

export default function WebLanding({ hasSession }: { hasSession: boolean }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Image
          source={require("@/assets/images/mongle-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>몽글 (Mongle)</Text>
        <Text style={styles.tagline}>
          매일의 운세와 꿈, 그리고 마음 한 조각
        </Text>
        <Text style={styles.lede}>
          하루를 여는 작은 위로가 필요할 때, 몽글이 함께합니다. 오늘의 운세부터
          간밤의 꿈 해몽, AI와 나누는 다정한 대화까지 감성적인 무드로 잔잔하게
          담았습니다.
        </Text>

        <Link href={hasSession ? "/(app)" : "/(auth)/login"} style={styles.cta}>
          {hasSession ? "몽글 열기" : "몽글 시작하기"}
        </Link>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>주요 기능</Text>
        <View style={styles.grid}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.card}>
              <Text style={styles.cardEmoji}>{f.emoji}</Text>
              <Text style={styles.cardTitle}>{f.title}</Text>
              <Text style={styles.cardBody}>{f.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>사업자 정보</Text>
        <View style={styles.bizCard}>
          {BUSINESS_ROWS.map(([label, value], i) => (
            <View
              key={label}
              style={[
                styles.row,
                i === BUSINESS_ROWS.length - 1 ? styles.rowLast : null,
              ]}
            >
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.notice}>
        몽글의 운세·꿈 해몽·AI 응답은 오락 및 정보 제공을 목적으로 하며,
        의학적·법률적·재정적 조언을 대체하지 않습니다.
      </Text>

      <View style={styles.footer}>
        <View style={styles.footerLinks}>
          <Link href="/about" style={styles.footerLink}>
            앱 소개
          </Link>
          <Link href="/guide" style={styles.footerLink}>
            이용 안내
          </Link>
          <Link href="/privacy" style={styles.footerLink}>
            개인정보처리방침
          </Link>
          <Link href="/terms" style={styles.footerLink}>
            이용약관
          </Link>
          <Link href="/business" style={styles.footerLink}>
            사업자 정보
          </Link>
        </View>
        <Text style={styles.copy}>© 2026 몽글 (Mongle). All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF8FE" },
  container: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 64,
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
  },

  hero: { alignItems: "center", marginBottom: 56 },
  logo: { width: 160, height: 92, marginBottom: 8 },
  brand: {
    fontSize: 30,
    fontWeight: "700",
    color: "#3D2B5E",
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: { fontSize: 17, color: "#7868C8", marginBottom: 18 },
  lede: {
    fontSize: 15,
    lineHeight: 25,
    color: "#5C4A7A",
    textAlign: "center",
    maxWidth: 560,
    marginBottom: 28,
  },
  cta: {
    backgroundColor: "#7868C8",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    textAlign: "center",
    textDecorationLine: "none",
  },

  section: { marginBottom: 44 },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3D2B5E",
    marginBottom: 18,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  card: {
    flexGrow: 1,
    flexBasis: 240,
    borderWidth: 1,
    borderColor: "#E2D8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  cardEmoji: { fontSize: 24, marginBottom: 8 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3D2B5E",
    marginBottom: 6,
  },
  cardBody: { fontSize: 14, lineHeight: 22, color: "#5C4A7A" },

  bizCard: {
    borderWidth: 1,
    borderColor: "#E2D8F0",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE6F8",
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    width: 130,
    fontSize: 13,
    fontWeight: "700",
    color: "#5C4A7A",
    lineHeight: 20,
  },
  rowValue: { flex: 1, fontSize: 13, color: "#3D3240", lineHeight: 20 },

  notice: {
    fontSize: 12,
    lineHeight: 19,
    color: "#A092B8",
    marginBottom: 32,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E2D8F0",
    paddingTop: 20,
    gap: 12,
  },
  footerLinks: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  footerLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7868C8",
    textDecorationLine: "none",
  },
  copy: { fontSize: 12, color: "#A092B8" },
});
