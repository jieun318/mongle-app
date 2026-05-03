"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import styles from "./TarotOrb.module.css";

interface Particle {
  x: number;
  y: number;
  radius: number;
  colorIndex: number;
  opacity: number;
  speed: number;
  drift: number;
  life: number;
  maxLife: number;
}

const COLORS = [
  { h: 268, s: 58, l: 72 },
  { h: 270, s: 48, l: 80 },
  { h: 265, s: 62, l: 65 },
] as const;

const ORB_SIZE = 210;
const PARTICLE_COUNT = 28;

interface TarotOrbProps {
  onReveal?: () => void;
}

export default function TarotOrb({ onReveal }: TarotOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const [clicked, setClicked] = useState(false);

  const makeParticle = useCallback((scattered = false): Particle => {
    const radius = 28 + Math.random() * 42;
    const maxLife = 200 + Math.random() * 140;
    return {
      x: Math.random() * ORB_SIZE,
      y: scattered ? Math.random() * ORB_SIZE : ORB_SIZE + radius,
      radius,
      colorIndex: Math.floor(Math.random() * 3),
      opacity: 0,
      speed: 0.28 + Math.random() * 0.45,
      drift: (Math.random() - 0.5) * 0.35,
      life: scattered ? Math.random() * maxLife : 0,
      maxLife,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = ORB_SIZE;
    canvas.height = ORB_SIZE;

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      makeParticle(true)
    );

    const draw = () => {
      ctx.clearRect(0, 0, ORB_SIZE, ORB_SIZE);

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.life++;
        p.y -= p.speed;
        p.x += p.drift;

        const t = p.life / p.maxLife;
        p.opacity =
          t < 0.2 ? (t / 0.2) * 0.46 : t > 0.8 ? ((1 - t) / 0.2) * 0.46 : 0.46;

        if (p.life >= p.maxLife || p.y + p.radius < 0) {
          particlesRef.current[i] = makeParticle();
        }

        const c = COLORS[p.colorIndex];
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        g.addColorStop(0, `hsla(${c.h}, ${c.s}%, ${c.l}%, ${p.opacity})`);
        g.addColorStop(1, `hsla(${c.h}, ${c.s}%, ${c.l}%, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [makeParticle]);

  const handleClick = () => {
    if (clicked) return;
    setClicked(true);
    setTimeout(() => onReveal?.(), 850);
  };

  return (
    <div className={styles.page}>
      <p className={styles.title}>오늘의 타로 운세</p>

      <div
        className={`${styles.orbWrap} ${clicked ? styles.orbWrapActive : ""}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="타로 운세 구슬"
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        <div className={`${styles.glow} ${clicked ? styles.glowActive : ""}`} />

        <div className={`${styles.orb} ${clicked ? styles.orbActive : ""}`}>
          {/* smoke particles — clipped by overflow:hidden on .orb */}
          <canvas ref={canvasRef} className={styles.canvas} />

          {/* glass glare */}
          <div className={styles.glareTop} />
          <div className={styles.glareBottom} />

          {/* thin sheen over everything */}
          <div className={styles.glassSheen} />
        </div>
      </div>

      <p className={styles.hint}>✦ 구슬을 탭하면 운세가 깨어납니다 ✦</p>
    </div>
  );
}
