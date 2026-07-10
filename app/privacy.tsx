import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

// 개인정보 처리방침 — Google Play Console "데이터 안전" 섹션 및 마켓 등록 시 URL 로 제출.
// 시행일/연락처 등 [   ] 자리는 운영 정보 확정되면 채워 넣어야 함.
export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "개인정보 처리방침", headerShown: false }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>몽글 개인정보처리방침</Text>
        <Text style={styles.meta}>
          몽글(이하 "회사")은 정보주체의 개인정보를 중요시하며, 「개인정보
          보호법」을 준수합니다. 회사는 본 방침을 통해 수집하는 개인정보의 항목,
          이용 목적, 보유 기간 등을 안내합니다. 본 방침은 2026년 6월 23일부터
          시행됩니다.
        </Text>

        <Section n="1" title="개인정보의 처리 목적">
          <P>회사는 다음의 목적을 위하여 개인정보를 처리합니다.</P>
          <Bullet label="회원 가입 및 관리">
            카카오 OAuth 기반 회원 식별, 부정 이용 방지
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
          <Bullet label="회원 가입 시 (필수)">
            이메일 주소, 닉네임, 프로필 이미지 (카카오 계정 연동)
          </Bullet>
          <Bullet label="서비스 이용 시">
            꿈 일기 본문, 챗봇 대화 내역, 운세 조회 기록
          </Bullet>
          <Bullet label="선택 수집">
            위치 정보 (일출 시간 기반 콘텐츠 제공에만 사용, 외부 전송 없음)
          </Bullet>
          <Bullet label="자동 생성 정보">
            접속 IP, 접속 로그, 기기 정보, 광고 식별자(광고 기능 활성화 시)
          </Bullet>
          <P>
            수집 방법: 카카오 OAuth 로그인 시 카카오로부터 제공받거나, 사용자가
            앱 내에서 직접 입력하며, 일부 정보는 서비스 이용 중 자동으로
            수집됩니다.
          </P>
        </Section>

        <Section n="3" title="개인정보의 처리 및 보유 기간">
          <P>
            원칙적으로 회원 탈퇴 시 지체 없이 파기합니다. 단, 관계 법령에 따라
            보관이 필요한 경우 해당 기간 동안 보관합니다.
          </P>
          <Bullet label="계약·청약철회 기록">5년 (전자상거래법)</Bullet>
          <Bullet label="대금결제·재화공급 기록">5년 (전자상거래법)</Bullet>
          <Bullet label="소비자 불만·분쟁처리 기록">3년 (전자상거래법)</Bullet>
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
              ["Supabase Inc.", "회원 정보 및 콘텐츠 저장·관리 (미국)"],
              ["Google LLC", "AI 해몽 및 챗봇 응답 생성 — Gemini API (미국)"],
              ["Kakao Corp.", "소셜 로그인 인증 (대한민국)"],
            ]}
          />
          <P style={styles.small}>
            위탁계약 체결 시 「개인정보 보호법」에 따라 위탁업무 수행 목적 외
            개인정보 처리 금지, 기술적·관리적 보호조치 등을 명시합니다.
          </P>
        </Section>

        <Section n="6" title="정보주체의 권리·의무 및 행사방법">
          <P>정보주체는 다음 권리를 행사할 수 있습니다.</P>
          <Bullet label="열람">개인정보 열람 요구</Bullet>
          <Bullet label="정정">오류 등이 있을 경우 정정 요구</Bullet>
          <Bullet label="삭제">삭제 요구</Bullet>
          <Bullet label="처리 정지">처리 정지 요구</Bullet>
          <Bullet label="회원 탈퇴">
            앱 내 [마이페이지 &gt; 회원 탈퇴]에서 직접 처리 가능
          </Bullet>
          <P>
            권리 행사는 앱 내 기능 또는 아래 개인정보 보호책임자에게 이메일로
            요청하실 수 있습니다.
          </P>
        </Section>

        <Section n="7" title="개인정보의 파기">
          <P>회원 탈퇴 또는 보유 기간 경과 시 지체 없이 파기합니다.</P>
          <Bullet label="전자적 파일">복원 불가능한 방법으로 영구 삭제</Bullet>
          <Bullet label="종이 문서">분쇄 또는 소각</Bullet>
        </Section>

        <Section n="8" title="개인정보의 안전성 확보 조치">
          <Bullet label="전송 구간 암호화">HTTPS/TLS 적용</Bullet>
          <Bullet label="접근 권한 관리">
            Supabase Row Level Security 기반 데이터베이스 접근 제어
          </Bullet>
          <Bullet label="비밀번호 미저장">OAuth 인증 사용</Bullet>
          <Bullet label="로그 보호">접근 로그 보관 및 위변조 방지</Bullet>
        </Section>

        <Section n="9" title="행태정보의 수집·이용 및 거부">
          <P>
            본 서비스는 향후 광고 기능 활성화 시 광고 식별자(ADID/IDFA)를
            활용한 맞춤형 광고를 제공할 수 있으며, 정보주체는 기기 설정에서 광고
            식별자 재설정 또는 광고 추적 제한이 가능합니다.
          </P>
          <Bullet label="Android">설정 &gt; Google &gt; 광고 &gt; 광고 ID 재설정</Bullet>
          <Bullet label="iOS">설정 &gt; 개인정보 보호 및 보안 &gt; 추적</Bullet>
        </Section>

        <Section n="10" title="개인정보 보호책임자">
          <P>
            개인정보 처리에 관한 문의·불만 처리·피해 구제 등은 아래 연락처로
            요청하실 수 있습니다.
          </P>
          <Bullet label="개인정보 보호책임자">박지은</Bullet>
          <Bullet label="이메일">mongle.help@gmail.com</Bullet>
        </Section>

        <Section n="11" title="권익침해 구제방법">
          <P>정보주체는 아래 기관에 문의하실 수 있습니다.</P>
          <Bullet label="개인정보분쟁조정위원회">
            1833-6972 (www.kopico.go.kr)
          </Bullet>
          <Bullet label="개인정보침해신고센터">118 (privacy.kisa.or.kr)</Bullet>
          <Bullet label="대검찰청 사이버수사과">1301 (www.spo.go.kr)</Bullet>
          <Bullet label="경찰청 사이버수사국">182 (ecrm.cyber.go.kr)</Bullet>
        </Section>

        <Section n="12" title="개인정보처리방침의 변경">
          <P>
            본 방침은 시행일로부터 적용되며, 변경 내용이 있을 경우 시행 7일
            전부터 공지사항을 통하여 공지합니다.
          </P>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>공고일자: 2026년 6월 23일</Text>
          <Text style={styles.footerText}>시행일자: 2026년 6월 23일</Text>
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
  container: {
    paddingHorizontal: 20,
    paddingTop: 48,
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
  footer: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2D8F0",
  },
  footerText: { fontSize: 12, color: "#6B5C82", marginBottom: 4 },
});
