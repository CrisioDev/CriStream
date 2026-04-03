import { useEffect, useRef } from "react";

/**
 * Floating golden particle background for the casino.
 * Canvas-based for performance. Creates ambient casino atmosphere.
 */
export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      size: number;
      opacity: number;
      opacityDir: number;
      color: string;
      type: "dot" | "sparkle" | "line";
    }

    const COLORS = [
      "rgba(255,215,0,", // gold
      "rgba(168,85,247,", // purple
      "rgba(255,140,0,", // orange
      "rgba(100,200,255,", // blue
      "rgba(255,100,150,", // pink
    ];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Create initial particles
    const COUNT = 80;
    for (let i = 0; i < COUNT; i++) {
      particles.push(createParticle());
    }

    function createParticle(): Particle {
      const type = Math.random() < 0.1 ? "sparkle" : Math.random() < 0.05 ? "line" : "dot";
      return {
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.5,
        size: type === "sparkle" ? 2 + Math.random() * 3 : type === "line" ? 1 : 1 + Math.random() * 2,
        opacity: Math.random() * 0.4 + 0.1,
        opacityDir: (Math.random() - 0.5) * 0.01,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        type,
      };
    }

    function drawSparkle(p: Particle) {
      const c = ctx!;
      c.save();
      c.translate(p.x, p.y);
      c.fillStyle = p.color + p.opacity + ")";
      // 4-pointed star
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.rotate(Math.PI / 4);
        c.moveTo(0, -p.size * 2);
        c.lineTo(p.size * 0.3, 0);
        c.lineTo(0, p.size * 2);
        c.lineTo(-p.size * 0.3, 0);
        c.closePath();
        c.fill();
      }
      c.restore();
    }

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const p of particles) {
        // Update
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.opacityDir;
        if (p.opacity > 0.5 || p.opacity < 0.05) p.opacityDir *= -1;
        p.opacity = Math.max(0.02, Math.min(0.5, p.opacity));

        // Wrap
        if (p.y < -10) { p.y = canvas!.height + 10; p.x = Math.random() * canvas!.width; }
        if (p.x < -10) p.x = canvas!.width + 10;
        if (p.x > canvas!.width + 10) p.x = -10;

        // Draw
        if (p.type === "sparkle") {
          drawSparkle(p);
        } else if (p.type === "line") {
          ctx!.strokeStyle = p.color + p.opacity * 0.3 + ")";
          ctx!.lineWidth = 0.5;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p.x + p.vx * 20, p.y + p.vy * 20);
          ctx!.stroke();
        } else {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fillStyle = p.color + p.opacity + ")";
          ctx!.fill();

          // Glow
          const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          grad.addColorStop(0, p.color + p.opacity * 0.3 + ")");
          grad.addColorStop(1, p.color + "0)");
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
          ctx!.fillStyle = grad;
          ctx!.fill();
        }
      }

      animId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
