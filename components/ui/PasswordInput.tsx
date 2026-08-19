import { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import type { TextInputProps } from "react-native";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

// secureTextEntry 와 style 은 이 컴포넌트가 소유하므로 밖에서 못 넘긴다.
// 나머지 TextInput props 는 그대로 통과시킨다.
type Props = Omit<TextInputProps, "secureTextEntry" | "style">;

// 표시/숨김 상태는 인스턴스 내부에 둔다. 한 화면에 여러 개를 놔도
// (회원가입: 비밀번호 + 확인) 각각 독립적으로 토글된다.
export default function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        // 기본값은 spread 앞에 — 호출부가 필요하면 덮어쓸 수 있게.
        placeholderTextColor="#C4B8D6"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={styles.input}
        secureTextEntry={!visible}
      />
      <TouchableOpacity
        onPress={() => setVisible((v) => !v)}
        // editable=false(제출 중)여도 토글은 살려둔다. 입력만 잠그고,
        // 방금 친 비밀번호를 확인하는 건 계속 가능해야 한다.
        style={styles.toggle}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
      >
        {visible ? (
          <EyeOffIcon size={20} color="#9B8BB4" />
        ) : (
          <EyeIcon size={20} color="#9B8BB4" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // 테두리/배경은 래퍼가 갖고, 안쪽 TextInput 은 테두리 없이 flex 로 채운다.
  // 값은 LoginForm/SignupForm 의 로컬 input 과 동일 — 나란히 놓였을 때 같아야 한다.
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EDE9F0",
    paddingLeft: 14,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: "#3D2B5E" },
  // 44x44 — 아이콘(20)보다 크게 잡아 탭 영역을 확보한다.
  toggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
