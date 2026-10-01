import type { ComponentType } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import type { IconProps } from "@/components/ui/icons";

// 아이콘 + 짧은 문구 한 줄 — 버튼·배지·메뉴에서 "🤖 AI챗봇" 같은 이모지 접두어를 대신한다.
// 오래된 안드로이드는 기기 이모지 폰트에 없는 글자를 네모(□)로 그려서, UI 고정 문구의
// 이모지는 SVG 아이콘으로 그린다. 아이콘 색·크기는 문구 스타일(color, fontSize)을 따른다.
interface Props {
  icon: ComponentType<IconProps>;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  children: string;
}

export default function IconLabel({ icon: Icon, textStyle, style, children }: Props) {
  const flat = StyleSheet.flatten(textStyle) ?? {};
  const fontSize = typeof flat.fontSize === "number" ? flat.fontSize : 14;
  const color = typeof flat.color === "string" ? flat.color : "#5848A8";
  return (
    <View style={[styles.row, style]}>
      <Icon size={Math.round(fontSize * 1.15)} color={color} />
      <Text style={textStyle}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
});
