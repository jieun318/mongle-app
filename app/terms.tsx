import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import ScreenHeader from "@/components/ui/ScreenHeader";

// 이용약관 — 마켓 등록 시 URL 로 제출(선택), 인앱 [마이페이지 > 약관 및 정책]에서 접근.
// 결제/구독 기능 도입 시 제8조(유료서비스) 보강 필요.
export default function TermsScreen() {
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: "이용약관", headerShown: false }} />
      <ScreenHeader title="이용약관" maxWidth={760} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>몽글 서비스 이용약관</Text>
        <Text style={styles.meta}>
          본 약관은 몽글(이하 "회사")이 제공하는 운세·꿈 해몽·AI 챗봇 서비스(이하
          "서비스")의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항을
          규정합니다. 본 약관은 2026년 6월 23일부터 시행됩니다.
        </Text>

        <Section n="1" title="목적">
          <P>
            본 약관은 이용자가 서비스를 이용함에 있어 회사와 이용자 간의
            이용조건 및 절차, 권리·의무 및 책임사항을 정함을 목적으로 합니다.
          </P>
        </Section>

        <Section n="2" title="용어의 정의">
          <Bullet label="서비스">
            기기 종류와 무관하게 이용자가 이용할 수 있는 몽글 및 관련 제반 서비스
          </Bullet>
          <Bullet label="이용자">
            본 약관에 따라 서비스를 이용하는 회원 및 비회원
          </Bullet>
          <Bullet label="회원">
            소셜 로그인(카카오 등)으로 가입하여 서비스를 이용하는 자
          </Bullet>
          <Bullet label="콘텐츠">
            이용자가 작성한 꿈 일기, 챗봇 대화 등 서비스 내 게시·저장한 정보
          </Bullet>
        </Section>

        <Section n="3" title="약관의 게시와 개정">
          <P>
            회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 앱 내에
            게시합니다.
          </P>
          <P>
            회사는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호
            등에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 본 약관을
            개정할 수 있으며, 개정 시 시행일 및 개정 사유를 명시하여 시행일 7일
            전부터 공지합니다. 이용자에게 불리한 개정의 경우 30일 전부터
            공지합니다.
          </P>
        </Section>

        <Section n="4" title="이용계약의 체결">
          <P>
            이용계약은 이용자가 본 약관에 동의하고 소셜 로그인을 통해 가입을
            완료함으로써 체결됩니다.
          </P>
          <P>
            회사는 다음 각 호에 해당하는 경우 가입을 거부하거나 사후에
            이용계약을 해지할 수 있습니다.
          </P>
          <Bullet label="타인 명의 도용">실명이 아니거나 타인의 정보를 이용한 경우</Bullet>
          <Bullet label="허위 정보 기재">등록 내용에 허위·기재 누락·오기가 있는 경우</Bullet>
          <Bullet label="법령·약관 위반">부정한 목적으로 서비스를 이용하려는 경우</Bullet>
        </Section>

        <Section n="5" title="서비스의 제공 및 변경">
          <P>회사는 이용자에게 다음과 같은 서비스를 제공합니다.</P>
          <Bullet label="운세 제공">시드 기반 일일 운세 및 카테고리별 운세</Bullet>
          <Bullet label="꿈 해몽">꿈 일기 작성·저장 및 해몽 정보 제공</Bullet>
          <Bullet label="AI 챗봇">AI 기반 해몽·상담 대화 기능</Bullet>
          <P>
            서비스의 내용은 운영상·기술상 필요에 따라 변경될 수 있으며, 변경 시
            그 내용을 사전에 공지합니다.
          </P>
        </Section>

        <Section n="6" title="서비스의 중단">
          <P>
            회사는 컴퓨터 등 정보통신설비의 보수점검·교체·고장, 통신 두절 또는
            운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수
            있습니다.
          </P>
          <P>
            천재지변, 비상사태, 제3자 서비스(Supabase, Google 등)의 장애 등
            회사가 통제할 수 없는 사유로 인한 서비스 중단에 대하여 회사는 고의
            또는 중대한 과실이 없는 한 책임을 지지 않습니다.
          </P>
        </Section>

        <Section n="7" title="콘텐츠의 권리와 관리">
          <P>
            이용자가 서비스 내에 작성한 콘텐츠에 대한 권리와 책임은 작성한
            이용자에게 있습니다.
          </P>
          <P>
            회사는 이용자가 게시·저장한 콘텐츠가 다음 각 호에 해당하는 경우 사전
            통지 없이 삭제하거나 접근을 제한할 수 있습니다.
          </P>
          <Bullet label="권리 침해">타인의 명예·권리를 침해하거나 비방하는 내용</Bullet>
          <Bullet label="불법 정보">법령에 위반되거나 공서양속에 반하는 내용</Bullet>
          <Bullet label="서비스 방해">서비스의 정상적 운영을 방해하는 내용</Bullet>
        </Section>

        <Section n="8" title="유료서비스">
          <P>
            현재 서비스는 무료로 제공됩니다. 회사가 향후 구독·광고 등 유료
            서비스를 도입하는 경우, 요금·결제 방법·청약철회 및 환불 기준 등을
            별도로 고지하고 이용자의 동의를 받습니다.
          </P>
        </Section>

        <Section n="9" title="이용자의 의무">
          <P>이용자는 다음 행위를 하여서는 안 됩니다.</P>
          <Bullet label="정보 도용">타인의 정보 도용 또는 부정 사용</Bullet>
          <Bullet label="시스템 침해">서비스의 비정상적 이용, 자동화 접근, 역설계</Bullet>
          <Bullet label="권리 침해">회사·타인의 지식재산권 침해</Bullet>
          <Bullet label="운영 방해">서비스 운영을 고의로 방해하는 행위</Bullet>
        </Section>

        <Section n="10" title="면책조항">
          <P>
            회사가 제공하는 운세·꿈 해몽·AI 챗봇 응답은 오락 및 정보 제공을
            목적으로 하며, 의학적·법률적·재정적 조언을 대체하지 않습니다.
            이용자가 해당 정보에 기반하여 내린 판단과 그 결과에 대한 책임은
            이용자 본인에게 있습니다.
          </P>
          <P>
            회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을
            지지 않으며, 이용자가 서비스를 통해 기대하는 수익을 얻지 못하거나
            서비스를 통해 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.
          </P>
        </Section>

        <Section n="11" title="계약 해지 및 이용 제한">
          <P>
            이용자는 언제든지 앱 내 [마이페이지 &gt; 회원 탈퇴]를 통해
            이용계약을 해지할 수 있으며, 탈퇴 시 관련 법령 및 개인정보처리방침에
            따라 콘텐츠가 처리됩니다.
          </P>
          <P>
            회사는 이용자가 본 약관을 위반하는 경우 사전 통지 후 서비스 이용을
            제한하거나 이용계약을 해지할 수 있습니다.
          </P>
        </Section>

        <Section n="12" title="개인정보의 보호">
          <P>
            회사는 이용자의 개인정보를 보호하기 위하여 노력하며, 개인정보의
            수집·이용·보관 등에 관한 사항은 별도의 개인정보처리방침에 따릅니다.
          </P>
        </Section>

        <Section n="13" title="준거법 및 재판관할">
          <P>
            본 약관은 대한민국 법령에 따라 규율되고 해석되며, 서비스 이용과
            관련하여 회사와 이용자 간 분쟁이 발생한 경우 민사소송법상의 관할
            법원을 제1심 관할 법원으로 합니다.
          </P>
        </Section>

        <Section n="14" title="문의처">
          <P>
            본 약관 및 서비스 이용에 관한 문의는 아래 연락처로 요청하실 수
            있습니다.
          </P>
          <Bullet label="운영자">박지은</Bullet>
          <Bullet label="이메일">mongle.help@gmail.com</Bullet>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>공고일자: 2026년 6월 23일</Text>
          <Text style={styles.footerText}>시행일자: 2026년 6월 23일</Text>
        </View>
      </ScrollView>
    </View>
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
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 64,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  h1: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3D2B5E",
    marginBottom: 12,
  },
  meta: {
    fontSize: 14,
    lineHeight: 22,
    color: "#5C4A7A",
    marginBottom: 24,
  },
  section: { marginBottom: 24 },
  h2: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3D2B5E",
    marginBottom: 10,
  },
  p: {
    fontSize: 14,
    lineHeight: 22,
    color: "#3D3240",
    marginBottom: 8,
  },
  bulletRow: { flexDirection: "row", marginBottom: 6, paddingLeft: 4 },
  bulletDot: {
    fontSize: 14,
    color: "#7868C8",
    width: 14,
    lineHeight: 22,
  },
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
