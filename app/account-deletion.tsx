import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

// 계정 및 데이터 삭제 안내 — Google Play 정책상 계정 생성 기능이 있는 앱은
// 웹에서 접근 가능한 계정 삭제 요청 경로를 제공해야 한다.
// Play Console > 데이터 안전 > 데이터 삭제에 아래 URL 을 제출한다.
//   https://mongle-app.vercel.app/account-deletion
// 삭제 범위는 supabase/schema.sql 의 delete_my_account() RPC 와 일치시켜야 한다.
export default function AccountDeletionScreen() {
  return (
    <>
      <Stack.Screen
        options={{ title: "계정 및 데이터 삭제", headerShown: false }}
      />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>계정 및 데이터 삭제 안내</Text>
        <Text style={styles.meta}>
          몽글(Mongle) 앱의 계정 삭제 요청 방법과 삭제되는 데이터의 범위를
          안내합니다. 본 안내는 앱 개발자 박지은이 제공합니다.
        </Text>

        <Section n="1" title="앱 내에서 직접 삭제하기">
          <P>
            가장 빠른 방법입니다. 앱에서 아래 경로를 따라가면 별도 요청 없이
            즉시 처리됩니다.
          </P>
          <Bullet label="1단계">몽글 앱을 실행하고 로그인합니다.</Bullet>
          <Bullet label="2단계">
            하단 탭에서 [마이페이지]로 이동합니다.
          </Bullet>
          <Bullet label="3단계">
            우측 상단 [설정]에 들어가 [회원 탈퇴]를 선택합니다.
          </Bullet>
          <Bullet label="4단계">
            안내 문구를 확인하고 [탈퇴하기]를 누르면 계정과 데이터가 즉시
            삭제됩니다.
          </Bullet>
        </Section>

        <Section n="2" title="이메일로 삭제 요청하기">
          <P>
            앱을 이미 삭제했거나 로그인할 수 없는 경우, 아래 이메일로 삭제를
            요청하실 수 있습니다.
          </P>
          <Bullet label="접수 이메일">mongle.help@gmail.com</Bullet>
          <Bullet label="제목">계정 삭제 요청</Bullet>
          <Bullet label="본문 기재 사항">
            가입에 사용한 카카오 계정 이메일 주소, 앱에서 사용 중인 닉네임
          </Bullet>
          <P style={styles.small}>
            본인 확인 후 영업일 기준 7일 이내에 처리하고 결과를 회신합니다.
            본인 확인이 되지 않는 경우 삭제 요청이 거부될 수 있습니다.
          </P>
        </Section>

        <Section n="3" title="삭제되는 데이터">
          <P>계정 삭제 시 아래 데이터가 복원 불가능하게 영구 삭제됩니다.</P>
          <Bullet label="계정 정보">
            이메일 주소, 닉네임, 카카오 연동 인증 정보
          </Bullet>
          <Bullet label="프로필">프로필 설정 및 프로필 사진</Bullet>
          <Bullet label="꿈 기록">
            작성한 꿈 일기 본문, 해몽 기록, 저장된 AI 챗봇 대화 내역
          </Bullet>
          <Bullet label="북마크">저장해 둔 꿈 해몽 카드</Bullet>
          <Bullet label="운세 기록">날짜별로 조회한 오늘의 운세 결과</Bullet>
          <Bullet label="신고 내역">AI 응답에 대해 접수한 신고 기록</Bullet>
        </Section>

        <Section n="4" title="보관되는 데이터 및 보관 기간">
          <P>
            관계 법령에 따라 보관이 필요한 아래 정보는 해당 기간 동안 분리
            보관된 뒤 파기됩니다. 이 정보는 법령이 정한 목적 외로 이용되지
            않습니다.
          </P>
          <Table
            rows={[
              ["접속 로그 기록", "3개월 (통신비밀보호법)"],
              ["소비자 불만·분쟁처리 기록", "3년 (전자상거래법)"],
            ]}
          />
          <P style={styles.small}>
            서버 접근 로그에 일시적으로 기록되는 IP 주소는 보안 및 운영
            목적으로만 사용되며 위 기간 경과 후 파기됩니다.
          </P>
        </Section>

        <Section n="5" title="유의 사항">
          <Bullet label="즉시 처리">
            앱 내 회원 탈퇴는 확인 즉시 처리되며, 취소하거나 되돌릴 수 없습니다.
          </Bullet>
          <Bullet label="백업 없음">
            삭제된 꿈 일기와 대화 내역은 복구해 드릴 수 없습니다. 필요한 기록은
            탈퇴 전에 따로 보관해 주세요.
          </Bullet>
          <Bullet label="재가입">
            탈퇴 후 같은 카카오 계정으로 다시 가입할 수 있으나, 이전 데이터는
            연결되지 않습니다.
          </Bullet>
        </Section>

        <Section n="6" title="문의">
          <P>
            계정 삭제와 관련한 문의는 아래로 연락해 주시기 바랍니다. 개인정보
            처리 전반에 대한 사항은 개인정보처리방침을 참고해 주세요.
          </P>
          <Bullet label="개인정보 보호책임자">박지은</Bullet>
          <Bullet label="이메일">mongle.help@gmail.com</Bullet>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>최종 수정일: 2026년 8월 4일</Text>
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
          항목
        </Text>
        <Text style={[styles.tableCell, styles.tableCellHead, { flex: 1 }]}>
          보관 기간
        </Text>
      </View>
      {rows.map(([what, how], i) => (
        <View
          key={i}
          style={[
            styles.tableRow,
            i === rows.length - 1 ? styles.tableRowLast : null,
          ]}
        >
          <Text style={[styles.tableCell, { flex: 1 }]}>{what}</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>{how}</Text>
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
