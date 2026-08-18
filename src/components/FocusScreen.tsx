import React, { useState, useEffect, useRef } from 'react';
import { Play, Maximize, Minimize } from 'lucide-react';
import { useApp } from '../store';
import { Card, Button } from './ui';
import { Subject } from '../types';
import { cn, isBlockTask, getBlockSubtasks, getTaskTypes, getCompositeSessionStats } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

const CONFETTI_COLORS = ['#f43f5e', '#a3e635', '#38bdf8', '#fbbf24', '#ec4899', '#a855f7', '#10b981', '#f97316'];

function Confetti({ active }: { active: boolean }) {
  const particles = React.useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 120 }).map((_, i) => {
      const size = Math.floor(Math.random() * 6) + 6;
      const left = Math.random() * 100;
      const delay = Math.random() * 5; // staggered start from 0 to 5 seconds
      const duration = Math.random() * 2.5 + 3.5; // fall duration of 3.5 to 6 seconds
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const sway = Math.floor(Math.random() * 140) - 70;
      const rotStart = Math.floor(Math.random() * 360);
      const rotEnd = rotStart + Math.floor(Math.random() * 720) + 360;
      
      return {
        id: i,
        size,
        left: `${left}%`,
        delay: `${delay}s`,
        duration: `${duration}s`,
        color,
        sway: `${sway}px`,
        rotStart: `${rotStart}deg`,
        rotEnd: `${rotEnd}deg`,
      };
    });
  }, [active]);

  if (!active) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(var(--rot-start)) translateX(0);
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(var(--rot-end)) translateX(var(--sway));
            opacity: 0;
          }
        }
        .confetti-particle {
          position: absolute;
          top: -20px;
          animation: confettiFall var(--dur) linear forwards;
          animation-delay: var(--delay);
          will-change: transform, opacity;
        }
      `}} />
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className="confetti-particle"
            style={{
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '2px' : '0px',
              '--dur': p.duration,
              '--delay': p.delay,
              '--sway': p.sway,
              '--rot-start': p.rotStart,
              '--rot-end': p.rotEnd,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}

export function FocusScreen() {
  const { 
    state, 
    activeSession,
    isFullscreen,
    setIsFullscreen,
    startSession,
    pauseSession,
    resumeSession,
    addSessionAnswer,
    saveSessionAnswerComment,
    finishSession,
    saveSession,
    discardSession,
    setCompositeCorrectness,
    addCompositeRoundAnswers,
    showMockExamPrompt,
    navigateToMocks
  } = useApp();

  // Local setup states
  const [subject, setSubject] = useState<Subject>(activeSession.subject || 'Математика');
  const [taskType, setTaskType] = useState(activeSession.taskType || 'Все задания');
  const [targetInput, setTargetInput] = useState(activeSession.targetInput || '10');

  // Dynamically update available task types when subject changes (includes 'Все задания')
  const availableTaskTypes = React.useMemo(() => {
    return getTaskTypes(subject, true);
  }, [subject]);

  useEffect(() => {
    if (!availableTaskTypes.includes(taskType)) {
      setTaskType(availableTaskTypes[0]);
    }
  }, [subject, availableTaskTypes, taskType]);

  // Comment overlay states
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentingAnswerId, setCommentingAnswerId] = useState<string | null>(null);
  const [currentComment, setCurrentComment] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const commentRef = useRef<HTMLDivElement>(null);

  // Pixel shift state for screen burn-in protection
  const [burnShift, setBurnShift] = useState({ x: 0, y: 0 });

  // Update local setup states if global activeSession is in setup and values change
  useEffect(() => {
    if (activeSession.focusState === 'setup') {
      setSubject(activeSession.subject);
      setTaskType(activeSession.taskType);
      setTargetInput(activeSession.targetInput);
    }
  }, [activeSession.focusState, activeSession.subject, activeSession.taskType, activeSession.targetInput]);

  useEffect(() => {
    if (!state.settings.screenBurnProtection || activeSession.focusState !== 'active') {
      setBurnShift({ x: 0, y: 0 });
      return;
    }
    
    // Set a subtle initial shift when enabled
    setBurnShift({ x: 2, y: -2 });

    const interval = setInterval(() => {
      const sx = Math.floor(Math.random() * 13) - 6; // -6 to 6 px
      const sy = Math.floor(Math.random() * 13) - 6; // -6 to 6 px
      setBurnShift({ x: sx, y: sy });
    }, 10000);
    return () => clearInterval(interval);
  }, [state.settings.screenBurnProtection, activeSession.focusState]);

  useEffect(() => {
    if (!showCommentInput) return;
    const handleGlobalClick = (e: MouseEvent) => {
      if (
        commentRef.current && 
        !commentRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.error-btn') &&
        !(e.target as HTMLElement).closest('.success-btn')
      ) {
        setShowCommentInput(false);
        setCommentingAnswerId(null);
        setCurrentComment('');
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [showCommentInput]);

  const handleStart = () => {
    setShowConfetti(false);
    startSession(subject, taskType, targetInput);
  };

  const handleAnswer = (isCorrect: boolean) => {
    const newAnswer = addSessionAnswer(isCorrect);
    
    if (!isCorrect && !state.settings.hideErrorComments) {
      setCommentingAnswerId(newAnswer.id);
      setCurrentComment('');
      setShowCommentInput(true);
    } else {
      setShowCommentInput(false);
      setCommentingAnswerId(null);
      setCurrentComment('');
    }
  };

  const handleSaveComment = () => {
    if (commentingAnswerId && currentComment.trim()) {
      saveSessionAnswerComment(commentingAnswerId, currentComment);
    }
    setShowCommentInput(false);
    setCommentingAnswerId(null);
    setCurrentComment('');
  };

  const handleCancelComment = () => {
    setShowCommentInput(false);
    setCommentingAnswerId(null);
    setCurrentComment('');
  };

  const handleFinish = () => {
    finishSession();
  };

  const { correctCount: activeCorrectCount, errorCount: activeErrorCount, markers: activeMarkers } = React.useMemo(() => {
    return getCompositeSessionStats(activeSession.subject, activeSession.taskType, activeSession.answers);
  }, [activeSession.subject, activeSession.taskType, activeSession.answers]);

  const handleSaveSession = () => {
    const isAllTasks = activeSession.taskType === 'Все задания';
    let isTargetAchieved = false;

    if (isAllTasks) {
      const targetMinutes = parseInt(activeSession.targetInput, 10);
      const hasTargetVal = !isNaN(targetMinutes) && targetMinutes > 0;
      const targetSeconds = targetMinutes * 60;
      isTargetAchieved = hasTargetVal && activeSession.elapsedSeconds <= targetSeconds && activeSession.elapsedSeconds > 0;
    } else {
      const targetCountVal = parseInt(activeSession.targetInput, 10);
      const hasTargetVal = !isNaN(targetCountVal) && targetCountVal > 0;
      isTargetAchieved = hasTargetVal && activeCorrectCount >= targetCountVal;
    }

    const sessionSubject = activeSession.subject;
    saveSession();

    if (isTargetAchieved) {
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
      }, 12000);
    }

    if (isAllTasks) {
      showMockExamPrompt(sessionSubject);
    }
  };

  const handleDiscardSession = () => {
    discardSession();
  };

  // Fullscreen support state & logic for mobile
  const [showFullscreenBtn, setShowFullscreenBtn] = useState(true);
  const fullscreenBtnTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleScreenTap = () => {
    setShowFullscreenBtn(true);
    if (fullscreenBtnTimerRef.current) {
      clearTimeout(fullscreenBtnTimerRef.current);
    }
    fullscreenBtnTimerRef.current = setTimeout(() => {
      setShowFullscreenBtn(false);
    }, 3000);
  };

  useEffect(() => {
    if (activeSession.focusState === 'active') {
      setShowFullscreenBtn(true);
      if (fullscreenBtnTimerRef.current) {
        clearTimeout(fullscreenBtnTimerRef.current);
      }
      fullscreenBtnTimerRef.current = setTimeout(() => {
        setShowFullscreenBtn(false);
      }, 3000);
    }
    return () => {
      if (fullscreenBtnTimerRef.current) {
        clearTimeout(fullscreenBtnTimerRef.current);
      }
    };
  }, [activeSession.focusState]);

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetState = !isFullscreen;
    
    // Toggle the shared store state immediately (this guarantees UI adjustments will work everywhere!)
    setIsFullscreen(targetState);
    
    // Try to trigger real native browser fullscreen as progressive enhancement
    if (targetState) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn(`Native fullscreen not supported or blocked: ${err.message}`);
        });
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.warn(`Error exiting native fullscreen: ${err.message}`);
        });
      }
    }
  };

  // Helper to format any seconds amount
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Live seconds calculation
  const currentSeconds = activeSession.elapsedSeconds + 
    (activeSession.startTime ? Math.floor((Date.now() - activeSession.startTime) / 1000) : 0);

  const isAllTasksSession = activeSession.taskType === 'Все задания';
  const targetCount = parseInt(activeSession.targetInput, 10);
  const hasTarget = !isNaN(targetCount) && targetCount > 0;
  const targetMinutes = parseInt(activeSession.targetInput, 10);
  const hasTargetMinutes = !isNaN(targetMinutes) && targetMinutes > 0;
  const targetSeconds = targetMinutes * 60;
  const remainingSeconds = Math.max(0, targetSeconds - currentSeconds);

  return (
    <AnimatePresence mode="wait">
      {activeSession.focusState === 'setup' && (
        <motion.div
          key="setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="flex-1 flex items-center justify-center p-8 relative"
        >
          <Confetti active={showConfetti} />
          <Card className="w-[480px] p-8 md:p-10 shadow-2xl bg-[#111112] relative z-10">
            <h2 className="text-3xl font-light text-[#fafafa] mb-10 text-center">Новая сессия</h2>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#717171] uppercase tracking-widest text-center block">Предмет</label>
                <select 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="w-full bg-[#111112] border border-white/10 text-[#fafafa] text-base rounded-2xl px-5 py-4 outline-none focus:border-white/30 appearance-none transition-all text-center cursor-pointer"
                  style={{ textAlignLast: 'center' }}
                >
                  {state.settings.activeSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#717171] uppercase tracking-widest text-center block">Тип заданий</label>
                <select 
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full bg-[#111112] border border-white/10 text-[#fafafa] text-base rounded-2xl px-5 py-4 outline-none focus:border-white/30 appearance-none transition-all text-center cursor-pointer"
                  style={{ textAlignLast: 'center' }}
                >
                  {availableTaskTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-[#717171] uppercase tracking-widest text-center block">
                  {taskType === 'Все задания' ? 'Цель (минуты)' : 'Цель'}
                </label>
                <input 
                  type="text" 
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder={taskType === 'Все задания' ? 'Количество минут (например, 60)' : 'Без ограничений'}
                  className="w-full bg-[#111112] border border-white/10 text-[#fafafa] text-base rounded-2xl px-5 py-4 outline-none focus:border-white/30 transition-all text-center"
                />
              </div>

              <Button variant="white" onClick={handleStart} className="w-full py-4.5 text-lg mt-6 font-semibold rounded-full shadow-[0_4px_25px_rgba(255,255,255,0.12)]">
                <Play size={20} fill="currentColor" />
                НАЧАТЬ
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {activeSession.focusState === 'active' && (() => {
        const m = Math.floor(currentSeconds / 60);
        const s = currentSeconds % 60;
        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');

        return (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={handleScreenTap}
            className="flex-1 flex flex-col items-center justify-center p-8 relative w-full h-full"
          >
            {/* Minimalist Fullscreen Toggle Button for Mobile Devices */}
            <AnimatePresence>
              {showFullscreenBtn && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onClick={toggleFullscreen}
                  className="md:hidden absolute top-4 right-4 z-40 p-2.5 rounded-full bg-white/5 border border-white/10 text-[#717171] hover:text-[#fafafa] active:scale-95 transition-all outline-none focus:outline-none"
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </motion.button>
              )}
            </AnimatePresence>
            <div
              style={{
                transform: `translate(${burnShift.x}px, ${burnShift.y}px)`,
                transition: 'transform 1s ease-in-out'
              }}
              className="flex-1 flex flex-col items-center justify-center w-full h-full"
            >
              <div className="flex flex-col items-center max-w-md w-full">
                {!state.settings.hideTaskMarkers && (
                  <div className="text-xs font-semibold text-[#717171] uppercase tracking-widest mb-6 select-none">
                    {activeSession.subject} • {activeSession.taskType}
                  </div>
                )}
                
                {!state.settings.hideTimer && (
                  <button 
                    onClick={() => {
                      if (activeSession.startTime === null) {
                        resumeSession();
                      } else {
                        pauseSession();
                      }
                    }}
                    className={cn(
                      "text-[120px] leading-none font-sans font-extralight tracking-tight mb-8 tabular-nums flex items-center justify-center select-none cursor-pointer hover:opacity-85 active:scale-98 transition-all",
                      activeSession.startTime === null ? "text-[#fafafa]/50 animate-pulse" : "text-[#fafafa]"
                    )}
                  >
                    {state.settings.timerMode === 'onlyMinutes' ? (
                      <span>{mStr}</span>
                    ) : state.settings.timerMode === 'currentTime' ? (() => {
                      const now = new Date();
                      const hours = now.getHours();
                      const mins = now.getMinutes().toString().padStart(2, '0');
                      return (
                        <>
                          <span>{hours}</span>
                          <span className={cn(
                            "px-2 flex items-center justify-center relative -top-[12px] font-sans select-none",
                            activeSession.startTime === null ? "text-[#fafafa]/20" : "text-[#fafafa]/40"
                          )}>:</span>
                          <span>{mins}</span>
                        </>
                      );
                    })() : (
                      <>
                        <span>{mStr}</span>
                        <span className={cn(
                          "px-2 flex items-center justify-center relative -top-[12px] font-sans select-none",
                          activeSession.startTime === null ? "text-[#fafafa]/20" : "text-[#fafafa]/40"
                        )}>:</span>
                        <span>{sStr}</span>
                      </>
                    )}
                  </button>
                )}

                {/* Hide task circles for 'Все задания' and when hideTaskMarkers setting is enabled */}
                {!isAllTasksSession && !state.settings.hideTaskMarkers && (
                  <div className="w-full overflow-hidden flex justify-center mb-12 h-3 px-2">
                    <div className="flex gap-2 justify-center items-center max-w-full">
                      {activeMarkers.slice(-16).map((m, i) => (
                        <motion.div 
                          key={m.id || i} 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className={`w-3 h-3 rounded-full shrink-0 ${m.isCorrect ? 'bg-[#a3e635]' : 'bg-[#f43f5e]'}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress bar for 'Все задания' (time-based) or regular tasks (count-based) */}
                {isAllTasksSession ? (
                  hasTargetMinutes && (
                    <div className="w-full mb-8">
                      <div className="flex justify-between items-center text-xs font-mono text-[#717171] mb-2 select-none">
                        <span>Цель: {targetMinutes} мин</span>
                        <span>
                          {currentSeconds <= targetSeconds 
                            ? `Осталось: ${formatTime(remainingSeconds)}` 
                            : `Время вышло (+${formatTime(currentSeconds - targetSeconds)})`}
                        </span>
                      </div>
                      <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            currentSeconds <= targetSeconds ? "bg-white/60" : "bg-[#f43f5e]"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (currentSeconds / targetSeconds) * 100)}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                    </div>
                  )
                ) : (
                  hasTarget && (
                    <div className="w-full mb-6">
                      <div className="flex justify-end text-xs font-mono text-[#717171] mb-2 select-none">
                        {activeCorrectCount} / {targetCount}
                      </div>
                      <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-white/60 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (activeCorrectCount / targetCount) * 100)}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                    </div>
                  )
                )}

                {/* Center interactive area */}
                {isAllTasksSession ? (
                  <div className="w-full flex items-center justify-center mb-16 min-h-[44px] select-none">
                    {activeSession.startTime === null && (
                      <span className="text-xs font-mono text-[#717171]/80 uppercase tracking-widest animate-pulse">
                        Пауза
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full relative mb-16">
                    {isBlockTask(activeSession.subject, activeSession.taskType) ? (
                      <div className="space-y-5 w-full">
                        <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
                          {getBlockSubtasks(activeSession.subject, activeSession.taskType).map((subtask) => {
                            const isCorrect = activeSession.compositeCorrectness?.[subtask];
                            
                            return (
                              <div key={subtask} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                                <span className="text-sm font-semibold text-[#fafafa]">{subtask}</span>
                                <div className="flex gap-2.5">
                                  <button
                                    onClick={() => setCompositeCorrectness(subtask, isCorrect === true ? null : true)}
                                    className={cn(
                                      "w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer font-bold border text-lg",
                                      isCorrect === true
                                        ? "bg-[#a3e635]/15 text-[#a3e635] border-[#a3e635]/30 shadow-[0_0_15px_rgba(163,230,53,0.15)]"
                                        : "bg-white/5 text-[#717171] border-transparent hover:text-white"
                                    )}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setCompositeCorrectness(subtask, isCorrect === false ? null : false)}
                                    className={cn(
                                      "w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer font-bold border text-lg",
                                      isCorrect === false
                                        ? "bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                                        : "bg-white/5 text-[#717171] border-transparent hover:text-white"
                                    )}
                                  >
                                    X
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <Button 
                          variant="white" 
                          onClick={addCompositeRoundAnswers} 
                          className="w-full py-4 text-base font-semibold rounded-full shadow-[0_4px_20px_rgba(255,255,255,0.12)]"
                        >
                          ГОТОВО
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 w-full">
                          <button 
                            onClick={() => handleAnswer(true)}
                            className="success-btn w-full bg-[#a3e635]/10 border border-[#a3e635]/30 hover:border-[#a3e635] hover:bg-[#a3e635]/20 text-[#fafafa] py-4 px-6 rounded-2xl flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span className="text-sm font-medium tracking-wider">ВЕРНО</span>
                            <span className="text-lg font-mono">{activeCorrectCount}</span>
                          </button>
                          
                          <button 
                            onClick={() => handleAnswer(false)}
                            className="error-btn w-full bg-[#f43f5e]/10 border border-[#f43f5e]/30 hover:border-[#f43f5e] hover:bg-[#f43f5e]/20 text-[#fafafa] py-4 px-6 rounded-2xl flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span className="text-sm font-medium tracking-wider">ОШИБКА</span>
                            <span className="text-lg font-mono">{activeErrorCount}</span>
                          </button>
                        </div>

                        {/* Absolute overlay for error notes */}
                        <AnimatePresence>
                          {showCommentInput && (
                            <motion.div 
                              ref={commentRef}
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="absolute top-[calc(100%+16px)] left-0 right-0 z-30"
                            >
                              <div className="p-4 bg-[#111112] border border-white/10 rounded-2xl flex flex-col gap-3 shadow-2xl shadow-black/80">
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Заметка к ошибке..."
                                  value={currentComment}
                                  onChange={e => setCurrentComment(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleSaveComment()}
                                  className="w-full bg-transparent text-[#fafafa] outline-none text-sm placeholder:text-[#555]"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" className="px-3 py-1.5 text-xs rounded-lg" onClick={handleCancelComment}>Отмена</Button>
                                  <Button variant="secondary" className="px-3 py-1.5 text-xs rounded-lg" onClick={handleSaveComment}>Сохранить</Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                <button 
                  onClick={handleFinish}
                  className="text-xs font-medium text-[#717171] hover:text-[#fafafa] uppercase tracking-widest transition-colors cursor-pointer"
                >
                  ЗАВЕРШИТЬ
                </button>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {activeSession.focusState === 'results' && (
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="flex-1 flex items-center justify-center p-8 relative"
        >
          <div className="absolute inset-0 bg-[#090909]/80 backdrop-blur-sm z-0" />
          <Card className="w-[440px] p-8 md:p-10 z-10 shadow-2xl bg-[#111112]">
            <h2 className="text-3xl font-light text-[#fafafa] mb-10 text-center">Итоги сессии</h2>
            
            <div className="space-y-4 mb-10">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-base text-[#717171]">Время</span>
                <span className="text-base font-mono text-[#fafafa]">{formatTime(currentSeconds)}</span>
              </div>
              
              {isAllTasksSession ? (
                hasTargetMinutes && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-base text-[#717171]">План по времени</span>
                      <span className="text-base font-mono text-[#fafafa]">{targetMinutes} мин</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-base text-[#717171]">Результат</span>
                      <span className={`text-base font-medium ${currentSeconds <= targetSeconds ? 'text-[#a3e635]' : 'text-[#f43f5e]'}`}>
                        {currentSeconds <= targetSeconds ? 'Успели вовремя! 🎉' : `Сверх плана (+${formatTime(currentSeconds - targetSeconds)})`}
                      </span>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-base text-[#717171]">Верно</span>
                    <span className="text-base font-mono text-[#fafafa]">{activeCorrectCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-base text-[#717171]">Ошибки</span>
                    <span className="text-base font-mono text-[#fafafa]">{activeErrorCount}</span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3.5">
              <Button variant="white" onClick={handleSaveSession} className="w-full py-4 text-base font-semibold rounded-full shadow-[0_4px_20px_rgba(255,255,255,0.12)]">СОХРАНИТЬ</Button>
              <Button variant="secondary" onClick={resumeSession} className="w-full py-4 text-base rounded-full">Продолжить</Button>
              <Button variant="ghost" onClick={handleDiscardSession} className="w-full py-4 text-base rounded-full">Не сохранять</Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
