// 웹(정적 렌더링) 전용 루트 HTML 문서.
// 각 웹 페이지가 이 <html> 래퍼 안에서 렌더링된다. (Expo Router web)
// 네이티브(iOS/Android) 빌드에는 포함되지 않는다.
import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/*
          제목·설명은 STORE_LISTING.md §1 의 꿈해몽 우선 포지셔닝과 맞춘다.
          검색 노출과 링크 미리보기가 스토어 등록정보와 어긋나지 않게 유지할 것.
        */}
        <title>몽글 (Mongle) — AI 꿈해몽, 꿈 일기와 오늘의 운세</title>
        <meta
          name="description"
          content="간밤에 꾼 꿈, 무슨 의미일까요? 몽글은 꿈을 기록하면 AI가 상징과 의미를 풀이해 주는 꿈해몽 앱입니다. 꿈 사전 검색과 나만의 꿈 일기, 오늘의 운세까지 한 번에."
        />
        <meta property="og:site_name" content="몽글 (Mongle)" />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="몽글 (Mongle) — AI 꿈해몽, 꿈 일기와 오늘의 운세"
        />
        <meta
          property="og:description"
          content="간밤에 꾼 꿈, 무슨 의미일까요? 몽글은 꿈을 기록하면 AI가 상징과 의미를 풀이해 주는 꿈해몽 앱입니다. 꿈 사전 검색과 나만의 꿈 일기, 오늘의 운세까지 한 번에."
        />

        {/* Google Search Console 사이트 소유권 확인 */}
        <meta
          name="google-site-verification"
          content="Z-kl-TeS60FwSC_ZgO3pBWardyou_hLsFOsx4nmJJ4I"
        />

        {/*
          ScrollView(단일 페이지 스크롤)가 웹에서 올바르게 동작하도록 body 기본
          스타일을 초기화한다. 이 컴포넌트를 제거하면 스크롤이 깨질 수 있다.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
