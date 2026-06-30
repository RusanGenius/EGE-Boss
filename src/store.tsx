import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Session, Settings, Plan, TabType, ActiveSession, TimerModeType, Subject, Answer, MockExam } from './types';
import { INITIAL_STATE } from './seed';
import { isBlockTask, getBlockSubtasks, BLOCKS_CONFIG } from './utils';

const DEFAULT_ACTIVE_SESSION: ActiveSession = {
  focusState: 'setup',
  subject: 'Математика',
  taskType: 'Задание 1',
  targetInput: '10',
  elapsedSeconds: 0,
  startTime: null,
  answers: [],
  timerMode: 'default'
};

interface AppContextType {
  state: AppState;
  activeSession: ActiveSession;
  setTab: (tab: TabType) => void;
  addSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  resetData: () => void;
  importData: (importedState: Partial<AppState>) => void;
  startSession: (subject: Subject, taskType: string, targetInput: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  addSessionAnswer: (isCorrect: boolean) => Answer;
  saveSessionAnswerComment: (answerId: string, comment: string) => void;
  finishSession: () => void;
  saveSession: () => void;
  discardSession: () => void;
  setTimerMode: (mode: TimerModeType) => void;
  addMockExam: (mockExam: Omit<MockExam, 'id'>) => void;
  deleteMockExam: (id: string) => void;
  addPlan: (plan: Omit<Plan, 'id' | 'completedTasks' | 'createdAt'>) => void;
  deletePlan: (id: string) => void;
  setCompositeCorrectness: (subtaskType: string, isCorrect: boolean | null) => void;
  addCompositeRoundAnswers: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('egeboss_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_STATE, ...parsed };
      } catch (e) {
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });

