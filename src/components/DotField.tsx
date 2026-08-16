import { useEffect, useRef } from "react";
import { isIOS, onViewportChange, viewportSize } from "../lib/viewport";

const GAP = 16;

export default function DotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isIOS ? 1.5 : 2);
      const { width, height } = viewportSize();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(210, 230, 255, 0.2)";
      ctx.beginPath();

      const cols = Math.ceil(width / GAP) + 2;
      const rows = Math.ceil(height / GAP) + 2;

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const x = c * GAP;
          const y = r * GAP;
          ctx.moveTo(x + 0.72, y);
          ctx.arc(x, y, 0.72, 0, Math.PI * 2);
        }
      }

      ctx.fill();
    };

    draw();
    return onViewportChange(draw);
  }, []);

  return <canvas ref={canvasRef} className="dot-field" aria-hidden="true" />;
}
