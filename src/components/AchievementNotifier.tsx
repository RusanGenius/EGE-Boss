import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { getAchievements, Achievement } from '../utils/achievements';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Star, 
  Sparkles, 
  Award, 
  Flame, 
  Calculator, 
  Clock, 
  CheckCircle2, 
  Shield, 
  HelpCircle, 
  X 
} from 'lucide-react';

export function AchievementNotifier() {
  const { state } = useApp();
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [activeNotification, setActiveNotification] = useState<Achievement | null>(null);
  
  // Tracks all achievements that have already been completed so we do not notify them on mount
  const completedSetRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  // Initialize the completed set and detect subsequent changes
  useEffect(() => {
    const achievements = getAchievements(state);
    const currentCompleted = achievements.filter(a => a.isCompleted).map(a => a.id);

    if (!isInitializedRef.current) {
      // First mount: just register what's already completed so we don't trigger alerts
      completedSetRef.current = new Set(currentCompleted);
      isInitializedRef.current = true;
      return;
    }

    // Subsequent updates: detect new completions
    const newlyCompleted: Achievement[] = [];
    for (const ach of achievements) {
      if (ach.isCompleted && !completedSetRef.current.has(ach.id)) {
        newlyCompleted.push(ach);
        completedSetRef.current.add(ach.id);
      }
    }

    if (newlyCompleted.length > 0) {
      // Append new achievements to queue
      setQueue(prev => [...prev, ...newlyCompleted]);
    }
  }, [state]);

  // 1. Pop from queue when there's no active notification
  useEffect(() => {
    if (activeNotification === null && queue.length > 0) {
      const next = queue[0];
      setQueue(prev => prev.slice(1));
      setActiveNotification(next);
    }
  }, [queue, activeNotification]);

  // 2. Timer to auto-dismiss the active notification
  useEffect(() => {
    if (activeNotification !== null) {
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, 5000); // Display for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [activeNotification]);

  const renderIcon = (name: string, size = 24, className = '') => {
    switch (name) {
      case 'Calculator': return <Calculator size={size} className={className} />;
      case 'Clock': return <Clock size={size} className={className} />;
      case 'CheckCircle2': return <CheckCircle2 size={size} className={className} />;
      case 'Flame': return <Flame size={size} className={className} />;
      case 'Award': return <Award size={size} className={className} />;
      case 'Sparkles': return <Sparkles size={size} className={className} />;
      case 'Trophy': return <Trophy size={size} className={className} />;
      case 'Star': return <Star size={size} className={className} />;
      case 'Shield': return <Shield size={size} className={className} />;
      default: return <HelpCircle size={size} className={className} />;
    }
  };

  // Pre-generate confetti particle positions for the "salute" burst effect
  const particles = Array.from({ length: 30 }).map((_, i) => {
    const angle = (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 50 + Math.random() * 110;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - 20; // Bias upward slightly
    const colors = ['#a3e635', '#ffffff', '#34d399', '#facc15', '#6ee7b7', '#f472b6'];
    const shapes = ['circle', 'square', 'star'];
    return {
      id: i,
      x,
      y,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.2,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotate: Math.random() * 360
    };
  });

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none w-full max-w-md px-4 select-none">
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            onClick={() => setActiveNotification(null)}
            className="pointer-events-auto relative overflow-hidden rounded-3xl bg-zinc-900 border border-emerald-500/30 p-3.5 px-5 shadow-[0_20px_50px_rgba(16,185,129,0.25)] flex items-center gap-3.5 group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
          >
            {/* Animated glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#a3e635]/5 via-emerald-500/10 to-[#a3e635]/5 opacity-50 group-hover:opacity-100 transition-opacity" />

            {/* Celebrate salute/confetti burst particles container */}
            <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center">
              {particles.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                  animate={{ 
                    x: p.x, 
                    y: p.y, 
                    scale: [0, 1, 1, 0.8, 0], 
                    opacity: [1, 1, 0.8, 0],
                    rotate: p.rotate + 360
                  }}
                  transition={{ 
                    duration: 1.6, 
                    delay: p.delay, 
                    ease: [0.1, 0.8, 0.3, 1] 
                  }}
                  style={{
                    position: 'absolute',
                    backgroundColor: p.color,
                    width: p.size,
                    height: p.size,
                    borderRadius: p.shape === 'circle' ? '50%' : '2px',
                  }}
                />
              ))}
            </div>

            {/* Achievement Icon */}
            <div className="relative shrink-0">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.15, stiffness: 300, damping: 20 }}
                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${activeNotification.color} text-white flex items-center justify-center shadow-lg shadow-emerald-500/10 relative z-10`}
              >
                {renderIcon(activeNotification.iconName, 20)}
              </motion.div>
              {/* Radial pulse background */}
              <div className="absolute -inset-1 rounded-2xl bg-emerald-500/10 blur-sm animate-pulse pointer-events-none" />
            </div>

            {/* Achievement Content */}
            <div className="flex-1 min-w-0 relative z-10">
              <h4 className="text-sm font-extrabold text-[#fafafa] leading-snug tracking-tight truncate">
                {activeNotification.title}
              </h4>
              <p className="text-xs text-[#b3b3b3] font-medium leading-normal mt-0.5">
                {activeNotification.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
