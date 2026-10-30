import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import ScreenHeader from "@/components/ui/ScreenHeader";

// 개인정보 처리방침 — Google Play Console "데이터 안전" 섹션 및 마켓 등록 시 URL 로 제출.
// 시행일/연락처 등 [   ] 자리는 운영 정보 확정되면 채워 넣어야 함.
export default function PrivacyScreen() {
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: "개인정보 처리방침", headerShown: false }} />
      <ScreenHeader title="개인정보처리방침" maxWidth={760} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>몽글 개인정보처리방침</Text>
        <Text style={styles.meta}>
          몽글(이하 "회사")은 정보주체의 개인정보를 중요시하며, 「개인정보
          보호법」을 준수합니다. 회사는 본 방침을 통해 수집하는 개인정보의 항목,
          이용 목적, 보유 기간 등을 안내합니다. 본 방침은 2026년 11월 6일부터
          시행됩니다.
        </Text>

        <Section n="1" title="개인정보의 처리 목적">
          <P>회사는 다음의 목적을 위하여 개인정보를 처리합니다.</P>
          <Bullet label="회원 가입 및 관리">
            카카오 로그인 또는 이메일 가입 기반 회원 식별, 부정 이용 방지
          </Bullet>
          <Bullet label="서비스 제공">
            꿈 일기 작성·저장, 운세 제공, AI 기반 해몽 및 챗봇 응답
          </Bullet>
          <Bullet label="서비스 개선">
            통계 분석, 신규 기능 개발, 오류 진단
          </Bullet>
        </Section>

        <Section n="2" title="수집하는 개인정보 항목 및 수집 방법">
          <P>서비스 이용 과정에서 다음 정보가 수집됩니다.</P>
          <Bullet label="카카오 로그인 가입 시 (필수)">
            닉네임, 프로필 사진, 카카오 회원번호 — 카카오 계정의 이메일은
            제공받지 않습니다.
          </Bullet>
          <Bullet label="이메일 가입 시 (필수)">
            이메일 주소, 비밀번호 — 비밀번호는 인증 서비스(Supabase Auth)가
            단방향 암호화하여 저장하며, 회사는 원문을 확인할 수 없습니다.
          </Bullet>
          <Bullet label="서비스 이용 시">
            꿈 일기 본문, 보관함에 저장한 챗봇 대화 내역, 운세 조회 기록, AI
            응답 신고 내역, 직접 등록한 프로필 사진
          </Bullet>
          <Bullet label="AI 챗봇 이용 시">
            입력한 꿈 대화 내용과 닉네임이 응답 생성을 위해 제5조·제6조의
            수탁사로 전송됩니다. 보관함에 저장하지 않은 대화는 회사 서버에
            저장하지 않습니다.
          </Bullet>
          <Bullet label="선택 수집">
            위치 정보 (대략적 위치) — 홈 화면의 날씨·일출 연출에만 사용합니다.
            좌표는 날씨·일출 조회를 위해 제5조의 수탁사로 전송되며 별도로
            저장하지 않습니다. 권한을 거부해도 서비스 이용에 제한이 없습니다.
          </Bullet>
          <Bullet label="자동 생성 정보">
            접속 IP, 접속 로그, 기기·OS·앱 버전 정보. 꿈 사전 검색어는 계정과
            연결하지 않고 통계 목적으로만 저장합니다.
          </Bullet>
          <P>
            수집 방법: 카카오 로그인 시 카카오로부터 제공받거나, 사용자가 앱
            내에서 직접 입력하며, 일부 정보는 서비스 이용 중 자동으로
            수집됩니다.
          </P>
        </Section>

        <Section n="3" title="개인정보의 처리 및 보유 기간">
          <P>
            원칙적으로 회원 탈퇴 시 지체 없이 파기합니다. 단, 관계 법령에 따라
            보관이 필요한 경우 해당 기간 동안 보관합니다.
          </P>
          <Bullet label="로그인 기록">3개월 (통신비밀보호법)</Bullet>
        </Section>

        <Section n="4" title="개인정보의 제3자 제공">
          <P>
            회사는 정보주체의 개인정보를 본 방침 제1조에서 명시한 범위 내에서만
            처리하며, 정보주체의 동의 없이 제3자에게 제공하지 않습니다.
          </P>
        </Section>

        <Section n="5" title="개인정보 처리업무의 위탁">
          <P>회사는 원활한 서비스 제공을 위하여 다음과 같이 위탁합니다.</P>
          <Table
            rows={[
              ["Supabase Inc.", "회원 인증, 회원 정보 및 콘텐츠 저장·관리 (미국)"],
              [
                "Google LLC",
                "AI 해몽 및 챗봇 응답 생성 — Gemini API, 꿈 대화 내용·닉네임 전송 (미국)",
              ],
              [
                "Vercel Inc.",
                "API 서버 운영 — 챗봇 요청 중계, 회원 탈퇴 처리, IP 기반 대략적 위치로 날씨 조회 (미국)",
              ],
              [
                "650 Industries, Inc. (Expo)",
                "앱 업데이트 배포 서버 — 업데이트 확인 시 IP·기기·앱 버전 정보 전송 (미국)",
              ],
              ["Kakao Corp.", "소셜 로그인 인증 (대한민국)"],
              ["Open-Meteo", "일출·일몰 시각 조회 — 대략적 좌표 전송 (독일)"],
              [
                "기상청 (공공데이터포털)",
                "실시간 강수 조회 — 5km 격자 변환값 전송 (대한민국)",
              ],
            ]}
          />
          <P style={styles.small}>
            위탁계약 체결 시 「개인정보 보호법」에 따라 위탁업무 수행 목적 외
            개인정보 처리 금지, 기술적·관리적 보호조치 등을 명시합니다.
          </P>
        </Section>

        <Section n="6" title="개인정보의 국외 이전">
          <P>
            회사는 서비스 제공을 위하여 아래와 같이 개인정보를 국외로
            이전합니다. 이전은 서비스 이용 시점에 정보통신망을 통해 암호화
            전송(HTTPS/TLS)하는 방식으로 이루어집니다.
          </P>
          {TRANSFERS.map((t) => (
            <View key={t.to} style={styles.transfer}>
              <Text style={styles.transferTitle}>{t.to}</Text>
              <Bullet label="국가">{t.country}</Bullet>
              <Bullet label="연락처">{t.contact}</Bullet>
              <Bullet label="이전 항목">{t.items}</Bullet>
              <Bullet label="이전 목적">{t.purpose}</Bullet>
              <Bullet label="보유·이용 기간">{t.retention}</Bullet>
            </View>
          ))}
          <Bullet label="거부 방법 및 불이익">
            국외 이전을 원하지 않으면 가입 시 동의하지 않거나 [마이페이지 &gt;
            설정 &gt; 회원 탈퇴]로 이전을 중단할 수 있습니다. 회원 정보 저장과
            AI 해몽은 위 수탁사 없이 제공할 수 없어, 거부 시 서비스를 이용할 수
            없습니다. 위치 정보는 기기 설정에서 위치 권한을 거부하면 전송되지
            않으며, 이 경우에도 서비스 이용에 제한이 없습니다.
          </Bullet>
        </Section>

        <Section n="7" title="만 14세 미만 아동의 개인정보">
          <P>
            서비스는 만 14세 이상만 가입할 수 있으며, 회사는 만 14세 미만
            아동의 개인정보를 수집하지 않습니다. 가입 시 만 14세 이상임을
            확인하며, 만 14세 미만 아동의 가입 사실이 확인되면 해당 계정과
            개인정보를 지체 없이 삭제합니다.
          </P>
        </Section>

        <Section n="8" title="정보주체의 권리·의무 및 행사방법">
          <P>정보주체는 다음 권리를 행사할 수 있습니다.</P>
          <Bullet label="열람">개인정보 열람 요구</Bullet>
          <Bullet label="정정">오류 등이 있을 경우 정정 요구</Bullet>
          <Bullet label="삭제">삭제 요구</Bullet>
          <Bullet label="처리 정지">처리 정지 요구</Bullet>
          <Bullet label="회원 탈퇴">
            앱 내 [마이페이지 &gt; 설정 &gt; 회원 탈퇴]에서 직접 처리 가능.
            삭제 범위와 이메일 요청 방법은 [계정 및 데이터 삭제 안내]
            페이지에서 확인할 수 있습니다.
          </Bullet>
          <P>
            권리 행사는 앱 내 기능 또는 아래 개인정보 보호책임자에게 이메일로
            요청하실 수 있습니다.
          </P>
        </Section>

        <Section n="9" title="개인정보의 파기">
          <P>회원 탈퇴 또는 보유 기간 경과 시 지체 없이 파기합니다.</P>
          <Bullet label="전자적 파일">복원 불가능한 방법으로 영구 삭제</Bullet>
          <Bullet label="종이 문서">분쇄 또는 소각</Bullet>
        </Section>

        <Section n="10" title="개인정보의 안전성 확보 조치">
          <Bullet label="전송 구간 암호화">HTTPS/TLS 적용</Bullet>
          <Bullet label="접근 권한 관리">
            Supabase Row Level Security 기반 데이터베이스 접근 제어
          </Bullet>
          <Bullet label="비밀번호 암호화">
            이메일 가입자의 비밀번호는 단방향 암호화하여 저장
          </Bullet>
          <Bullet label="로그 보호">접근 로그 보관 및 위변조 방지</Bullet>
        </Section>

        <Section n="11" title="행태정보의 수집·이용">
          <P>
            회사는 맞춤형 광고를 위한 행태정보를 수집하지 않으며, 광고 식별자를
            이용하지 않습니다.
          </P>
        </Section>

        <Section n="12" title="개인정보 보호책임자">
          <P>
            개인정보 처리에 관한 문의·불만 처리·피해 구제 등은 아래 연락처로
            요청하실 수 있습니다.
          </P>
          <Bullet label="개인정보 보호책임자">박지은</Bullet>
          <Bullet label="이메일">mongle.help@gmail.com</Bullet>
        </Section>

        <Section n="13" title="권익침해 구제방법">
          <P>정보주체는 아래 기관에 문의하실 수 있습니다.</P>
          <Bullet label="개인정보분쟁조정위원회">
            1833-6972 (www.kopico.go.kr)
          </Bullet>
          <Bullet label="개인정보침해신고센터">118 (privacy.kisa.or.kr)</Bullet>
          <Bullet label="대검찰청 사이버수사과">1301 (www.spo.go.kr)</Bullet>
          <Bullet label="경찰청 사이버수사국">182 (ecrm.cyber.go.kr)</Bullet>
        </Section>

        <Section n="14" title="개인정보처리방침의 변경">
          <P>
            본 방침은 시행일로부터 적용되며, 변경 내용이 있을 경우 시행 7일
            전부터 공지사항을 통하여 공지합니다.
          </P>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>공고일자: 2026년 10월 30일</Text>
          <Text style={styles.footerText}>시행일자: 2026년 11월 6일</Text>
          <Text style={styles.footerText}>
            이전 방침: 2026년 6월 23일 ~ 2026년 11월 5일 적용
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// 제6조 국외 이전 — 제5조 위탁 표의 국외 수탁사와 같은 목록이어야 한다.
// 수탁사를 추가·변경하면 두 곳을 같이 고친다.
const TRANSFERS: {
  to: string;
  country: string;
  contact: string;
  items: string;
  purpose: string;
  retention: string;
}[] = [
  {
    to: "Supabase Inc.",
    country: "미국",
    contact: "supabase.com (개인정보 문의 창구)",
    items:
      "닉네임, 프로필 사진, 카카오 회원번호, 이메일 주소·암호화된 비밀번호(이메일 가입자), 꿈 일기, 저장한 챗봇 대화, 운세 기록, AI 응답 신고 내역, 접속 로그",
    purpose: "회원 인증, 회원 정보 및 콘텐츠 저장·관리",
    retention: "회원 탈퇴 시까지 (접속 로그는 3개월)",
  },
  {
    to: "Google LLC",
    country: "미국",
    contact: "policies.google.com (개인정보 문의 창구)",
    items: "챗봇에 입력한 꿈 대화 내용, 닉네임",
    purpose: "AI 해몽 및 챗봇 응답 생성 (Gemini API)",
    retention:
      "응답 생성 후 회사는 보관을 요청하지 않으며, Google의 API 약관이 정한 기간 동안만 보관",
  },
  {
    to: "Vercel Inc.",
    country: "미국",
    contact: "vercel.com (개인정보 문의 창구)",
    items: "챗봇 대화 내용·닉네임(중계), 인증 토큰, 접속 IP, 대략적 위치 좌표",
    purpose: "API 서버 운영 — 챗봇 요청 중계, 회원 탈퇴 처리, 날씨 조회",
    retention: "요청 처리 즉시 파기 (서버 접속 로그는 Vercel 보관 정책에 따름)",
  },
  {
    to: "650 Industries, Inc. (Expo)",
    country: "미국",
    contact: "expo.dev (개인정보 문의 창구)",
    items: "접속 IP, 기기·OS·앱 버전 정보",
    purpose: "앱 업데이트 확인 및 배포",
    retention: "Expo 서비스 약관이 정한 기간",
  },
  {
    to: "Open-Meteo",
    country: "독일",
    contact: "open-meteo.com",
    items: "대략적 위치 좌표",
    purpose: "일출·일몰 시각 조회",
    retention: "요청 처리 즉시 파기 (회사는 저장을 요청하지 않음)",
  },
];

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

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHead]}>
        <Text style={[styles.tableCell, styles.tableCellHead, { flex: 1 }]}>
          수탁사
        </Text>
        <Text style={[styles.tableCell, styles.tableCellHead, { flex: 2 }]}>
          위탁 업무
        </Text>
      </View>
      {rows.map(([who, what], i) => (
        <View
          key={i}
          style={[
            styles.tableRow,
            i === rows.length - 1 ? styles.tableRowLast : null,
          ]}
        >
          <Text style={[styles.tableCell, { flex: 1 }]}>{who}</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>{what}</Text>
        </View>
      ))}
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
  small: { fontSize: 12, color: "#6B5C82", lineHeight: 19 },
  bulletRow: { flexDirection: "row", marginBottom: 6, paddingLeft: 4 },
  bulletDot: {
    fontSize: 14,
    color: "#7868C8",
    width: 14,
    lineHeight: 22,
  },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 22, color: "#3D3240" },
  bulletLabel: { fontWeight: "700", color: "#3D2B5E" },
  table: {
    borderWidth: 1,
    borderColor: "#E2D8F0",
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2D8F0",
  },
  tableRowLast: { borderBottomWidth: 0 },
  tableHead: { backgroundColor: "#F1EBFB" },
  tableCell: {
    padding: 10,
    fontSize: 13,
    color: "#3D3240",
    lineHeight: 19,
  },
  tableCellHead: { fontWeight: "700", color: "#3D2B5E" },
  transfer: {
    borderWidth: 1,
    borderColor: "#E2D8F0",
    borderRadius: 10,
    padding: 12,
    paddingBottom: 6,
    marginVertical: 6,
  },
  transferTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2B5E",
    marginBottom: 6,
  },
  footer: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2D8F0",
  },
  footerText: { fontSize: 12, color: "#6B5C82", marginBottom: 4 },
});
