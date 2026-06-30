import React, { useState } from 'react';
import { useApp } from '../store';
import { Card } from './ui';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, X, Clock, Trash2, ChevronLeft, ChevronDown } from 'lucide-react';
import { Session } from '../types';
import { isBlockTask } from '../utils';

export function HistoryScreen() {
  const { state, deleteSession } = useApp();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const toggleMonth = (month: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  if (selectedSession) {
    const correctCount = selectedSession.answers.filter(a => a.isCorrect).length;
    const errorCount = selectedSession.answers.filter(a => !a.isCorrect).length;
    const dateStr = format(parseISO(selectedSession.date), 'dd MMMM yyyy • HH:mm', { locale: ru });
    
    return (
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setSelectedSession(null)} 
              className="bg-[#1c1c1c] border border-white/5 hover:border-white/10 hover:bg-[#252525] text-[#fafafa] px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Назад</span>
            </button>
            
            <button 
              onClick={() => {
                deleteSession(selectedSession.id);
                setSelectedSession(null);
              }}
              className="bg-[#1c1c1c] border border-white/5 hover:border-white/10 hover:bg-[#252525] text-[#f43f5e] px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 size={16} />
              <span>Удалить</span>
            </button>
          </div>
          
          <Card className="relative overflow-hidden">
            <div className="mb-8">
              <h2 className="text-xl font-medium text-[#fafafa] mb-2">
                {selectedSession.subject} 
                <span className="text-[#717171] text-lg font-light ml-4">{selectedSession.taskType}</span>
              </h2>
              <div className="text-lg font-light text-[#717171]">{dateStr}</div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden mb-8">
              <div className="bg-[#1c1c1c] p-6 text-center">
                <div className="text-3xl font-light text-[#a3e635] mb-1">{correctCount}</div>
                <div className="text-[10px] text-[#717171] uppercase tracking-widest">Верно</div>
              </div>
              <div className="bg-[#1c1c1c] p-6 text-center">
                <div className="text-3xl font-light text-[#f43f5e] mb-1">{errorCount}</div>
                <div className="text-[10px] text-[#717171] uppercase tracking-widest">Ошибок</div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <h3 className="text-xs font-bold text-[#717171] uppercase tracking-widest">Результаты по ответам</h3>
              <div className="flex flex-wrap gap-2.5">
                {selectedSession.answers.map((a, i) => (
                  <div 
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                      a.isCorrect 
                        ? 'bg-[#a3e635] shadow-[0_0_8px_rgba(163,230,53,0.2)]' 
                        : 'bg-[#f43f5e] shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                    }`}
                    title={`${a.taskType || selectedSession.taskType}: ${a.isCorrect ? 'Верно' : 'Ошибка'}${a.comment ? ` — ${a.comment}` : ''}`}
                  />
                ))}
              </div>
            </div>

            {selectedSession.answers.some(a => !a.isCorrect && a.comment) && (
              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <h3 className="text-xs font-bold text-[#717171] uppercase tracking-widest">Комментарии к ошибкам</h3>
                <div className="space-y-3">
                  {selectedSession.answers
                    .filter(a => !a.isCorrect && a.comment)
                    .map((a, i) => {
                      const timeStr = a.timestamp ? format(new Date(a.timestamp), 'HH:mm') : '';
                      return (
                        <div key={a.id || i} className="p-4 bg-[#111112] border border-white/5 rounded-xl flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-[#f43f5e] mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-[#fafafa] leading-relaxed">{a.comment}</p>
                            {timeStr && (
                              <p className="text-[10px] text-[#717171] mt-1 font-mono">
                                Решено в {timeStr}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Group by month
  const grouped = state.sessions.reduce((acc, session) => {
    const key = format(parseISO(session.date), 'LLLL yyyy', { locale: ru });
    if (!acc[key]) acc[key] = [];
    acc[key].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        <h2 className="text-xl font-light text-[#fafafa] mb-8">История сессий</h2>
        
        {state.sessions.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4 bg-[#111112]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-[#717171]">
              <Clock size={32} />
            </div>
            <h3 className="text-lg font-light text-[#fafafa]">История пуста</h3>
            <p className="text-sm text-[#717171] leading-relaxed max-w-xs">
              Завершите свою первую сессию в разделе фокуса, и здесь вы увидите подробную статистику и историю ответов.
            </p>
          </Card>
        ) : (
          (Object.entries(grouped) as [string, Session[]][]).map(([month, sessions]) => {
            const isCollapsed = !!collapsedMonths[month];
            return (
              <div key={month} className="space-y-4">
                <button 
                  onClick={() => toggleMonth(month)}
                  className="flex items-center gap-2 text-xs font-medium text-[#717171] hover:text-[#fafafa] uppercase tracking-widest capitalize transition-colors cursor-pointer select-none"
                >
                  <span>{month}</span>
                  <ChevronDown 
                    size={14} 
                    className={`transform transition-transform duration-200 ${isCollapsed ? '-rotate-90 text-[#717171]/60' : 'rotate-0'}`} 
                  />
                </button>
                
                {!isCollapsed && (
                  <div className="space-y-2">
                    {sessions.map(session => {
                      const correctCount = session.answers.filter(a => a.isCorrect).length;
                      const errorCount = session.answers.filter(a => !a.isCorrect).length;
                      const hasComments = session.answers.some(a => !a.isCorrect && a.comment);
                      
                      return (
                        <button 
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className="w-full text-left bg-[#1c1c1c] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between group transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-12 text-center shrink-0">
                              <div className="text-xl font-medium text-[#fafafa]">{format(parseISO(session.date), 'dd')}</div>
                            </div>
                            <div>
                              <div className="text-base font-semibold text-[#fafafa] mb-1">
                                {session.subject} <span className="text-[#717171] font-medium text-sm ml-4">{session.taskType}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm font-medium text-[#717171]">
                                <span className="flex items-center gap-1"><Clock size={14} /> {Math.floor(session.durationSeconds / 60)}:{(session.durationSeconds % 60).toString().padStart(2, '0')}</span>
                                <span className="flex items-center gap-1 text-[#a3e635] font-semibold"><Check size={14} /> {correctCount}</span>
                                <span className="flex items-center gap-1 text-[#f43f5e] font-semibold"><X size={14} /> {errorCount}</span>
                                {hasComments && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#717171] shrink-0" title="Есть комментарии к ошибкам" />
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