  const [activeSession, setActiveSession] = useState<ActiveSession>(() => {
    const saved = localStorage.getItem('egeboss_active_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_ACTIVE_SESSION;
      }
    }
    return DEFAULT_ACTIVE_SESSION;
  });

  const [tick, setTick] = useState(0);

  useEffect(() => {
    localStorage.setItem('egeboss_data', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('egeboss_active_session', JSON.stringify(activeSession));
  }, [activeSession]);

  useEffect(() => {
    if (activeSession.startTime === null) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [activeSession.startTime]);

  useEffect(() => {
    if (state.plans.length === 0) return;

    let changed = false;
    const remainingPlans = state.plans.filter(plan => {
      const subtasks = getBlockSubtasks(plan.subject, plan.taskType);
      const isBlock = subtasks.length > 0;
      let correctCount = 0;

      state.sessions.forEach(session => {
        if (session.subject !== plan.subject) return;

        const sessionTime = new Date(session.date).getTime();
        if (plan.createdAt && sessionTime < plan.createdAt) return;

        if (session.taskType === plan.taskType) {
          correctCount += session.answers.filter(a => a.isCorrect && (!plan.createdAt || (a.timestamp && a.timestamp >= plan.createdAt))).length;
        } else if (isBlock && subtasks.includes(session.taskType)) {
          correctCount += session.answers.filter(a => a.isCorrect && (!plan.createdAt || (a.timestamp && a.timestamp >= plan.createdAt))).length;
        } else {
          session.answers.forEach(answer => {
            if (answer.isCorrect) {
              const itemTaskType = answer.taskType || session.taskType;
              if (itemTaskType === plan.taskType) {
                const answerTime = answer.timestamp || sessionTime;
                if (!plan.createdAt || answerTime >= plan.createdAt) {
                  correctCount++;
                }
              }
            }
          });
        }
      });

      const isCompleted = correctCount >= plan.targetTasks;
      if (isCompleted) {
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      setState(s => ({ ...s, plans: remainingPlans }));
    }
  }, [state.sessions, state.plans]);

  const setTab = (tab: TabType) => setState(s => ({ ...s, activeTab: tab }));
  
  const addSession = (session: Session) => setState(s => ({ ...s, sessions: [session, ...s.sessions] }));

  const deleteSession = (id: string) => setState(s => ({ ...s, sessions: s.sessions.filter(sess => sess.id !== id) }));
  
  const updateSettings = (settings: Partial<Settings>) => setState(s => ({ ...s, settings: { ...s.settings, ...settings } }));
  
  const resetData = () => {
    const emptyState: AppState = {
      sessions: [],
      plans: [],
      mockExams: [],
      settings: {
        hideTimer: false,
        hideErrorComments: false,
        hideTaskMarkers: false,
        screenBurnProtection: false,
        activeSubjects: ['Математика', 'Русский язык', 'Информатика', 'Физика'],
        syncCode: '------',
        syncCodeCreatedAt: undefined,
        theme: 'green'
      },
      activeTab: 'focus'
    };
    localStorage.removeItem('egeboss_data');
    localStorage.removeItem('egeboss_active_session');
    setState(emptyState);
    setActiveSession(DEFAULT_ACTIVE_SESSION);
  };

  const startSession = (subj: Subject, tType: string, tInput: string) => {
    let finalTaskType = tType;
    let initialCorrectness: { [subtask: string]: boolean | null } | undefined = undefined;

    // Check if the selected task is a block, or if it belongs to a block
    const allBlocksForSubject = BLOCKS_CONFIG[subj];
    if (allBlocksForSubject) {
      if (allBlocksForSubject[tType]) {
        finalTaskType = tType;
      } else {
        const parentBlock = Object.keys(allBlocksForSubject).find(blockName =>
          allBlocksForSubject[blockName].includes(tType)
        );
        if (parentBlock) {
          finalTaskType = parentBlock;
        }
      }
      
      if (allBlocksForSubject[finalTaskType]) {
        initialCorrectness = {};
        allBlocksForSubject[finalTaskType].forEach(sub => {
          initialCorrectness![sub] = null;
        });
      }
    }

    setActiveSession({
      focusState: 'active',
      subject: subj,
      taskType: finalTaskType,
      targetInput: tInput,
      elapsedSeconds: 0,
      startTime: Date.now(),
      answers: [],
      timerMode: 'default',
      compositeCorrectness: initialCorrectness
    });
  };

  const setCompositeCorrectness = (subtaskType: string, isCorrect: boolean | null) => {
    setActiveSession(prev => ({
      ...prev,
      compositeCorrectness: {
        ...(prev.compositeCorrectness || {}),
        [subtaskType]: isCorrect
      }
    }));
  };

  const addCompositeRoundAnswers = () => {
    setActiveSession(prev => {
      const newAnswers = [...prev.answers];
      const currentCorrectness = prev.compositeCorrectness || {};
      
      Object.keys(currentCorrectness).forEach(subtask => {
        const val = currentCorrectness[subtask];
        if (val !== null && val !== undefined) {
          newAnswers.push({
            id: Math.random().toString(),
            isCorrect: val,
            timestamp: Date.now(),
            taskType: subtask
          });
        }
      });

      // Reset all subtasks in the block back to null
      const resetCorrectness: { [subtask: string]: boolean | null } = {};
      Object.keys(currentCorrectness).forEach(subtask => {
        resetCorrectness[subtask] = null;
      });

      return {
        ...prev,
        answers: newAnswers,
        compositeCorrectness: resetCorrectness
      };
    });
  };

  const pauseSession = () => {
    setActiveSession(prev => {
      if (prev.startTime === null) return prev;
      const elapsed = prev.elapsedSeconds + Math.floor((Date.now() - prev.startTime) / 1000);
      return {
        ...prev,
        elapsedSeconds: elapsed,
        startTime: null
      };
    });
  };

  const resumeSession = () => {
    setActiveSession(prev => {
      return {
        ...prev,
        focusState: 'active',
        startTime: Date.now()
      };
    });
  };

  const addSessionAnswer = (isCorrect: boolean) => {
    const newAnswer: Answer = {
      id: Math.random().toString(),
      isCorrect,
      timestamp: Date.now()
    };
    setActiveSession(prev => ({
      ...prev,
      answers: [...prev.answers, newAnswer]
    }));
    return newAnswer;
  };

  const saveSessionAnswerComment = (answerId: string, comment: string) => {
    setActiveSession(prev => ({
      ...prev,
      answers: prev.answers.map(a => a.id === answerId ? { ...a, comment } : a)
    }));
  };

  const finishSession = () => {
    setActiveSession(prev => {
      const elapsed = prev.startTime !== null 
        ? prev.elapsedSeconds + Math.floor((Date.now() - prev.startTime) / 1000) 
        : prev.elapsedSeconds;
      return {
        ...prev,
        focusState: 'results',
        elapsedSeconds: elapsed,
        startTime: null
      };
    });
  };

  const saveSession = () => {
    const sessionToSave: Session = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      subject: activeSession.subject,
      taskType: activeSession.taskType,
      durationSeconds: activeSession.elapsedSeconds,
      answers: activeSession.answers
    };
    addSession(sessionToSave);
    setActiveSession(DEFAULT_ACTIVE_SESSION);
  };

  const discardSession = () => {
    setActiveSession(DEFAULT_ACTIVE_SESSION);
  };

  const setTimerMode = (mode: TimerModeType) => {
    setActiveSession(prev => ({
      ...prev,
      timerMode: mode
    }));
  };

  const addMockExam = (exam: Omit<MockExam, 'id'>) => {
    const newExam: MockExam = {
      ...exam,
      id: Math.random().toString(36).substring(7)
    };
    setState(s => ({
      ...s,
      mockExams: [newExam, ...s.mockExams]
    }));
  };

  const deleteMockExam = (id: string) => {
    setState(s => ({
      ...s,
      mockExams: s.mockExams.filter(exam => exam.id !== id)
    }));
  };

  const addPlan = (plan: Omit<Plan, 'id' | 'completedTasks' | 'createdAt'>) => {
    const newPlan: Plan = {
      ...plan,
      id: Math.random().toString(36).substring(7),
      completedTasks: 0,
      createdAt: Date.now()
    };
    setState(s => ({
      ...s,
      plans: [newPlan, ...s.plans]
    }));
  };

  const deletePlan = (id: string) => {
    setState(s => ({
      ...s,
      plans: s.plans.filter(p => p.id !== id)
    }));
  };

  const importData = (importedState: Partial<AppState>) => {
    setState(prev => {
      const newState = { ...prev, ...importedState, activeTab: prev.activeTab };
      localStorage.setItem('egeboss_data', JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <AppContext.Provider value={{ 
      state, 
      activeSession,
      setTab, 
      addSession, 
      deleteSession, 
      updateSettings, 
      resetData,
      importData,
      startSession,
      pauseSession,
      resumeSession,
      addSessionAnswer,
      saveSessionAnswerComment,
      finishSession,
      saveSession,
      discardSession,
      setTimerMode,
      addMockExam,
      deleteMockExam,
      addPlan,
      deletePlan,
      setCompositeCorrectness,
      addCompositeRoundAnswers
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
