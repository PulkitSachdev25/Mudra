import React, { useEffect, useRef } from 'react';

// Standard 21 MediaPipe Hand Landmark Topology (Normalized Base Coordinates)
const MP_HAND_NODES_BASE = [
  { id: 0, x: 0.50, y: 0.82, z: 0.0, label: 'WRIST' },
  // Thumb (1..4)
  { id: 1, x: 0.42, y: 0.74, z: -0.02, label: 'TH_CMC' },
  { id: 2, x: 0.36, y: 0.64, z: -0.04, label: 'TH_MCP' },
  { id: 3, x: 0.32, y: 0.54, z: -0.05, label: 'TH_IP' },
  { id: 4, x: 0.28, y: 0.46, z: -0.06, label: 'TH_TIP' },
  // Index Finger (5..8)
  { id: 5, x: 0.43, y: 0.50, z: -0.02, label: 'IN_MCP' },
  { id: 6, x: 0.41, y: 0.38, z: -0.04, label: 'IN_PIP' },
  { id: 7, x: 0.40, y: 0.28, z: -0.06, label: 'IN_DIP' },
  { id: 8, x: 0.39, y: 0.18, z: -0.07, label: 'IN_TIP' },
  // Middle Finger (9..12)
  { id: 9, x: 0.50, y: 0.48, z: -0.01, label: 'MI_MCP' },
  { id: 10, x: 0.50, y: 0.34, z: -0.03, label: 'MI_PIP' },
  { id: 11, x: 0.50, y: 0.23, z: -0.05, label: 'MI_DIP' },
  { id: 12, x: 0.50, y: 0.14, z: -0.07, label: 'MI_TIP' },
  // Ring Finger (13..16)
  { id: 13, x: 0.57, y: 0.50, z: -0.02, label: 'RI_MCP' },
  { id: 14, x: 0.58, y: 0.37, z: -0.03, label: 'RI_PIP' },
  { id: 15, x: 0.59, y: 0.27, z: -0.05, label: 'RI_DIP' },
  { id: 16, x: 0.60, y: 0.19, z: -0.06, label: 'RI_TIP' },
  // Pinky (17..20)
  { id: 17, x: 0.64, y: 0.54, z: -0.02, label: 'PI_MCP' },
  { id: 18, x: 0.67, y: 0.44, z: -0.03, label: 'PI_PIP' },
  { id: 19, x: 0.69, y: 0.36, z: -0.04, label: 'PI_DIP' },
  { id: 20, x: 0.70, y: 0.28, z: -0.05, label: 'PI_TIP' },
];

// MediaPipe Skeletal Bones Connections
const SKELETAL_BONES = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Knuckle Transverse Arches
  [5, 9], [9, 13], [13, 17],
];

export default function FingerTrailCanvas() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
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
      const normX = e.clientX / window.innerWidth;
      const normY = e.clientY / window.innerHeight;
      mouseRef.current.targetX = normX;
      mouseRef.current.targetY = normY;

      // Add subtle particle trail
      pointsRef.current.push({
        x: e.clientX,
        y: e.clientY,
        life: 1.0,
      });
      if (pointsRef.current.length > 30) {
        pointsRef.current.shift();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);

    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smoothly interpolate mouse parallax
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.05;
      m.y += (m.targetY - m.y) * 0.05;

      const parallaxX = (m.x - 0.5) * 50;
      const parallaxY = (m.y - 0.5) * 40;

      // Center and scale the hand wireframe
      const handScale = Math.min(canvas.width, canvas.height) * 0.72;
      const originX = canvas.width * 0.5 + parallaxX;
      const originY = canvas.height * 0.52 + parallaxY;

      // Calculate pixel coordinates for all 21 nodes
      const projectedNodes = MP_HAND_NODES_BASE.map((node) => {
        // Perspective micro-tilt
        const tiltOffsetX = (node.y - 0.5) * (m.x - 0.5) * 35;
        const tiltOffsetY = (node.x - 0.5) * (m.y - 0.5) * 25;

        const px = originX + (node.x - 0.5) * handScale + tiltOffsetX;
        const py = originY + (node.y - 0.5) * handScale + tiltOffsetY;

        return {
          ...node,
          px,
          py,
          telemetryX: ((px / canvas.width) + (node.id * 0.0031)).toFixed(3),
          telemetryY: ((py / canvas.height) + (node.id * 0.0024)).toFixed(3),
        };
      });

      // 1. Draw Hairline Skeletal Connections (Bones)
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';

      SKELETAL_BONES.forEach(([startIndex, endIndex]) => {
        const start = projectedNodes[startIndex];
        const end = projectedNodes[endIndex];
        ctx.beginPath();
        ctx.moveTo(start.px, start.py);
        ctx.lineTo(end.px, end.py);
        ctx.stroke();
      });

      // 2. Draw 21 Landmark Nodes with Crosshairs and Circles
      projectedNodes.forEach((node) => {
        const isTip = node.id === 4 || node.id === 8 || node.id === 12 || node.id === 16 || node.id === 20;
        const isWrist = node.id === 0;

        // Concentric ring
        ctx.beginPath();
        ctx.arc(node.px, node.py, isTip ? 3.5 : isWrist ? 4 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        // Technical crosshair ticks on tips and wrist
        if (isTip || isWrist) {
          ctx.beginPath();
          ctx.moveTo(node.px - 5, node.py);
          ctx.lineTo(node.px + 5, node.py);
          ctx.moveTo(node.px, node.py - 5);
          ctx.lineTo(node.px, node.py + 5);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.stroke();
        }

        // Monospace Telemetry Pills next to Key Fingertips & Wrist
        if (node.id === 8 || node.id === 12 || node.id === 4 || node.id === 0) {
          ctx.font = '9px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          const text = `[N${node.id < 10 ? '0' + node.id : node.id}] ${node.telemetryX},${node.telemetryY}`;
          ctx.fillText(text, node.px + 8, node.py + 3);
        }
      });

      // 3. Subtle Particle Cursor Trails (Strict Monochrome)
      const points = pointsRef.current;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.life -= 0.035;

        if (p.life > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5 * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.25})`;
          ctx.fill();

          if (i > 0) {
            const prev = points[i - 1];
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.life * 0.12})`;
            ctx.stroke();
          }
        }
      }
      pointsRef.current = points.filter((p) => p.life > 0);

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
      className="pointer-events-none fixed inset-0 z-10 w-full h-full select-none"
    />
  );
}
