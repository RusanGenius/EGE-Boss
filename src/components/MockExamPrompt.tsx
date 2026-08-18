import React, { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Award, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function MockExamPrompt() {
  const { mockExamPrompt, hideMockExamPrompt, navigateToMocks, state } = useApp();
  const [progress, setProgress] = useState(100);
  const isMonochrome = state.settings.theme === 'monochrome';
  const accentColor = isMonochrome ? '#fafafa' : '#a3e635';

  useEffect(() => {
    if (!mockExamPrompt || !mockExamPrompt.show) return;

    setProgress(100);
    const startTime = Date.now();
    const duration = 5000; // 5 seconds display

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        clearInterval(interval);
        hideMockExamPrompt();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [mockExamPrompt?.id, mockExamPrompt?.show, hideMockExamPrompt]);

  if (!mockExamPrompt || !mockExamPrompt.show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-[360px] pointer-events-auto"
      >
        <div className="bg-[#141416]/95 border border-white/15 rounded-2xl p-4 shadow-[0_16px_48px_rgba(0,0,0,0.85)] backdrop-blur-xl relative overflow-hidden flex flex-col gap-3 group">
          {/* 5-second countdown progress bar */}
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-75 ease-linear ${isMonochrome ? 'bg-white' : 'bg-[#a3e635]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-start justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0`}>
                <Award size={20} className={isMonochrome ? 'text-white' : 'text-[#a3e635]'} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#717171] uppercase tracking-wider">
                  Сессия завершена • {mockExamPrompt.subject}
                </div>
                <div className="text-sm font-semibold text-[#fafafa] mt-0.5">
                  Добавить результат пробника?
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                hideMockExamPrompt();
              }}
              className="p-1 rounded-lg text-[#717171] hover:text-[#fafafa] hover:bg-white/10 transition-all cursor-pointer -mr-1 -mt-1"
              title="Закрыть"
            >
              <X size={16} />
            </button>
          </div>

          <button
            onClick={() => navigateToMocks(mockExamPrompt.subject)}
            className="w-full bg-[#fafafa] hover:bg-[#e4e4e7] active:scale-[0.98] text-[#090909] font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-0.5"
          >
            <span>Добавить результат пробника</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
