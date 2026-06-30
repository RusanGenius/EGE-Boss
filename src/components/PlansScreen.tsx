import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { Card, Button } from './ui';
import { Subject, Plan } from '../types';
import { Trash2, Plus, X } from 'lucide-react';
import { getTaskTypes, getBlockSubtasks } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

export function PlansScreen() {
  const { state, addPlan, deletePlan } = useApp();
  const isMonochrome = state.settings.theme === 'monochrome';
  const accentColor = isMonochrome ? 'bg-white' : 'bg-[#a3e635]';
  const textColor = isMonochrome ? 'text-[#fafafa]' : 'text-[#a3e635]';
  const borderColor = isMonochrome ? 'border-white/20' : 'border-[#a3e635]/50';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState<Subject>(state.settings.activeSubjects[0] || 'Математика');
  const [taskType, setTaskType] = useState<string>('');
  const [targetTasks, setTargetTasks] = useState<string>('10');
  const [error, setError] = useState<string>('');

  const availableTasks = React.useMemo(() => {
    return getTaskTypes(subject);
  }, [subject]);

  useEffect(() => {
    if (availableTasks.length > 0) {
      setTaskType(availableTasks[0]);
    }
  }, [availableTasks]);

  const getCompletedCountForPlan = (plan: Plan) => {
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
    
    return correctCount;
  };

  const plansWithProgress = state.plans.map(plan => {
    const completed = getCompletedCountForPlan(plan);
    const progress = plan.targetTasks > 0 ? Math.round((completed / plan.targetTasks) * 100) : 0;
    return {
      ...plan,
      completedTasks: completed,
      progress: Math.min(progress, 100)
    };
  });

  const totalPlans = plansWithProgress.length;
  const totalCompleted = plansWithProgress.reduce((acc, p) => acc + p.completedTasks, 0);
  const totalTarget = plansWithProgress.reduce((acc, p) => acc + p.targetTasks, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCount = parseInt(targetTasks, 10);
    
    if (isNaN(targetCount) || targetCount <= 0) {
      setError('Введите корректное число задач (больше 0)');
      return;
    }

    if (!taskType) {
      setError('Выберите тип задач');
      return;
    }

    addPlan({
      title: taskType,
      subject,
      taskType,
      targetTasks: targetCount
    });

    setIsModalOpen(false);
    setError('');
    setTargetTasks('10');
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-light text-[#fafafa]">Планы</h2>
          <Button 
            variant="white" 
            className="text-sm flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Добавить
          </Button>
        </div>

        <Card className="flex flex-col gap-6 relative overflow-hidden">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] text-[#717171] uppercase tracking-widest mb-1">Всего планов</div>
              <div className="text-3xl font-light text-[#fafafa]">{totalPlans}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#717171] uppercase tracking-widest mb-1">Нужно решить</div>
              <div className={`text-3xl font-light ${textColor}`}>
                {Math.max(0, totalTarget - totalCompleted)}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-[#717171] uppercase tracking-widest font-bold">
              <span>Общий прогресс</span>
              <span>{Math.min(overallProgress, 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full ${accentColor} transition-all`} style={{ width: `${Math.min(overallProgress, 100)}%` }} />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {plansWithProgress.length === 0 ? (
            <div className="text-center py-16 border border-white/5 rounded-2xl bg-[#111112]/50">
              <div className="text-sm text-[#717171]">У вас пока нет активных планов подготовки</div>
            </div>
          ) : (
            plansWithProgress.map(plan => (
              <Card key={plan.id} className="p-5 relative group overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[#fafafa] mb-1.5">
                      {plan.subject}
                    </span>
                    <h3 className="text-base font-semibold text-[#fafafa]">{plan.taskType}</h3>
                  </div>
                  
                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="p-1.5 rounded-lg text-[#717171] hover:text-red-500 hover:bg-red-500/10 transition-all"
                    title="Удалить план"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#717171]">
                    <span>
                      {plan.completedTasks} <span className="font-normal text-[#444448]">/</span> {plan.targetTasks} верно
                    </span>
                    <span className={plan.progress >= 100 ? textColor : 'text-[#717171]'}>
                      {plan.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${accentColor} transition-all`} style={{ width: `${plan.progress}%` }} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#020205]/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#111112] border border-white/10 rounded-2xl p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[#717171] hover:text-[#fafafa] hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-light text-[#fafafa] mb-6">Новый план подготовки</h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] text-[#717171] uppercase tracking-widest font-bold mb-2">
                    Предмет
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as Subject)}
                    className="w-full bg-[#090909] border border-white/10 rounded-xl py-2.5 px-3 text-[#fafafa] focus:border-white/30 focus:outline-none text-sm cursor-pointer"
                  >
                    {state.settings.activeSubjects.map(subj => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#717171] uppercase tracking-widest font-bold mb-2">
                    Тип задач
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-[#090909] border border-white/10 rounded-xl py-2.5 px-3 text-[#fafafa] focus:border-white/30 focus:outline-none text-sm cursor-pointer"
                  >
                    {availableTasks.map(task => (
                      <option key={task} value={task}>
                        {task}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#717171] uppercase tracking-widest font-bold mb-2">
                    Сколько задач решить верно
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetTasks}
                    onChange={(e) => setTargetTasks(e.target.value)}
                    placeholder="Например, 10"
                    className={`w-full bg-[#090909] border border-white/10 rounded-xl py-2.5 px-3 text-[#fafafa] focus:outline-none text-sm font-mono ${isMonochrome ? 'focus:border-white/40' : 'focus:border-[#a3e635]'}`}
                  />
                </div>

                {error && (
                  <div className="text-xs text-red-500 font-medium">
                    {error}
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="white"
                    className="flex-1 bg-transparent hover:bg-white/5 text-[#717171] border border-white/5"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    variant="white"
                    className={`flex-1 ${isMonochrome ? 'bg-white hover:bg-zinc-200 text-[#090909]' : 'bg-[#a3e635] hover:bg-[#bbf246] text-[#090909]'} border-none font-bold`}
                  >
                    Создать
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
