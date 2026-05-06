import { Image, ImageSourcePropType, StyleProp, Text, TextStyle } from "react-native";

// 특정 emoji 를 PNG 이미지로 대체.
// 추가하려면 (emoji → require('...png')) 한 줄만 더하면 됨.
const EMOJI_IMAGE_OVERRIDES: Record<string, ImageSourcePropType> = {
  "🐍": require("@/assets/images/Snake.png"),
};

interface Props {
  emoji: string;
  size: number;
  style?: StyleProp<TextStyle>;
}

// dream_items 의 emoji 1개를 렌더. 오버라이드가 있으면 Image, 없으면 Text.
//   - size 는 Text 의 fontSize 와 Image 의 width/height 양쪽에 사용.
//   - PNG 비율은 정사각형 가정 (현재 Snake.png 가 그렇게 저장돼 있음).
export default function DreamEmoji({ emoji, size, style }: Props) {
  const override = EMOJI_IMAGE_OVERRIDES[emoji];
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
