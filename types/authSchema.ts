import { z } from "zod";

export const loginSchema = z.object({
  id: z.string().min(1, "아이디를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export const signupSchema = z
  .object({
    nickname: z
      .string()
      .min(1, "닉네임을 입력해주세요")
      .max(10, "닉네임은 10자 이하로 입력해주세요"),
    id: z
      .string()
      .min(1, "아이디를 입력해주세요")
      .regex(/^[a-zA-Z0-9]+$/, "아이디는 영문/숫자만 입력해주세요"),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상 입력해주세요")
      .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, "영문+숫자 조합으로 입력해주세요"),
    passwordConfirm: z.string().min(1, "비밀번호를 한 번 더 입력해주세요"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않아요",
    path: ["passwordConfirm"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
