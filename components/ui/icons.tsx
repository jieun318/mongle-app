import Svg, { Path, Circle, Line } from "react-native-svg";

export interface IconProps {
  size?: number;
  color?: string;
}

const DEFAULT_COLOR = "#5848A8";

// ── Bell (알림) ──────────────────────────────────────────────
export function BellIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Home (홈) ────────────────────────────────────────────────
export function HomeIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.25 12L12 2.25L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Search (돋보기) ──────────────────────────────────────────
export function SearchIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Star (별, 보관함) ────────────────────────────────────────
export function StarIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Mypage (사람) ────────────────────────────────────────────
export function MypageIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Settings (톱니바퀴) ──────────────────────────────────────
export function SettingsIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Pencil (편집) ────────────────────────────────────────────
export function PencilIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zM19.5 7.125l-3.225-3.225"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── ChevronLeft (뒤로가기) ───────────────────────────────────
// 스트로크가 다른 아이콘(1.8)보다 두껍다. 네비게이션 어포던스라
// "누를 수 있는 것"으로 한눈에 보여야 한다.
export function ChevronLeftIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15.75 19.5L8.25 12l7.5-7.5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Eye (비밀번호 표시) ──────────────────────────────────────
export function EyeIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── EyeOff (비밀번호 숨김) ───────────────────────────────────
export function EyeOffIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.774 3.162 10.066 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}


// ── 이모지 대신 쓰는 아이콘 ─────────────────────────────────
// 오래된 안드로이드(갤럭시 S8, Android 9 등)는 기기 이모지 폰트에 없는 글자를 네모(□)로
// 그린다. UI 고정 문구(버튼·섹션 제목·배지)의 이모지는 이 SVG 아이콘으로 대신한다.
// AI 답변·사전 데이터 안의 이모지는 대상이 아니다.

function OutlinePath({ d, size, color }: { d: string; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Sparkles (✨ 대신 — 결과 카드, 오늘 해볼 것) ─────────────
export function SparklesIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
    />
  );
}

// ── Heart (💜·🤍 대신 — 지금 나의 마음, 위기 안내) ─────────────
export function HeartIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  );
}

// ── Moon (🌙 대신 — 보통 배지, 장식) ─────────────────────────
export function MoonIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
    />
  );
}

// ── Cloud (☁️·🌫️ 대신 — 장식, 빈 화면) ───────────────────────
export function CloudIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
    />
  );
}

// ── ChatBubble (💬·💭 대신 — 대화 이어가기, 불러오는 중) ─────────
export function ChatBubbleIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
    />
  );
}

// ── Check (✓ 대신 — 보관함에서 보기) ─────────────────────────
export function CheckIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return <OutlinePath size={size} color={color} d="M4.5 12.75l6 6 9-13.5" />;
}

// ── CheckCircle (☑︎ 대신 — 오늘 해볼 것 항목) ─────────────────
export function CheckCircleIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  );
}

// ── Warning (⚠️ 대신 — 흉몽 배지) ────────────────────────────
export function WarningIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  );
}

// ── BookOpen (🔮 대신 — 해몽 본문) ───────────────────────────
export function BookOpenIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  );
}

// ── ChevronUp (▲ 대신 — 접기) ────────────────────────────────
export function ChevronUpIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return <OutlinePath size={size} color={color} d="M4.5 15.75l7.5-7.5 7.5 7.5" />;
}

// ── Clover (🍀 대신 — 길몽 배지) ─────────────────────────────
export function CloverIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8.6} cy={8.6} r={3.4} stroke={color} strokeWidth={1.8} />
      <Circle cx={15.4} cy={8.6} r={3.4} stroke={color} strokeWidth={1.8} />
      <Circle cx={8.6} cy={15.4} r={3.4} stroke={color} strokeWidth={1.8} />
      <Circle cx={15.4} cy={15.4} r={3.4} stroke={color} strokeWidth={1.8} />
      <Line x1={14.5} y1={14.5} x2={20.25} y2={21} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ── Trash (🗑️ 대신 — 삭제 메뉴) ──────────────────────────────
export function TrashIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  );
}

// ── LightBulb (💡 대신 — 운세 팁) ─────────────────────────────
export function LightBulbIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  );
}

// ── Clock (🕘 대신 — 최근 검색어) ─────────────────────────────
export function ClockIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return <OutlinePath size={size} color={color} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />;
}

// ── Fire (🔥 대신 — 지금 뜨는 꿈 키워드) ───────────────────────
export function FireIcon({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <OutlinePath
      size={size}
      color={color}
      d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"
    />
  );
}
