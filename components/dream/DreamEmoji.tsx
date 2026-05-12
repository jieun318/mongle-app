import { Image, ImageSourcePropType, StyleProp, Text, TextStyle } from "react-native";

// 같은 emoji 라도 "어떤 꿈" 인지에 따라 PNG 로 대체할지 결정.
// 예: 🐍 는 기본적으로 그냥 텍스트, 단 '흰 뱀' 꿈일 때만 흰뱀 PNG 사용.
const WHITE_SNAKE_PNG: ImageSourcePropType = require("@/assets/images/Snake.png");

function resolveOverride(
  emoji: string,
  title?: string,
): ImageSourcePropType | null {
  if (emoji === "🐍" && title && /흰\s*뱀/.test(title)) {
    return WHITE_SNAKE_PNG;
  }
  return null;
}

interface Props {
  emoji: string;
  size: number;
  title?: string;
  style?: StyleProp<TextStyle>;
}

// dream_items 의 emoji 1개를 렌더. title 컨텍스트에 따라 특정 꿈만 PNG 로 대체.
//   - size 는 Text 의 fontSize 와 Image 의 width/height 양쪽에 사용.
//   - PNG 비율은 정사각형 가정.
export default function DreamEmoji({ emoji, size, title, style }: Props) {
  const override = resolveOverride(emoji, title);
  if (override) {
    return (
      <Image
        source={override}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }
  return <Text style={[{ fontSize: size }, style]}>{emoji}</Text>;
}
