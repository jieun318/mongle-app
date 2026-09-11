import { useState, type ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { SHELL_MAX_W, ShellWidthContext } from "@/lib/layout";

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
  // 창 너비가 아니라 실제 레이아웃을 잰다.
  // Expo 정적 익스포트에서는 useWindowDimensions 가 프리렌더에서 0 이고
  // 하이드레이션 뒤에도 리사이즈 전까지 0 으로 남아, 넓은 창에서도 wide 가
  // false 로 굳는다(실측 확인). onLayout 은 웹에서 ResizeObserver 로 붙어
  // 첫 레이아웃과 창 크기 변경 모두에서 정확한 값을 준다.
  const [available, setAvailable] = useState(0);
  const onLayout = (e: LayoutChangeEvent) =>
    setAvailable(e.nativeEvent.layout.width);

  const wide = available > SHELL_MAX_W;
  const shellW = available > 0 ? Math.min(available, SHELL_MAX_W) : null;

  return (
    <View style={[styles.outer, wide && styles.outerWide]} onLayout={onLayout}>
      <View style={[styles.shell, wide && styles.shellEdge]}>
        <ShellWidthContext.Provider value={shellW}>
          {children}
        </ShellWidthContext.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  // 셸 바깥 여백 — 어둡게 깔아 셸이 "켜진 화면"으로 읽히게 한다.
  // 밝은 색(#E7E2F0)은 앱 낮 배경(#F5F3FA)과 대비가 없어 경계가 안 보이고,
  // 홈탭이 밤 배경(#15122A)으로 바뀌면 반대로 바깥이 튀었다.
  // 앱 밤 배경보다 살짝 밝게 두어 밤에도 셸이 구분된다.
  outerWide: { backgroundColor: "#2A2440" },

  shell: {
    flex: 1,
    width: "100%",
    maxWidth: SHELL_MAX_W,
    alignSelf: "center",
  },
  // 어두운 바깥 위에서 보이는 밝은 hairline + 모서리 라운드로 화면처럼 보이게.
  // overflow:hidden 이 있어야 안쪽 그라디언트가 둥근 모서리에 맞춰 잘린다.
  shellEdge: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});
