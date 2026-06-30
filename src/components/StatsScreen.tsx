import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../store';
import { getAchievements, getStreakStats } from '../utils/achievements';
import { Card } from './ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { format, subDays, parseISO, startOfDay, subMonths, startOfMonth, endOfMonth, getMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'motion/react';
import { getTaskTypes, isBlockTask, getBlockSubtasks } from '../utils';
import { 
  ChevronLeft, 
  Trash2, 
  Calculator, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Award, 
  Sparkles, 
  Trophy, 
  Star, 
  Shield, 
  HelpCircle, 
  ChevronRight, 
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Subject } from '../types';

export function StatsScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'mocks' | 'tasks'>('overview');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#090911]">
      <header className="p-4 md:p-6 pb-0 flex flex-col border-b border-white/5 shrink-0">
        {/* Sleek Minimalist Tabs */}
        <div className="flex gap-6 md:gap-8 overflow-x-auto scrollbar-none justify-center">
          {[
            { id: 'overview', label: 'Обзор' },
            { id: 'achievements', label: 'Достижения' },
            { id: 'mocks', label: 'Пробники' },
            { id: 'tasks', label: 'Задачи' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-semibold tracking-wide transition-all relative shrink-0 focus:outline-none outline-none select-none ${
                isActive ? 'text-[#fafafa]' : 'text-[#717171] hover:text-[#fafafa]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div 
                    layoutId="stats-tab-indicator"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'mocks' && <MocksTab />}
        {activeTab === 'achievements' && <AchievementsTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { state } = useApp();
  const isMonochrome = state.settings.theme === 'monochrome';
  const accentColor = isMonochrome ? '#fafafa' : '#a3e635';
  const [timeRange, setTimeRange] = useState('Всего');
  const [subject, setSubject] = useState('Все');
  const [isTaskTypesExpanded, setIsTaskTypesExpanded] = useState(false);
  const [activityTimeRange, setActivityTimeRange] = useState<'День' | 'Неделя' | 'Месяц' | 'Квартал'>('Неделя');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const ele = scrollRef.current;
    if (!ele) return;
    ele.style.cursor = 'grabbing';
    ele.style.userSelect = 'none';
    
    const startX = e.pageX - ele.offsetLeft;
    const scrollLeft = ele.scrollLeft;
    
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.pageX - ele.offsetLeft;
      const walk = (x - startX) * 1.5; // scroll-speed
      ele.scrollLeft = scrollLeft - walk;
    };
    
    const handleMouseUp = () => {
      ele.style.cursor = 'grab';
      ele.style.removeProperty('user-select');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Filter sessions based on selected subject and time range
  const filteredSessions = React.useMemo(() => {
    let sessions = [...state.sessions];
    
    // Subject filter
    if (subject !== 'Все') {
      sessions = sessions.filter(s => s.subject === subject);
    }
    
    // Time range filter
    const now = new Date();
    if (timeRange === 'День') {
      const startOfToday = startOfDay(now);
      sessions = sessions.filter(s => parseISO(s.date).getTime() >= startOfToday.getTime());
    } else if (timeRange === 'Неделя') {
      const startOfThisWeek = subDays(startOfDay(now), 7);
      sessions = sessions.filter(s => parseISO(s.date).getTime() >= startOfThisWeek.getTime());
    } else if (timeRange === 'Месяц') {
      const startOfThisMonth = subDays(startOfDay(now), 30);
      sessions = sessions.filter(s => parseISO(s.date).getTime() >= startOfThisMonth.getTime());
    } else if (timeRange === 'Год') {
      const startOfThisYear = subDays(startOfDay(now), 365);
      sessions = sessions.filter(s => parseISO(s.date).getTime() >= startOfThisYear.getTime());
    }
    
    return sessions;
  }, [state.sessions, subject, timeRange]);

  const totalTimeSeconds = filteredSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalCorrect = filteredSessions.reduce((acc, s) => acc + s.answers.filter(a => a.isCorrect).length, 0);
  const totalErrors = filteredSessions.reduce((acc, s) => acc + s.answers.filter(a => !a.isCorrect).length, 0);

  // Helper to get qualifying streak days (>= 25 min total per day)
  const getQualifyingStreakDays = (targetSubject: string): string[] => {
    const durationByDay: { [key: string]: number } = {};
    state.sessions.forEach(s => {
      if (targetSubject !== 'Все' && s.subject !== targetSubject) return;
      try {
        const dateStr = format(parseISO(s.date), 'yyyy-MM-dd');
        durationByDay[dateStr] = (durationByDay[dateStr] || 0) + s.durationSeconds;
      } catch (e) {
        // invalid date ignored
      }
    });

    // 1500 seconds = 25 minutes
    return Object.keys(durationByDay)
      .filter(dateStr => durationByDay[dateStr] >= 1500)
      .sort();
  };

  // Calculate daily streak from actual sessions (for selected subject if applicable)
  const calculateStreak = (): number => {
    const qualifyingDays = getQualifyingStreakDays(subject);
    if (qualifyingDays.length === 0) return 0;

    const uniqueDaysSet = new Set(qualifyingDays);
    const currentDate = startOfDay(new Date());
    const todayStr = format(currentDate, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(currentDate, 1), 'yyyy-MM-dd');

    if (!uniqueDaysSet.has(todayStr) && !uniqueDaysSet.has(yesterdayStr)) {
      return 0;
    }

    let streak = 0;
    let checkDate = uniqueDaysSet.has(todayStr) ? currentDate : subDays(currentDate, 1);

    while (true) {
      const checkStr = format(checkDate, 'yyyy-MM-dd');
      if (uniqueDaysSet.has(checkStr)) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const streakDays = calculateStreak();

  // Top 5 completed or current streaks
  const topStreaks = React.useMemo(() => {
    const qualifyingDays = getQualifyingStreakDays(subject);
    if (qualifyingDays.length === 0) return [];

    const streaks: { daysCount: number; endDateStr: string; endDateRaw: string }[] = [];
    let currentStreakDays: string[] = [qualifyingDays[0]];

    for (let i = 1; i < qualifyingDays.length; i++) {
      const prevDate = new Date(qualifyingDays[i - 1]);
      const currDate = new Date(qualifyingDays[i]);

      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreakDays.push(qualifyingDays[i]);
      } else {
        const lastDayStr = currentStreakDays[currentStreakDays.length - 1];
        let formattedEnd = lastDayStr;
        try {
          formattedEnd = format(parseISO(lastDayStr), 'd.MM.yy');
        } catch (e) {}
        streaks.push({
          daysCount: currentStreakDays.length,
          endDateStr: formattedEnd,
          endDateRaw: lastDayStr
        });
        currentStreakDays = [qualifyingDays[i]];
      }
    }

    if (currentStreakDays.length > 0) {
      const lastDayStr = currentStreakDays[currentStreakDays.length - 1];
      let formattedEnd = lastDayStr;
      try {
        formattedEnd = format(parseISO(lastDayStr), 'd.MM.yy');
      } catch (e) {}
      streaks.push({
        daysCount: currentStreakDays.length,
        endDateStr: formattedEnd,
        endDateRaw: lastDayStr
      });
    }

    // Sort by daysCount descending, then take top 5
    return streaks
      .sort((a, b) => b.daysCount - a.daysCount)
      .slice(0, 5);
  }, [state.sessions, subject]);

  // Radar Data
  const radarData = state.settings.activeSubjects.map(subj => {
    let subjSessions = state.sessions.filter(s => s.subject === subj);
    const now = new Date();
    if (timeRange === 'День') {
      subjSessions = subjSessions.filter(s => parseISO(s.date).getTime() >= startOfDay(now).getTime());
    } else if (timeRange === 'Неделя') {
      subjSessions = subjSessions.filter(s => parseISO(s.date).getTime() >= subDays(startOfDay(now), 7).getTime());
    } else if (timeRange === 'Месяц') {
      subjSessions = subjSessions.filter(s => parseISO(s.date).getTime() >= subDays(startOfDay(now), 30).getTime());
    } else if (timeRange === 'Год') {
      subjSessions = subjSessions.filter(s => parseISO(s.date).getTime() >= subDays(startOfDay(now), 365).getTime());
    }
    const correct = subjSessions.reduce((acc, s) => acc + s.answers.filter(a => a.isCorrect).length, 0);
    return { subject: subj, value: correct };
  });

  // Dynamic Activity Trend Data based on activityTimeRange (День, Неделя, Месяц, Квартал)
  const activityTrendData = React.useMemo(() => {
    const now = new Date();
    const data = [];

    // First, let's calculate the daily habit scores for the last 2500 days
    // to ensure we have a continuous daily running score.
    const startOfToday = startOfDay(now);
    const dailyScores: { [key: string]: number } = {};
    const dailySeconds: { [key: string]: number } = {};

    // 1. Gather all session durations by day (yyyy-MM-dd)
    state.sessions.forEach(s => {
      if (subject !== 'Все' && s.subject !== subject) return;
      try {
        const dateStr = format(parseISO(s.date), 'yyyy-MM-dd');
        dailySeconds[dateStr] = (dailySeconds[dateStr] || 0) + s.durationSeconds;
      } catch (e) {
        // ignore invalid dates
      }
    });

    // 2. Simulate running score day-by-day starting 2500 days ago up to today
    let currentRunningScore = 0;
    for (let i = 2500; i >= 0; i--) {
      const d = subDays(startOfToday, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const daySeconds = dailySeconds[dateStr] || 0;
      
      const hasStudied = daySeconds >= 1500; // >= 25 minutes
      if (hasStudied) {
        currentRunningScore = Math.min(100, currentRunningScore + 100 / 10);
      } else {
        currentRunningScore = Math.max(0, currentRunningScore - 100 / 10);
      }
      dailyScores[dateStr] = currentRunningScore;
    }

    // Helper to format duration beautifully (e.g. "время: 1ч 7м" or "время: 34м")
    const formatDurationStr = (totalSec: number): string => {
      if (totalSec < 60) return 'время: 0м';
      const mins = Math.floor(totalSec / 60);
      if (mins < 60) {
        return `время: ${mins}м`;
      } else {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return remMins > 0 ? `время: ${hrs}ч ${remMins}м` : `время: ${hrs}ч`;
      }
    };

    if (activityTimeRange === 'День') {
      // Show the last 30 days, 1 step = 1 day
      for (let i = 29; i >= 0; i--) {
        const d = subDays(startOfToday, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const score = Math.round(dailyScores[dateStr] || 0);
        const daySec = dailySeconds[dateStr] || 0;

        // Label formatting: show day number. If first item or month changes, show month name
        let label = format(d, 'd');
        if (i === 29 || format(d, 'd') === '1') {
          label = format(d, 'd LLL', { locale: ru });
        }

        data.push({
          label,
          value: score,
          tooltipLabel: format(d, 'd MMMM yyyy', { locale: ru }),
          durationStr: formatDurationStr(daySec)
        });
      }
    } else if (activityTimeRange === 'Неделя') {
      // Show the last 28 weeks, 1 step = 7 days
      for (let i = 27; i >= 0; i--) {
        const weekEnd = subDays(startOfToday, i * 7);
        const weekStart = subDays(weekEnd, 6);
        
        // Value is sampled running score at the end of the week
        const scoreDateStr = format(weekEnd, 'yyyy-MM-dd');
        const score = Math.round(dailyScores[scoreDateStr] || 0);

        // Sum durations during this week
        let weekTotalSec = 0;
        for (let w = 0; w < 7; w++) {
          const d = subDays(weekEnd, w);
          const dateStr = format(d, 'yyyy-MM-dd');
          weekTotalSec += dailySeconds[dateStr] || 0;
        }

        // Label formatting: show day of month, or month name on boundary
        let label = format(weekEnd, 'd');
        const prevWeekEnd = subDays(startOfToday, (i + 1) * 7);
        if (i === 27 || format(weekEnd, 'M') !== format(prevWeekEnd, 'M')) {
          label = format(weekEnd, 'LLL', { locale: ru });
        }

        data.push({
          label,
          value: score,
          tooltipLabel: `Неделя с ${format(weekStart, 'dd.MM')} по ${format(weekEnd, 'dd.MM.yy')}`,
          durationStr: formatDurationStr(weekTotalSec)
        });
      }
    } else if (activityTimeRange === 'Месяц') {
      // Show the last 28 calendar months, 1 step = 1 calendar month
      for (let i = 27; i >= 0; i--) {
        const monthDate = subMonths(startOfToday, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        // Value is sampled running score at the end of this calendar month
        const scoreDateStr = format(monthEnd, 'yyyy-MM-dd');
        const score = Math.round(dailyScores[scoreDateStr] || 0);

        // Sum durations during this month
        let monthTotalSec = 0;
        let tempDate = monthStart;
        while (tempDate <= monthEnd) {
          const dateStr = format(tempDate, 'yyyy-MM-dd');
          monthTotalSec += dailySeconds[dateStr] || 0;
          tempDate = new Date(tempDate.getTime() + 24 * 60 * 60 * 1000);
        }

        // Label formatting: month name, with year if first item or year transition
        let label = format(monthDate, 'LLL', { locale: ru });
        const prevMonthDate = subMonths(startOfToday, i + 1);
        if (i === 27 || format(monthDate, 'yyyy') !== format(prevMonthDate, 'yyyy')) {
          label = format(monthDate, 'LLL yy', { locale: ru });
        }

        data.push({
          label,
          value: score,
          tooltipLabel: format(monthDate, 'LLLL yyyy', { locale: ru }),
          durationStr: formatDurationStr(monthTotalSec)
        });
      }
    } else {
      // "Квартал" (Quarter) Mode: last 24 quarters, 1 step = 3 calendar months
      for (let i = 23; i >= 0; i--) {
        const targetDate = subMonths(startOfToday, i * 3);
        const quarterStart = startOfMonth(subMonths(targetDate, 2));
        const quarterEnd = endOfMonth(targetDate);

        // Value is sampled running score at the end of this quarter
        const scoreDateStr = format(quarterEnd, 'yyyy-MM-dd');
        const score = Math.round(dailyScores[scoreDateStr] || 0);

        // Sum durations during this quarter
        let quarterTotalSec = 0;
        let tempDate = quarterStart;
        while (tempDate <= quarterEnd) {
          const dateStr = format(tempDate, 'yyyy-MM-dd');
          quarterTotalSec += dailySeconds[dateStr] || 0;
          tempDate = new Date(tempDate.getTime() + 24 * 60 * 60 * 1000);
        }

        // Label formatting: e.g. "I кв. 26"
        const qNum = Math.floor(getMonth(targetDate) / 3) + 1;
        const romanQuarters = ['I', 'II', 'III', 'IV'];
        const qRoman = romanQuarters[qNum - 1] || `${qNum}`;
        const label = `${qRoman} кв. ${format(targetDate, 'yy')}`;

        data.push({
          label,
          value: score,
          tooltipLabel: `${qRoman} квартал ${format(targetDate, 'yyyy')}`,
          durationStr: formatDurationStr(quarterTotalSec)
        });
      }
    }

    return data;
  }, [state.sessions, subject, activityTimeRange]);

  // Generate Heatmap Data for the last 78 weeks (1.5 years)
  const generateHeatmapData = () => {
    const today = new Date();
    const cells = [];
    const totalWeeks = 78;
    const totalDays = totalWeeks * 7;
    
    // Align starting day to Monday of 78 weeks ago
    const startDate = startOfDay(subDays(today, totalDays));
    const startDayOfWeek = startDate.getDay();
    const alignDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const firstMonday = subDays(startDate, alignDays);

    const sessionsForHeatmap = subject === 'Все' 
      ? state.sessions 
      : state.sessions.filter(s => s.subject === subject);

    for (let i = 0; i < totalWeeks * 7; i++) {
      const cellDate = new Date(firstMonday.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Calculate total seconds for this date
      const daySessions = sessionsForHeatmap.filter(s => {
        const sDate = parseISO(s.date);
        return sDate.getFullYear() === cellDate.getFullYear() &&
               sDate.getMonth() === cellDate.getMonth() &&
               sDate.getDate() === cellDate.getDate();
      });
      const durationSeconds = daySessions.reduce((acc, s) => acc + s.durationSeconds, 0);
      
      cells.push({
        date: cellDate,
        durationSeconds,
        count: daySessions.length
      });
    }
    return { cells, firstMonday };
  };

  const { cells: heatmapCells } = generateHeatmapData();

  // Calculate Task Types statistics for selected subject (if not 'Все')
  const taskTypeData = React.useMemo(() => {
    if (subject === 'Все') return [];
    
    // Filter sessions by selected subject
    let subjectSessions = state.sessions.filter(s => s.subject === subject);
    
    // Respect time range
    const now = new Date();
    if (timeRange === 'День') {
      subjectSessions = subjectSessions.filter(s => parseISO(s.date).getTime() >= startOfDay(now).getTime());
    } else if (timeRange === 'Неделя') {
      subjectSessions = subjectSessions.filter(s => parseISO(s.date).getTime() >= subDays(startOfDay(now), 7).getTime());
    } else if (timeRange === 'Месяц') {
      subjectSessions = subjectSessions.filter(s => parseISO(s.date).getTime() >= subDays(startOfDay(now), 30).getTime());
    } else if (timeRange === 'Год') {
      subjectSessions = subjectSessions.filter(s => parseISO(s.date).getTime() >= subDays(startOfDay(now), 365).getTime());
    }
    
    // Group and count total answers solved per taskType
    const counts: { [key: string]: number } = {};
    subjectSessions.forEach(session => {
      const typeName = session.taskType || 'Задание 1';
      const answersCount = session.answers.length;
      counts[typeName] = (counts[typeName] || 0) + answersCount;
    });
    
    const allTypes = getTaskTypes(subject as Subject);
    
    return allTypes.map(name => ({
      name,
      count: counts[name] || 0
    }));
  }, [state.sessions, subject, timeRange]);

  const maxTaskTypeCount = React.useMemo(() => {
    return Math.max(...taskTypeData.map(t => t.count), 1);
  }, [taskTypeData]);

  // Handle Collapsed vs Expanded data and sorting
  const renderedTaskTypes = React.useMemo(() => {
    if (isTaskTypesExpanded) {
      // Order from 1 to N (already returned by getTaskTypes)
      return taskTypeData;
    } else {
      // Top 3 by solved count descending
      const solvedOnly = taskTypeData.filter(t => t.count > 0);
      if (solvedOnly.length > 0) {
        return [...solvedOnly].sort((a, b) => b.count - a.count).slice(0, 3);
      } else {
        return taskTypeData.slice(0, 3);
      }
    }
  }, [taskTypeData, isTaskTypesExpanded]);

  return (
    <div className="h-full flex flex-col gap-6 pb-12">
      {/* Gliders Stack (Subject on left, Time-range on right on desktop; stacked and centered on mobile) */}
      <div className="flex flex-col xl:flex-row xl:justify-between gap-4 shrink-0 items-center w-full">
        {/* Subject Glider */}
        <div className="flex gap-2 bg-[#1c1c1c] p-1 rounded-xl border border-white/5 max-w-full overflow-x-auto scrollbar-none">
          {['Все', ...state.settings.activeSubjects].map(s => {
            const isActive = subject === s;
            return (
              <button 
                key={s} 
                onClick={() => setSubject(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold relative transition-colors shrink-0 focus:outline-none outline-none select-none ${isActive ? 'text-[#090911]' : 'text-[#717171] hover:text-[#fafafa]'}`}
              >
                <span className="relative z-10">{s}</span>
                {isActive && (
                  <motion.div 
                    layoutId="subject-pill"
                    className="absolute inset-0 bg-[#fafafa] rounded-lg"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Time Range Glider (styled identically) */}
        <div className="flex gap-2 bg-[#1c1c1c] p-1 rounded-xl border border-white/5 max-w-full overflow-x-auto scrollbar-none">
          {['Всего', 'Год', 'Месяц', 'Неделя', 'День'].map(t => {
            const isActive = timeRange === t;
            return (
              <button 
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold relative transition-colors shrink-0 focus:outline-none outline-none select-none ${isActive ? 'text-[#090911]' : 'text-[#717171] hover:text-[#fafafa]'}`}
              >
                <span className="relative z-10">{t}</span>
                {isActive && (
                  <motion.div 
                    layoutId="timerange-pill"
                    className="absolute inset-0 bg-[#fafafa] rounded-lg"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Stats Cards (Responsive 2-column on mobile, 4-column on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-center p-5">
          <span className="text-xs font-bold text-[#717171] uppercase tracking-wider mb-2">Всего времени</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl lg:text-3xl font-medium text-[#fafafa] tracking-tight">
              {Math.floor(totalTimeSeconds / 3600)}ч {Math.floor((totalTimeSeconds % 3600) / 60)}м
            </span>
          </div>
        </Card>
        
        <Card className="flex flex-col justify-center p-5">
          <span className="text-xs font-bold text-[#717171] uppercase tracking-wider mb-2">Стрик</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl lg:text-3xl font-medium text-[#fafafa] tracking-tight">
              {streakDays} {streakDays === 1 ? 'день' : streakDays > 1 && streakDays < 5 ? 'дня' : 'дней'}
            </span>
          </div>
        </Card>
        
        <Card className="flex flex-col justify-center p-5">
          <span className="text-xs font-bold text-[#717171] uppercase tracking-wider mb-2">Верно</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl lg:text-3xl font-medium text-[#a3e635] tracking-tight">
              {totalCorrect}
            </span>
          </div>
        </Card>
        
        <Card className="flex flex-col justify-center p-5">
          <span className="text-xs font-bold text-[#717171] uppercase tracking-wider mb-2">Ошибок</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl lg:text-3xl font-medium text-[#f43f5e] tracking-tight">
              {totalErrors}
            </span>
          </div>
        </Card>
      </div>

      {/* Activity Trend (Full Width) */}
      <Card className="flex flex-col p-6 min-h-[420px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#717171]">Активность</h3>
          <div className="flex bg-[#121214] p-0.5 rounded-lg border border-white/5 self-start sm:self-auto">
            {(['День', 'Неделя', 'Месяц', 'Квартал'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActivityTimeRange(tab)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                  activityTimeRange === tab
                    ? 'bg-white text-[#090911] shadow-md'
                    : 'text-[#717171] hover:text-[#fafafa]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityTrendData}>
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.05)" tick={{fill: '#717171', fontSize: 10}} tickLine={false} axisLine={false} />
              <YAxis 
                domain={[0, 100]} 
                ticks={[0, 20, 40, 60, 80, 100]}
                tickFormatter={(v) => `${v}%`} 
                stroke="rgba(255,255,255,0.05)" 
                tick={{ fill: '#717171', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#1c1c1c] border border-white/5 p-3 rounded-xl text-xs space-y-1 shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                        <div className="font-semibold text-[#fafafa]">{data.tooltipLabel}</div>
                        <div className="flex items-center justify-between gap-4 mt-1">
                          <span className={`${isMonochrome ? 'text-[#fafafa]' : 'text-[#a3e635]'} font-bold text-sm`}>{data.value}%</span>
                          <span className="text-[#717171] font-mono font-medium">{data.durationStr}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={accentColor} 
                strokeWidth={3} 
                dot={{ fill: accentColor, stroke: '#090911', strokeWidth: 1.5, r: 4.5 }} 
                activeDot={{ r: 6, fill: '#fafafa', stroke: accentColor, strokeWidth: 2 }} 
                animationDuration={350} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Horizontally stacked cards on PC, vertically stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Heatmap Card */}
        <Card className="lg:col-span-8 p-6 flex flex-col justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#717171] mb-4">Интенсивность</h3>

          <div className="flex gap-2 items-stretch relative w-full mt-2">
            {/* Scrollable grid area for heatmap */}
            <div 
              ref={scrollRef} 
              onMouseDown={handleMouseDown}
              className="flex-1 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing"
            >
              <div className="inline-flex flex-col">
                {/* Month headings row */}
                <div className="flex gap-[4px] mb-2 select-none h-5">
                  {Array.from({ length: 78 }).map((_, weekIdx) => {
                    const cell = heatmapCells[weekIdx * 7];
                    if (!cell) return <div key={weekIdx} className="w-[26px] md:w-[30px] shrink-0" />;
                    
                    const prevCell = weekIdx > 0 ? heatmapCells[(weekIdx - 1) * 7] : null;
                    const isFirstWeekOfMonth = !prevCell || cell.date.getMonth() !== prevCell.date.getMonth();
                    
                    return (
                      <div key={weekIdx} className="w-[26px] md:w-[30px] shrink-0 text-[10px] text-[#717171] font-bold text-center uppercase whitespace-nowrap">
                        {isFirstWeekOfMonth ? format(cell.date, 'LLL', { locale: ru }).toLowerCase() : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Heatmap Grid (Columns of 7 days) */}
                <div className="flex gap-[4px]">
                  {Array.from({ length: 78 }).map((_, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-[4px] shrink-0">
                      {heatmapCells.slice(weekIdx * 7, (weekIdx + 1) * 7).map((cell, dayIdx) => {
                        const durationMin = Math.floor(cell.durationSeconds / 60);
                        let level = 0;
                        if (durationMin > 0 && durationMin <= 15) level = 1;
                        else if (durationMin > 15 && durationMin <= 45) level = 2;
                        else if (durationMin > 45 && durationMin <= 90) level = 3;
                        else if (durationMin > 90) level = 4;

                        const colors = isMonochrome ? [
                          'bg-[#121214] text-[#444448] hover:bg-[#18181a]',
                          'bg-white/10 text-white hover:bg-white/20',
                          'bg-white/25 text-white hover:bg-white/35',
                          'bg-white/50 text-[#090911] font-semibold hover:bg-white/60',
                          'bg-white text-[#090911] font-bold hover:bg-zinc-200'
                        ] : [
                          'bg-[#121214] text-[#444448] hover:bg-[#18181a]',
                          'bg-[#a3e635]/15 text-[#a3e635] hover:bg-[#a3e635]/25',
                          'bg-[#a3e635]/35 text-[#fafafa] hover:bg-[#a3e635]/45',
                          'bg-[#a3e635]/65 text-[#090911] font-semibold hover:bg-[#a3e635]/75',
                          'bg-[#a3e635] text-[#090911] font-bold hover:bg-[#bbf255]'
                        ];

                        return (
                          <div
                            key={dayIdx}
                            className={`w-[26px] h-[26px] md:w-[30px] md:h-[30px] rounded-[4px] md:rounded-[6px] transition-all duration-200 cursor-pointer flex items-center justify-center text-[10px] md:text-[11px] font-mono tracking-tighter ${colors[level]} focus:outline-none outline-none select-none`}
                            title={`${format(cell.date, 'dd MMMM yyyy', { locale: ru })}: ${durationMin} мин (${cell.count} сес.)`}
                          >
                            {cell.date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekday indicator labels on the right, perfectly aligned */}
            <div className="flex flex-col text-[10px] text-[#717171] font-bold uppercase gap-[4px] pt-[28px] select-none shrink-0 justify-start pl-2">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="h-[26px] md:h-[30px] flex items-center justify-start">
                  {day}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Balance Radar */}
        <Card className="lg:col-span-4 flex flex-col p-6 justify-between min-h-[320px]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#717171] mb-4">Баланс</h3>
          <div className="flex-1 w-full relative min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#717171', fontSize: 10, fontWeight: 'bold' }} />
                <Radar name="Правильные" dataKey="value" stroke={accentColor} fill={accentColor} fillOpacity={0.2} strokeWidth={2} animationDuration={350} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Best Streaks Section */}
      <Card className="p-6 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#717171]">Лучшие стрики</h3>
        </div>

        {topStreaks.length === 0 ? (
          <div className="text-center py-8 text-xs font-bold text-[#717171] uppercase tracking-widest">
            Нет завершенных серий занятий от 25 минут в день
          </div>
        ) : (
          <div className="space-y-4">
            {topStreaks.map((streak, i) => {
              const maxStreakValue = Math.max(...topStreaks.map(s => s.daysCount), 1);
              const percentage = (streak.daysCount / maxStreakValue) * 100;
              return (
                <div key={i} className="flex items-center gap-4">
                  {/* Left: End Date of Streak */}
                  <div className="w-20 md:w-28 text-right shrink-0 pr-1">
                    <span className="text-xs md:text-sm font-semibold text-[#fafafa]">
                      {streak.endDateStr}
                    </span>
                  </div>
                  {/* Progress bar with value inside */}
                  <div className="flex-1 h-6 bg-[#121214] rounded-md overflow-hidden relative flex items-center">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="h-full bg-white rounded-md flex items-center pl-3 min-w-[65px]"
                    >
                      <span className="text-[11px] font-extrabold text-[#090911] font-mono whitespace-nowrap">
                        {streak.daysCount} {streak.daysCount % 10 === 1 && streak.daysCount % 100 !== 11 ? 'день' : [2, 3, 4].includes(streak.daysCount % 10) && ![12, 13, 14].includes(streak.daysCount % 100) ? 'дня' : 'дней'}
                      </span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Task Types Collapsible Section (Only for subjects, not for 'Все') */}
      {subject !== 'Все' && (
        <Card className="p-6 select-none transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setIsTaskTypesExpanded(!isTaskTypesExpanded)}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#717171] hover:text-[#fafafa] transition-colors focus:outline-none outline-none text-left"
            >
              <span>Типы задач</span>
              {isTaskTypesExpanded ? (
                <ChevronUp size={16} className="text-[#717171]" />
              ) : (
                <ChevronDown size={16} className="text-[#717171]" />
              )}
            </button>
          </div>

          <div className="space-y-4">
            {renderedTaskTypes.map(({ name, count }) => {
              const percentage = (count / maxTaskTypeCount) * 100;
              return (
                <div key={name} className="flex items-center gap-4">
                  <div className="w-20 md:w-28 text-right shrink-0 pr-1">
                    <span className="text-xs md:text-sm font-semibold text-[#fafafa] break-words line-clamp-2">
                      {name}
                    </span>
                  </div>
                  <div className={`flex-1 bg-[#121214] rounded-md overflow-hidden relative ${isTaskTypesExpanded ? 'h-3.5' : 'h-6'}`}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="h-full bg-white rounded-md"
                    />
                  </div>
                  <div className="w-10 text-left shrink-0 pl-1">
                    <span className="text-xs md:text-sm font-bold font-mono text-[#717171]">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function TasksTab() {
  const { state } = useApp();
  const isMonochrome = state.settings.theme === 'monochrome';
  const progressBg = isMonochrome ? 'bg-white' : 'bg-[#a3e635]';
  const [subject, setSubject] = useState(state.settings.activeSubjects[0] || 'Информатика');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const tasksScrollRef = React.useRef<HTMLDivElement>(null);

  const tasks = React.useMemo(() => {
    return getTaskTypes(subject);
  }, [subject]);

  const handleDragScroll = (e: React.MouseEvent<HTMLDivElement>) => {
    const ele = tasksScrollRef.current;
    if (!ele) return;
    ele.style.cursor = 'grabbing';
    ele.style.userSelect = 'none';
    
    const startX = e.pageX - ele.offsetLeft;
    const scrollLeft = ele.scrollLeft;
    
    const handleMouseMove = (ev: MouseEvent) => {
      const x = ev.pageX - ele.offsetLeft;
      const walk = (x - startX) * 1.5;
      ele.scrollLeft = scrollLeft - walk;
    };
    
    const handleMouseUp = () => {
      ele.style.cursor = 'grab';
      ele.style.removeProperty('user-select');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getTaskStats = React.useCallback((taskName: string) => {
    const subtasks = getBlockSubtasks(subject, taskName);
    const isBlock = subtasks.length > 0;

    const sessions = state.sessions.filter(s => {
      if (s.subject !== subject) return false;
      if (s.taskType === taskName) return true;
      if (isBlock && subtasks.includes(s.taskType)) return true;
      return false;
    });

    let totalSolved = 0;
    let correctCount = 0;
    let totalDuration = 0;

    sessions.forEach(session => {
      if (session.taskType === taskName) {
        totalSolved += session.answers.length;
        correctCount += session.answers.filter(a => a.isCorrect).length;
        totalDuration += session.durationSeconds;
      } else if (isBlock && subtasks.includes(session.taskType)) {
        totalSolved += session.answers.length;
        correctCount += session.answers.filter(a => a.isCorrect).length;
        totalDuration += session.durationSeconds;
      } else if (!isBlock) {
        totalSolved += session.answers.length;
        correctCount += session.answers.filter(a => a.isCorrect).length;
        totalDuration += session.durationSeconds;
      }
    });

    const errorCount = totalSolved - correctCount;
    const successRate = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;

    return { totalSolved, correctCount, errorCount, successRate, totalDuration };
  }, [state.sessions, subject]);

  const getSubtaskStats = React.useCallback((subtaskName: string) => {
    const sessions = state.sessions.filter(s => {
      if (s.subject !== subject) return false;
      if (s.taskType === selectedTask) return true;
      if (s.taskType === subtaskName) return true;
      return false;
    });

    let totalSolved = 0;
    let correctCount = 0;

    sessions.forEach(session => {
      if (session.taskType === selectedTask) {
        const matching = session.answers.filter(a => a.taskType === subtaskName);
        totalSolved += matching.length;
        correctCount += matching.filter(a => a.isCorrect).length;
      } else if (session.taskType === subtaskName) {
        totalSolved += session.answers.length;
        correctCount += session.answers.filter(a => a.isCorrect).length;
      }
    });

    const errorCount = totalSolved - correctCount;
    const successRate = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;

    return { totalSolved, correctCount, errorCount, successRate };
  }, [state.sessions, subject, selectedTask]);

  const getIntensityData = () => {
    if (!selectedTask) return [];
    const activityMap: { [dateStr: string]: number } = {};
    const subtasks = getBlockSubtasks(subject, selectedTask);
    const isBlock = subtasks.length > 0;

    const taskSessions = state.sessions.filter(s => {
      if (s.subject !== subject) return false;
      if (s.taskType === selectedTask) return true;
      if (isBlock && subtasks.includes(s.taskType)) return true;
      return false;
    });

    taskSessions.forEach(session => {
      const dateStr = format(parseISO(session.date), 'yyyy-MM-dd');
      const answersCount = session.answers.length;
      activityMap[dateStr] = (activityMap[dateStr] || 0) + answersCount;
    });

    const today = new Date();
    const daysList: { date: Date; dateStr: string; count: number }[] = [];
    
    // Go back 364 days so total is 365
    for (let i = 364; i >= 0; i--) {
      const d = subDays(today, i);
      const dStr = format(d, 'yyyy-MM-dd');
      daysList.push({
        date: d,
        dateStr: dStr,
        count: activityMap[dStr] || 0
      });
    }

    return daysList;
  };

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.round(totalSeconds % 60);

    if (h > 0) {
      return `${h}ч ${m}м ${s}с`;
    }
    if (m > 0) {
      return `${m}м ${s}с`;
    }
    return `${s}с`;
  };

  // Scroll to end of intensity heat map on mount/tab change
  React.useEffect(() => {
    if (selectedTask && tasksScrollRef.current) {
      tasksScrollRef.current.scrollLeft = tasksScrollRef.current.scrollWidth;
    }
  }, [selectedTask]);

  if (selectedTask) {
    const { totalSolved, correctCount, errorCount, successRate, totalDuration } = getTaskStats(selectedTask);
    const blockSubtasks = getBlockSubtasks(subject, selectedTask);
    const isBlock = blockSubtasks.length > 0;
    
    // Group days into weeks of 7
    const daysData = getIntensityData();
    const weeks: { date: Date; dateStr: string; count: number }[][] = [];
    for (let i = 0; i < daysData.length; i += 7) {
      weeks.push(daysData.slice(i, i + 7));
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button 
          onClick={() => setSelectedTask(null)} 
          className="bg-[#1c1c1c] border border-white/5 hover:border-white/10 hover:bg-[#252525] text-[#fafafa] px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all cursor-pointer w-fit mb-6"
        >
          <ChevronLeft size={16} />
          <span>Назад к списку задач</span>
        </button>
        <h2 className="text-2xl font-light text-[#fafafa] mb-8">{subject} <span className="text-[#717171]">{selectedTask}</span></h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="text-[10px] text-[#717171] uppercase tracking-widest font-bold mb-2">Решено всего</div>
            <div className="text-3xl font-light text-[#fafafa] font-mono">{totalSolved}</div>
          </Card>
          <Card>
            <div className="text-[10px] text-[#a3e635] uppercase tracking-widest font-bold mb-2">Верно</div>
            <div className="text-3xl font-light text-[#a3e635] font-mono">{correctCount}</div>
          </Card>
          <Card>
            <div className="text-[10px] text-[#f43f5e] uppercase tracking-widest font-bold mb-2">Ошибок</div>
            <div className="text-3xl font-light text-[#f43f5e] font-mono">{errorCount}</div>
          </Card>
          <Card>
            <div className="text-[10px] text-[#38bdf8] uppercase tracking-widest font-bold mb-2">Успешность</div>
            <div className="text-3xl font-light text-[#38bdf8] font-mono">{successRate}%</div>
          </Card>
        </div>

        <Card className="flex flex-col md:flex-row justify-between p-6 gap-6 md:gap-12 bg-[#121214]">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-[#717171] uppercase tracking-widest font-bold">Потрачено времени на эту задачу</span>
            <span className="text-3xl font-light text-[#fafafa] font-mono">{formatDuration(totalDuration)}</span>
          </div>
          <div className="flex flex-col gap-1.5 md:items-end">
            <span className="text-[10px] text-[#717171] uppercase tracking-widest font-bold">Среднее время на одно решение</span>
            <span className="text-3xl font-light text-[#fafafa] font-mono">
              {totalSolved > 0 ? Math.round(totalDuration / totalSolved) : 0} сек
            </span>
          </div>
        </Card>

        {isBlock && (
          <Card className="p-6 space-y-6 bg-[#121214]">
            <div className="text-[10px] text-[#717171] uppercase tracking-widest font-bold">Статистика по пунктам</div>
            <div className="space-y-6">
              {blockSubtasks.map(subName => {
                const subStats = getSubtaskStats(subName);
                return (
                  <div key={subName} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-sm font-bold text-[#fafafa]">{subName}</div>
                        <div className="text-[10px] text-[#717171] font-bold uppercase mt-1">
                          Решено: {subStats.totalSolved} (Верно: {subStats.correctCount}, Ошибок: {subStats.errorCount})
                        </div>
                      </div>
                      <div className="text-sm font-bold text-[#38bdf8]">{subStats.successRate}%</div>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${progressBg} transition-all`} style={{ width: `${subStats.successRate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="flex flex-col gap-6 bg-[#121214]">
          <div className="text-[10px] text-[#717171] uppercase tracking-widest font-bold">Доля верных решений</div>
          <div className="h-4 w-full flex rounded-full overflow-hidden bg-white/5">
            {totalSolved > 0 ? (
              <>
                <div className={progressBg} style={{ width: `${successRate}%` }} />
                <div className="bg-[#f43f5e]" style={{ width: `${100 - successRate}%` }} />
              </>
            ) : (
              <div className="bg-white/10 w-full" />
            )}
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#a3e635]">✓ Верно ({successRate}%)</span>
            <span className="text-[#f43f5e]">X Ошибки ({totalSolved > 0 ? 100 - successRate : 0}%)</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-center">
        <div className="flex gap-2 bg-[#1c1c1c] p-1 rounded-xl border border-white/5 w-fit">
          {state.settings.activeSubjects.map(s => {
            const isActive = subject === s;
            return (
              <button 
                key={s} 
                onClick={() => setSubject(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold relative transition-colors shrink-0 focus:outline-none outline-none select-none ${isActive ? 'text-[#090911]' : 'text-[#717171] hover:text-[#fafafa]'}`}
              >
                <span className="relative z-10">{s}</span>
                {isActive && (
                  <motion.div 
                    layoutId="tasks-subject-pill"
                    className="absolute inset-0 bg-[#fafafa] rounded-lg"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tasks.map(task => {
          const { totalSolved, successRate } = getTaskStats(task);
          return (
            <button key={task} onClick={() => setSelectedTask(task)} className="text-left">
              <Card className="hover:border-white/10 transition-colors cursor-pointer group">
                <div className="text-sm font-bold text-[#fafafa] mb-1">{task}</div>
                <div className="text-[10px] text-[#717171] font-bold uppercase mb-4">Всего решений: {totalSolved}</div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${progressBg} transition-all`} style={{ width: `${totalSolved > 0 ? successRate : 0}%` }} />
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MocksTab() {
  const { state, addMockExam, deleteMockExam } = useApp();
  const isMonochrome = state.settings.theme === 'monochrome';
  const accentColor = isMonochrome ? '#fafafa' : '#a3e635';
  const [selectedSubject, setSelectedSubject] = useState<Subject>(
    state.settings.activeSubjects[0] || 'Математика'
  );
  const [score, setScore] = useState<string>('');
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);
  const [customDate, setCustomDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Get mock exams for the currently selected subject, sorted by date ascending for the graph
  const subjectExams = (state.mockExams || [])
    .filter(exam => exam.subject === selectedSubject)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // For list, sort by date descending
  const listExams = [...subjectExams].reverse();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 1 || parsedScore > 100) {
      alert('Пожалуйста, введите корректный балл от 1 до 100');
      return;
    }

    let examDate = new Date();
    if (isCustomDate && customDate) {
      const parts = customDate.split('-');
      if (parts.length === 3) {
        examDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }

    addMockExam({
      subject: selectedSubject,
      score: parsedScore,
      date: examDate.toISOString()
    });

    setScore('');
  };

  // Format data for chart
  const chartData = subjectExams.map(exam => ({
    date: format(parseISO(exam.date), 'dd.MM'),
    score: exam.score,
    fullDate: format(parseISO(exam.date), 'dd MMMM yyyy', { locale: ru })
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Subject Filter */}
      <div className="flex justify-center">
        <div className="flex gap-2 bg-[#1c1c1c] p-1 rounded-xl border border-white/5 w-fit max-w-full overflow-x-auto scrollbar-none">
          {state.settings.activeSubjects.map(s => {
            const isActive = selectedSubject === s;
            return (
              <button 
                key={s} 
                onClick={() => setSelectedSubject(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold relative transition-colors shrink-0 focus:outline-none outline-none select-none ${isActive ? 'text-[#090911]' : 'text-[#717171] hover:text-[#fafafa]'}`}
              >
                <span className="relative z-10">{s}</span>
                {isActive && (
                  <motion.div 
                    layoutId="mocks-subject-pill"
                    className="absolute inset-0 bg-[#fafafa] rounded-lg"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Form area */}
        <div className="md:col-span-4 space-y-6">
          <Card className="p-6 bg-[#111112] border border-white/5 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#717171] mb-6">Добавить результат</h3>
            
            <form onSubmit={handleAdd} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#717171] uppercase tracking-wider block">Балл (1-100)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100"
                  required
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  placeholder="Например, 75"
                  className="w-full bg-[#1c1c1c] border border-white/10 text-[#fafafa] text-sm rounded-xl px-4 py-3 outline-none focus:border-white/30 transition-all font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#717171] uppercase tracking-wider block">Дата</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#1c1c1c] rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsCustomDate(false)}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all select-none cursor-pointer ${!isCustomDate ? 'bg-[#fafafa] text-[#090911]' : 'text-[#717171] hover:text-[#fafafa]'}`}
                  >
                    Сегодня
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomDate(true)}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all select-none cursor-pointer ${isCustomDate ? 'bg-[#fafafa] text-[#090911]' : 'text-[#717171] hover:text-[#fafafa]'}`}
                  >
                    Другая дата
                  </button>
                </div>
              </div>

              {isCustomDate && (
                <div className="space-y-2 animate-fade-in">
                  <input 
                    type="date"
                    required
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="w-full bg-[#1c1c1c] border border-white/10 text-[#fafafa] text-sm rounded-xl px-4 py-3 outline-none focus:border-white/30 transition-all font-mono"
                  />
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-[#fafafa] hover:bg-[#eaeaea] text-[#090911] font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-[0_4px_15px_rgba(255,255,255,0.06)] cursor-pointer flex items-center justify-center gap-2"
              >
                Сохранить результат
              </button>
            </form>
          </Card>
        </div>

        {/* Analytics & List area */}
        <div className="md:col-span-8 space-y-6">
          {/* Chart */}
          <Card className="p-6 min-h-[280px] flex flex-col rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#717171] mb-4">Прогресс результатов</h3>
            {chartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-[#717171] font-medium h-[180px]">
                Добавьте первый результат для построения графика
              </div>
            ) : (
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.05)" 
                      tick={{ fill: '#717171', fontSize: 10 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke="rgba(255,255,255,0.05)" 
                      tick={{ fill: '#717171', fontSize: 10 }} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1c1c1c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                      labelStyle={{ color: '#fafafa', fontWeight: 'bold', fontSize: 11 }}
                      itemStyle={{ color: accentColor, fontSize: 12 }}
                      formatter={(value) => [`${value} баллов`, 'Результат']}
                      labelFormatter={(label, items) => {
                        return items[0]?.payload?.fullDate || label;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      name="Балл"
                      stroke={accentColor} 
                      strokeWidth={3} 
                      dot={{ fill: accentColor, stroke: '#090911', strokeWidth: 2, r: 4 }} 
                      activeDot={{ r: 6, fill: accentColor, stroke: '#fafafa', strokeWidth: 2 }}
                      animationDuration={350}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* List of mock exams */}
          <Card className="p-6 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#717171] mb-4">История пробников</h3>
            {listExams.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#717171] font-medium">
                Нет сохраненных результатов
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-none pr-1">
                {listExams.map(exam => {
                  const dateFormatted = format(parseISO(exam.date), 'dd MMMM yyyy', { locale: ru });
                  return (
                    <div 
                      key={exam.id}
                      className="flex items-center justify-between p-4 bg-[#1c1c1c] border border-white/5 rounded-2xl group transition-all hover:border-white/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 text-base font-bold font-mono text-[#fafafa] border border-white/5">
                          {exam.score}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#fafafa]">
                            {exam.subject}
                          </div>
                          <div className="text-xs text-[#717171] font-medium mt-0.5">
                            {dateFormatted}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => deleteMockExam(exam.id)}
                        className="p-2.5 rounded-xl text-[#717171] hover:text-[#f43f5e] hover:bg-[#f43f5e]/10 transition-all cursor-pointer"
                        title="Удалить результат"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AchievementsTab() {
  const { state } = useApp();
  const isMonochrome = state.settings.theme === 'monochrome';
  const [activeCategory, setActiveCategory] = useState<string>('Все');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Wheel horizontal scroll on PC
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollTo({
        left: el.scrollLeft + e.deltaY * 1.5,
        behavior: 'smooth'
      });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const achievements = getAchievements(state);
  const completed = achievements.filter(a => a.isCompleted);
  
  // Uncompleted, filtered and sorted by progressPercentage descending
  const uncompleted = achievements
    .filter(a => !a.isCompleted)
    .filter(a => activeCategory === 'Все' || a.category === activeCategory)
    .sort((a, b) => b.progressPercentage - a.progressPercentage);

  const totalCount = achievements.length;
  const completedCount = completed.length;
  const totalProgressPercent = Math.round((completedCount / totalCount) * 100) || 0;

  const renderIcon = (name: string, size = 20, className = '') => {
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

  const categories = ['Все', 'Предметы', 'Время', 'Задачи', 'Серии', 'Сессии', 'Пробники'];

  const formatValue = (val: number) => {
    if (val === 0) return '0';
    return Math.round(val * 10) / 10;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16 select-none">
      {/* Top overall centered progress display */}
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="space-y-1 flex flex-col items-center">
          <div className="text-3xl font-black font-mono text-[#fafafa] tracking-tight">
            {completedCount} из {totalCount}
          </div>
          <div className="text-xs text-[#717171] font-bold uppercase tracking-widest">
            Достижений разблокировано
          </div>
          {/* Compact linear progress bar */}
          <div className="mt-4 w-56">
            <div className="h-2 w-full bg-[#1c1c1c] rounded-full border border-white/5 overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${isMonochrome ? 'from-zinc-500 to-white' : 'from-emerald-500 to-[#a3e635]'} rounded-full transition-all duration-200 ease-out`}
                style={{ width: `${totalProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Completed Horizontal Scroll area */}
      <div className="space-y-3 overflow-visible">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#717171]">Выполненные награды</h3>
        {completed.length === 0 ? (
          <div className="p-6 bg-[#1c1c1c] border border-dashed border-white/5 rounded-2xl text-center text-sm text-[#717171] font-medium">
            Вы пока не открыли ни одного достижения. Сделайте первый шаг прямо сегодня!
          </div>
        ) : (
          /* Outer container with padding-y and margin-y to support hovered scales without clipping */
          <div className="py-2 overflow-visible">
            <div 
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto py-2 px-1 scrollbar-none snap-x snap-mandatory overflow-visible cursor-grab active:cursor-grabbing"
            >
              {completed.map(ach => (
                <div 
                  key={ach.id}
                  className="w-[200px] h-[142px] shrink-0 p-5 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex flex-col justify-between snap-start transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_15px_35px_rgba(0,0,0,0.45)] relative overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                >
                  {/* Decorative glowing gradient circle background */}
                  <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-gradient-to-br ${ach.color} opacity-20 blur-xl group-hover:opacity-40 transition-all`} />
                  
                  <div className="flex justify-between items-start relative z-10">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${ach.color} text-white shadow-lg`}>
                      {renderIcon(ach.iconName, 18)}
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 relative z-10">
                    <h4 className="text-xs font-mono font-bold text-[#fafafa] tracking-wide uppercase truncate mt-2">{ach.title}</h4>
                    <p className="text-[11px] text-[#717171] font-semibold leading-snug line-clamp-2">{ach.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* In-progress Achievements list */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#717171]">В процессе достижения</h3>
          
          {/* Sub-tabs / Categories Filter */}
          <div className="flex gap-1.5 bg-[#1c1c1c] p-1 rounded-xl border border-white/5 w-full sm:w-auto overflow-x-auto scrollbar-none">
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold relative transition-all shrink-0 focus:outline-none outline-none select-none ${isActive ? 'text-[#090911]' : 'text-[#717171] hover:text-[#fafafa]'}`}
                >
                  <span className="relative z-10">{cat}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="achievements-category-pill"
                      className="absolute inset-0 bg-[#fafafa] rounded-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {uncompleted.length === 0 ? (
          <div className="p-12 bg-[#1c1c1c] border border-white/5 rounded-2xl text-center text-sm text-[#717171] font-medium">
            Все награды в этой категории успешно открыты! Поздравляем! 🎉
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uncompleted.map(ach => (
              <div 
                key={ach.id}
                className="bg-[#1c1c1c] border border-white/5 p-5 rounded-2xl flex flex-col justify-between transition-all hover:border-white/10 hover:bg-[#222224]"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-[#717171] flex items-center justify-center shrink-0">
                      {renderIcon(ach.iconName, 18)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[#fafafa] truncate">{ach.title}</h4>
                      <p className="text-xs text-[#717171] truncate">{ach.description}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-[#717171] font-medium">Прогресс</span>
                    <span className="font-mono text-xs font-semibold text-[#fafafa]/80">
                      {formatValue(ach.current)} / {ach.target} {ach.unit}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${isMonochrome ? 'from-zinc-400 to-white' : 'from-[#a3e635] to-[#a3e635]/80'} rounded-full transition-all duration-200`}
                      style={{ width: `${ach.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
