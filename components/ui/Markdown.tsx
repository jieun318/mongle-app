import { Fragment, useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

// 해몽 본문용 초경량 마크다운 렌더러.
// AI 답변·사전 본문에 실제로 나오는 문법만 다룬다 — #/##/### 제목, ---
// 구분선, -·*·• 목록, 1. 번호 목록, **굵게**. 라이브러리를 쓰지 않는 이유는
// 순수 JS 라 OTA 로 배포되고, 지원 범위를 우리가 통제할 수 있어서다.
// 목표는 "원문 기호(##, ---, **)가 화면에 그대로 새지 않는 것".

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "rule" }
  | { kind: "bullet"; items: string[] }
  | { kind: "ordered"; items: { n: string; text: string }[] }
  | { kind: "para"; text: string };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const RULE_RE = /^([-*_])(\s*\1){2,}\s*$/;
const BULLET_RE = /^[-*•]\s+(.*)$/;
const ORDERED_RE = /^(\d+)[.)]\s+(.*)$/;

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ kind: "para", text: para.join("\n") });
    para = [];
  };

  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      continue;
    }
    // 제목보다 구분선을 먼저 — "***" 가 목록으로 잡히지 않게.
    if (RULE_RE.test(line)) {
      flushPara();
      blocks.push({ kind: "rule" });
      continue;
    }
    const h = HEADING_RE.exec(line);
    if (h) {
      flushPara();
      const level = Math.min(h[1].length, 3) as 1 | 2 | 3;
      blocks.push({ kind: "heading", level, text: h[2].replace(/\s+#+$/, "") });
      continue;
    }
    const b = BULLET_RE.exec(line);
    if (b) {
      flushPara();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "bullet") last.items.push(b[1]);
      else blocks.push({ kind: "bullet", items: [b[1]] });
      continue;
    }
    const o = ORDERED_RE.exec(line);
    if (o) {
      flushPara();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ordered") last.items.push({ n: o[1], text: o[2] });
      else blocks.push({ kind: "ordered", items: [{ n: o[1], text: o[2] }] });
      continue;
    }
    para.push(line);
  }
  flushPara();
  return blocks;
}

// **굵게** / __굵게__ 를 굵은 Text 로. 짝이 안 맞아 남은 ** 는 지운다.
function Inline({ text, boldStyle }: { text: string; boldStyle: StyleProp<TextStyle> }) {
  const parts = text.split(/(\*\*[^*]+?\*\*|__[^_]+?__)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^(\*\*|__).+\1$/.test(p)) {
          return (
            <Text key={i} style={boldStyle}>
              {p.slice(2, -2)}
            </Text>
          );
        }
        // 기호를 지운 자리에 공백이 두 칸 남지 않게 한 칸으로 합친다.
        return <Fragment key={i}>{p.replace(/ ?(\*\*|__) ?/g, " ")}</Fragment>;
      })}
    </>
  );
}

interface Props {
  children: string;
  // 본문 기본 글자 스타일 (색·크기·줄간격). 제목·목록은 여기서 파생된다.
  textStyle?: StyleProp<TextStyle>;
  accentColor?: string;
}

export default function Markdown({ children, textStyle, accentColor = "#6848C0" }: Props) {
  const blocks = useMemo(() => parseMarkdown(children), [children]);
  const base = [styles.text, textStyle];
  const bold = [styles.bold, { color: accentColor }];

  return (
    <View style={styles.wrap}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "heading":
            return (
              <Text
                key={i}
                style={[
                  base,
                  styles.heading,
                  block.level === 1 && styles.h1,
                  block.level === 2 && styles.h2,
                  { color: accentColor },
                  i > 0 && styles.headingGap,
                ]}
                accessibilityRole="header"
              >
                <Inline text={block.text} boldStyle={null} />
              </Text>
            );
          case "rule":
            return <View key={i} style={styles.rule} />;
          case "bullet":
            return (
              <View key={i} style={styles.list}>
                {block.items.map((item, j) => (
                  <View key={j} style={styles.listRow}>
                    <Text style={[base, styles.marker, { color: accentColor }]}>•</Text>
                    <Text style={[base, styles.listText]}>
                      <Inline text={item} boldStyle={bold} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case "ordered":
            return (
              <View key={i} style={styles.list}>
                {block.items.map((item, j) => (
                  <View key={j} style={styles.listRow}>
                    <Text style={[base, styles.marker, { color: accentColor }]}>
                      {item.n}.
                    </Text>
                    <Text style={[base, styles.listText]}>
                      <Inline text={item.text} boldStyle={bold} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          default:
            return (
              <Text key={i} style={base}>
                <Inline text={block.text} boldStyle={bold} />
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  text: { fontSize: 14, color: "#5848A8", lineHeight: 23 },
  bold: { fontWeight: "700" },
  heading: { fontSize: 15, fontWeight: "700" },
  h1: { fontSize: 18 },
  h2: { fontSize: 16 },
  headingGap: { marginTop: 6 },
  rule: { height: 1, backgroundColor: "#EDE4FB", marginVertical: 4 },
  list: { gap: 6 },
  listRow: { flexDirection: "row", gap: 6 },
  marker: { minWidth: 14, fontWeight: "700" },
  listText: { flex: 1 },
});
