import { useEffect, useRef } from "react";
import { isMobile, isSafari, onViewportChange } from "../lib/viewport";

type GradientStop = [offset: number, color: string];

function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  stops: GradientStop[],
  rotation = 0
) {
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.scale(1, ry / rx);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  stops.forEach(([offset, color]) => glow.addColorStop(offset, color));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function surfaceY(x: number, width: number, height: number, t: number, phase = 0) {
  const cx = width * 0.5;
  const reach = width * 0.92;
  const n = Math.min(1, Math.abs(x - cx) / reach);
  const arc = Math.sqrt(Math.max(0, 1 - n * n));

  const top = height * -1.2;
  const sag = height * 2;
  const drift =
    Math.sin(x / width * 2.1 + t * 0.22 + phase) * 18 +
    Math.cos(x / width * 3.6 - t * 0.16 + phase) * 12;

  return top + arc * sag + drift;
}

const CYAN = "81, 190, 255";
const INDIGO = "93, 81, 255";
const BLACK = "6, 6, 12";

function auroraPaint(ctx: CanvasRenderingContext2D, width: number, t: number, boost = 1) {
  const span = width * 1.7;
  const shift = Math.sin(t * 0.62) * width * 0.44 - width * 0.3;
  const g = ctx.createLinearGradient(shift, 0, shift + span, 0);
  const a = (v: number) => Math.min(1, v * boost);

  g.addColorStop(0, `rgba(${BLACK}, ${a(0.5)})`);
  g.addColorStop(0.08, `rgba(${INDIGO}, ${a(0.78)})`);
  g.addColorStop(0.22, `rgba(${INDIGO}, ${a(0.88)})`);
  g.addColorStop(0.3, `rgba(${CYAN}, ${a(0.82)})`);
  g.addColorStop(0.38, `rgba(${INDIGO}, ${a(0.88)})`);
  g.addColorStop(0.5, `rgba(${INDIGO}, ${a(0.8)})`);
  g.addColorStop(0.58, `rgba(${BLACK}, ${a(0.45)})`);
  g.addColorStop(0.68, `rgba(${INDIGO}, ${a(0.85)})`);
  g.addColorStop(0.8, `rgba(${CYAN}, ${a(0.8)})`);
  g.addColorStop(0.9, `rgba(${INDIGO}, ${a(0.85)})`);
  g.addColorStop(1, `rgba(${BLACK}, ${a(0.5)})`);
  return g;
}

function driveWave(now: number) {
  const t = now / 1000;
  document.documentElement.style.setProperty("--wave-pos", `${((t * 20) % 100).toFixed(2)}%`);
  document.documentElement.style.setProperty("--wave-shift", `${((t * 30) % 360).toFixed(2)}deg`);
}

export default function Aurora() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isSafari || isMobile) {
      let frameId = 0;
      const tick = (now: number) => {
        driveWave(now);
        frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frameId);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let frameId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const fillBody = (t: number, phase: number, lift: number) => {
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 6) {
        const y = surfaceY(x, width, height, t, phase) - lift;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(width + 20, height + 60);
      ctx.lineTo(-20, height + 60);
      ctx.closePath();
      ctx.fill();
    };

    const frame = (now: number) => {
      const t = now / 1000;
      const pulse = 0.88 + Math.sin(t * 1.5) * 0.12;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      ctx.filter = "blur(30px)";
      ctx.globalAlpha = 0.92 * pulse;
      ctx.fillStyle = auroraPaint(ctx, width, t);
      fillBody(t, 0, 0);

      ctx.filter = "blur(20px)";
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = auroraPaint(ctx, width, t + 1.6, 1.1);
      fillBody(t, 1.2, 34);

      ctx.filter = "blur(12px)";
      ctx.globalAlpha = 0.44;
      ctx.fillStyle = auroraPaint(ctx, width, t + 3.1, 1.15);
      fillBody(t, 2.4, 68);

      ctx.globalAlpha = 1;
      ctx.filter = "blur(34px)";

      for (let i = 0; i < 6; i += 1) {
        const nx = 0.04 + i * 0.19;
        const x = width * nx + Math.sin(t * 0.3 + i * 1.2) * 50;
        const y = surfaceY(x, width, height, t) + 90 + Math.cos(t * 0.24 + i * 0.8) * 40;
        const shimmer = 0.72 + Math.sin(t * 0.8 + i * 1.5) * 0.28;
        const hue = (i / 6 + t * 0.04) % 1;
        const colors =
          hue < 0.25
            ? [`rgba(${CYAN}, ${0.5 * shimmer})`, `rgba(${INDIGO}, 0.24)`, `rgba(${BLACK}, 0)`]
            : [`rgba(${INDIGO}, ${0.6 * shimmer})`, `rgba(${INDIGO}, 0.2)`, `rgba(${BLACK}, 0)`];
        blob(ctx, x, y, width * 0.24, 120, [
          [0, colors[0]],
          [0.5, colors[1]],
          [1, colors[2]],
        ]);
      }

      ctx.restore();
      driveWave(now);
      frameId = requestAnimationFrame(frame);
    };

    resize();
    const stopResize = onViewportChange(resize);
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      stopResize();
    };
  }, []);

  if (isSafari || isMobile) {
    return <div className="aurora aurora-css" aria-hidden="true" />;
  }

  return <canvas ref={canvasRef} className="aurora" aria-hidden="true" />;
}
