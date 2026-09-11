import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { SHELL_MAX_W } from "@/lib/layout";

/**
 * 앱 전체를 폰 폭으로 묶고 가운데 정렬하는 셸.
 *
 * 왜 필요한가 — 폰 기준으로 짠 레이아웃이 웹에서는 창 너비를 그대로 받아
 * 데스크톱에서 통째로 늘어난다. 화면마다 개별로 폭을 걸면 본문만 좁아지고
 * 탭바·배경은 늘어난 채로 남아 서로 어긋난다. (app)/(auth) 스택을 통째로
 * 감싸 본문·탭바·배경·오버레이가 한 폭 안에 들어오게 한다.
 *
 * 폰(≤480dp)에서는 어떤 스타일도 얹지 않는다 — 상한에 걸리지 않아 width:100%
 * 가 곧 전체 폭이고, 경계선·그림자는 wide 일 때만 붙는다. 즉 폰 레이아웃은
 * 1px도 바뀌지 않는다.
 *
 * 웹 문서 페이지(/privacy, /terms, 랜딩 등)는 (app)/(auth) 밖에 있어 이 셸을
 * 거치지 않는다 — 창 전체를 그대로 쓴다. Play Console 에 등록된 주소가 좁은
 * 칼럼으로 찌그러지면 안 되므로 루트 레이아웃에는 절대 올리지 말 것.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width > SHELL_MAX_W;

  return (
    <View style={[styles.outer, wide && styles.outerWide]}>
      <View style={[styles.shell, wide && styles.shellEdge]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  // 셸 바깥 여백 — 앱 배경(#F5F3FA)보다 한 톤 낮춰 셸이 얹혀 보이게 한다.
  outerWide: { backgroundColor: "#E7E2F0" },

  shell: {
    flex: 1,
    width: "100%",
    maxWidth: SHELL_MAX_W,
    alignSelf: "center",
  },
  // 바깥색과 대비가 약해 경계가 안 보이므로 얇은 좌우 선 + 은은한 그림자를 준다.
  // 경계가 인지되는 정도까지만 — 카드처럼 떠 보이면 과하다.
  shellEdge: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,38,71,0.10)",
    shadowColor: "#2E2647",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
});
