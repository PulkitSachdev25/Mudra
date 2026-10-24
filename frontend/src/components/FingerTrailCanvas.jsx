import React, { useEffect, useRef } from 'react';

export default function FingerTrailCanvas() {
  const canvasRef = useRef(null);
  const pointsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointsRef.current.push({
        x,
        y,
        life: 1.0,
        size: Math.random() * 3 + 2,
        jitterX: (Math.random() - 0.5) * 4,
        jitterY: (Math.random() - 0.5) * 4,
      });
      // Cap buffer size
      if (pointsRef.current.length > 50) {
        pointsRef.current.shift();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);

    let animationFrameId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const points = pointsRef.current;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.life -= 0.025; // fade out speed

        if (p.life > 0) {
          // Draw textured particle dot
          ctx.beginPath();
          ctx.arc(p.x + p.jitterX * (1 - p.life), p.y + p.jitterY * (1 - p.life), p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.4})`;
          ctx.fill();

          // Connect to previous point with textured stroke
          if (i > 0) {
            const prev = points[i - 1];
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(210, 220, 240, ${p.life * 0.25})`;
            ctx.lineWidth = p.size * p.life * 0.8;
            ctx.stroke();
          }
        }
      }

      // Filter out dead points
      pointsRef.current = points.filter(p => p.life > 0);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10 w-full h-full"
    />
  );
}
