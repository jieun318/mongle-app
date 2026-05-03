"use client";

import { CSSProperties } from "react";
import styles from "./OrbBlobs.module.css";
import { getSmokePalette } from "@/features/fortune/smokePalette";

interface OrbBlobsProps {
  /** 행운의 색 (예: "라벤더", "민트", "코랄"). 매핑 없으면 라벤더 fallback. */
  luckyColor: string;
  /** 외부에서 위치/크기 조정이 필요할 때 */
  className?: string;
}

// 3개 블롭 — 위치, 크기, 시작 지연이 각자 다름
const BLOBS = [
  { left: "32%", top: "38%", size: "62%", delay: "0s",   colorIdx: 0 },
  { left: "62%", top: "58%", size: "68%", delay: "0.5s", colorIdx: 1 },
  { left: "44%", top: "70%", size: "58%", delay: "1.0s", colorIdx: 2 },
] as const;

type BlobVars = CSSProperties & {
  ["--blob-color"]: string;
  ["--blob-size"]: string;
  ["--blob-delay"]: string;
};

export default function OrbBlobs({ luckyColor, className }: OrbBlobsProps) {
  const colors = getSmokePalette(luckyColor);

  return (
    <div
      className={`${styles.container}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {BLOBS.map((b, i) => {
        const style: BlobVars = {
          left: b.left,
          top: b.top,
          ["--blob-color"]: colors[b.colorIdx],
          ["--blob-size"]: b.size,
          ["--blob-delay"]: b.delay,
        };
        return <span key={i} className={styles.blob} style={style} />;
      })}
    </div>
  );
}
