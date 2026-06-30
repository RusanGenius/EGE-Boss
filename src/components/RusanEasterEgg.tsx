import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

const PALETTE = [
  '#f43f5e',
  '#a3e635',
  '#38bdf8',
  '#fbbf24',
  '#ec4899',
  '#a855f7',
  '#10b981',
  '#f97316',
  '#fafafa',
  '#c084fc',
];

export function RusanEasterEgg() {
  const [isActive, setIsActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const handleTrigger = () => {
      setIsActive(true);
    };

    window.addEventListener('trigger-rusan-easter-egg', handleTrigger);
    return () => {
      window.removeEventListener('trigger-rusan-easter-egg', handleTrigger);
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;

    particlesRef.current = [];

    const explosionTimeout = setTimeout(() => {
      triggerExplosion();
    }, 200);

    const closeTimeout = setTimeout(() => {
      setIsActive(false);
    }, 3500);

    return () => {
      clearTimeout(explosionTimeout);
      clearTimeout(closeTimeout);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive]);

  const triggerExplosion = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const count = 120;
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 12 + Math.random() * 28; 
      
      newParticles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 10,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)]
      });
    }

    particlesRef.current = newParticles;
    animate();
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    let anyActive = false;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      const margin = 50;
      if (
        p.x >= -margin &&
        p.x <= canvas.width + margin &&
        p.y >= -margin &&
        p.y <= canvas.height + margin
      ) {
        anyActive = true;
        
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }

    if (anyActive) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 50);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive]);

  const handleDismiss = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsActive(false);
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          onClick={handleDismiss}
          onMouseDown={handleDismiss}
          onMouseUp={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onTouchStart={handleDismiss}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); }}
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-center justify-center select-none overflow-hidden pointer-events-auto cursor-default"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none w-full h-full z-10"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              opacity: { duration: 0.3, ease: "easeOut" },
              scale: { duration: 0.4, ease: "easeOut" }
            }}
            className="relative z-20 text-center px-6 pointer-events-none"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-wider text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] select-none">
              Русан — гений
            </h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
