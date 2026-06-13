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
        <Text style={styles.h1}>개인정보 처리방침</Text>
        <Text style={styles.meta}>
          몽글(이하 "서비스")은 정보주체의 자유와 권리를 보호하기 위해
          「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여 적법하게
          개인정보를 처리하고 안전하게 관리하고 있습니다. 본 방침은 다음의
          내용을 담고 있습니다.
        </Text>

        <Section n="1" title="수집하는 개인정보 항목 및 수집 방법">
          <P>서비스 이용 과정에서 다음 정보가 수집될 수 있습니다.</P>
          <Bullet label="필수 (회원가입·로그인)">
            이메일 주소, 비밀번호(암호화 저장), 또는 카카오 로그인 시 카카오에서
            제공하는 식별자·이메일·닉네임·프로필 이미지
          </Bullet>
          <Bullet label="선택 (프로필)">
            닉네임, 프로필 이미지(직접 업로드), 알림 수신 설정
          </Bullet>
          <Bullet label="선택 (위치)">
            정확한 일출·일몰 시각 표시를 위한 대략적 위·경도. 권한 미허용 시
            서울 기준으로 대체되며 별도 저장되지 않습니다.
          </Bullet>
          <Bullet label="자동 수집">
            서비스 이용 기록, 접속 로그, 기기 식별자(deviceId), IP 주소, 운영체제·앱 버전
          </Bullet>
          <Bullet label="이용자 생성 콘텐츠">
            꿈 기록, 챗봇 대화 내용, 일일 운세 조회 이력
          </Bullet>
          <P>
            수집 방법: 회원가입·서비스 이용 과정에서 이용자가 직접 입력하거나,
            소셜 로그인 제공자(카카오·Apple)로부터 동의 범위 내 제공받으며, 일부
            정보는 앱 이용 중 자동으로 생성·수집됩니다.
          </P>
        </Section>

        <Section n="2" title="개인정보의 수집·이용 목적">
          <Bullet label="회원 식별 및 인증">
            로그인, 본인 확인, 부정 이용 방지
          </Bullet>
          <Bullet label="서비스 제공">
            운세 생성·저장, 꿈 기록 관리, 챗봇 응답 생성, 알림 발송
          </Bullet>
          <Bullet label="서비스 개선">
            오류 분석, 사용 패턴 통계(개인 식별 정보 제외)
          </Bullet>
          <Bullet label="고객 문의 응대">
            문의·신고에 대한 답변 및 처리
          </Bullet>
        </Section>

        <Section n="3" title="개인정보의 보유 및 이용 기간">
          <P>
            서비스 이용 기간 또는 이용자가 회원 탈퇴를 요청할 때까지 보유하며,
            탈퇴 즉시 모든 개인정보 및 이용자 생성 콘텐츠를 지체 없이 파기합니다.
          </P>
          <P>
            단, 관계 법령에 의해 보존할 필요가 있는 경우 해당 법령이 정한 기간
            동안 보관합니다. 본 서비스는 현재 결제·통신 기능을 제공하지 않아
            전자상거래법·통신비밀보호법상 별도 보관 의무는 발생하지 않습니다.
          </P>
        </Section>

        <Section n="4" title="개인정보의 제3자 제공">
          <P>
            서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
            다만 이용자가 사전에 동의했거나 법령에 특별한 규정이 있는 경우에만
            예외적으로 제공됩니다.
          </P>
        </Section>

        <Section n="5" title="개인정보 처리 위탁">
          <P>
            서비스는 안정적인 운영을 위해 다음과 같이 일부 업무를 외부에
            위탁하고 있습니다.
          </P>
          <Table
            rows={[
              ["Supabase, Inc.", "회원 인증, 데이터베이스 및 파일 저장 (해외 처리)"],
              ["Vercel, Inc.", "웹·API 호스팅 (해외 처리)"],
              ["Kakao Corp.", "카카오 소셜 로그인"],
              ["Apple Inc.", "Apple 소셜 로그인 (활성화 시)"],
              [
                "Google LLC (Gemini API)",
                "AI 챗봇 응답 생성 — 사용자가 입력한 대화 내용이 응답 생성을 위해 처리됨 (해외 처리)",
              ],
              [
                "Open-Meteo",
                "일출·일몰 시각 조회 — 대략적 위·경도가 전송되며 저장되지 않음 (해외 처리)",
              ],
            ]}
          />
          <P style={styles.small}>
            ※ 일부 수탁사는 데이터를 미국·유럽 등 해외에서 처리할 수 있으며,
            이는 서비스 제공에 필수적인 범위에 한합니다. 이용자는 회원 가입 및
            서비스 이용을 통해 본 처리에 동의한 것으로 간주됩니다.
          </P>
        </Section>

        <Section n="6" title="정보주체의 권리 및 행사 방법">
          <P>
            이용자는 언제든지 본인의 개인정보에 대해 다음의 권리를 행사할 수
            있습니다.
          </P>
          <Bullet label="열람 / 정정">
            앱 내 [마이페이지 → 프로필 편집]에서 직접 확인·수정
          </Bullet>
          <Bullet label="처리 정지 / 삭제">
            앱 내 [설정 → 회원 탈퇴]를 통한 즉시 탈퇴, 또는 아래 연락처로 요청
          </Bullet>
          <Bullet label="동의 철회">
            알림 등 선택 항목은 [설정] 에서 토글로 즉시 철회 가능
          </Bullet>
        </Section>

        <Section n="7" title="개인정보의 파기 절차 및 방법">
          <P>
            이용자가 회원 탈퇴를 요청하면, 데이터베이스 상의 회원 정보 및
            이용자 생성 콘텐츠(꿈 기록·운세 이력·챗봇 대화 등)는 복구 불가능한
            방식으로 즉시 삭제됩니다. 업로드된 프로필 이미지 등 파일 형태의
            정보 또한 함께 영구 삭제됩니다.
          </P>
        </Section>

        <Section n="8" title="개인정보의 안전성 확보 조치">
          <Bullet label="기술적 조치">
            전송 구간 TLS 암호화, 비밀번호 단방향 암호화 저장, Row Level
            Security 기반 접근 제어
          </Bullet>
          <Bullet label="관리적 조치">
            접근 권한 최소화, 위탁사 보안 인증(SOC2 등) 확인
          </Bullet>
          <Bullet label="물리적 조치">
            클라우드 제공자(Supabase·Vercel·Google Cloud)의 데이터센터 보안
            정책 준용
          </Bullet>
        </Section>

        <Section n="9" title="자동 수집 장치의 설치·운영 및 거부">
          <P>
            서비스는 이용자 경험 개선을 위해 기기 식별자 및 로컬 저장소(예:
            AsyncStorage)를 사용합니다. 이용자는 기기 설정에서 권한을
            철회하거나, 앱 삭제를 통해 해당 정보를 제거할 수 있습니다.
          </P>
        </Section>

        <Section n="10" title="아동의 개인정보">
          <P>
            서비스는 만 14세 미만 아동의 회원가입을 받지 않습니다. 만 14세 미만
            아동의 개인정보가 수집된 사실이 확인되는 경우, 지체 없이 해당
            정보를 파기합니다.
          </P>
        </Section>

        <Section n="11" title="개인정보 보호책임자 및 연락처">
          <P>
            개인정보 처리에 관한 문의·불만 처리·피해 구제 등은 아래 연락처로
            요청하실 수 있습니다.
          </P>
          <Bullet label="개인정보 보호책임자">[성명]</Bullet>
          <Bullet label="이메일">[contact@example.com]</Bullet>
          <P style={styles.small}>
            기타 개인정보 침해에 대한 상담이 필요하신 경우 개인정보침해
            신고센터(privacy.kisa.or.kr / 국번 없이 118), 개인정보 분쟁조정위원회
            (kopico.go.kr / 1833-6972), 대검찰청(spo.go.kr / 1301), 경찰청
            (ecrm.cyber.go.kr / 국번 없이 182) 으로 문의하실 수 있습니다.
          </P>
        </Section>

        <Section n="12" title="개인정보 처리방침의 변경">
          <P>
            본 방침은 법령·정책 또는 서비스의 변경 사항을 반영하기 위해 수정될
            수 있으며, 변경 시 앱 내 공지사항을 통해 사전 안내합니다.
          </P>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>공고일자: [YYYY-MM-DD]</Text>
          <Text style={styles.footerText}>시행일자: [YYYY-MM-DD]</Text>
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
