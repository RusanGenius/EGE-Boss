import { format, parseISO } from 'date-fns';
import { AppState } from '../types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  current: number;
  target: number;
  unit: string;
  iconName: string;
  color: string;
  isCompleted: boolean;
  progressPercentage: number;
}

export function getStreakStats(sessions: any[]) {
  if (!sessions || sessions.length === 0) return 0;
  
  // Format dates as YYYY-MM-DD
  const dates = sessions.map(s => {
    try {
      return format(parseISO(s.date), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }).filter(Boolean);
  
  // Add unique dates
  const uniqueDates = Array.from(new Set(dates)).sort();
  if (uniqueDates.length === 0) return 0;
  
  let maxStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i-1]);
    const currDate = new Date(uniqueDates[i]);
    
    // Difference in days
    const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }
  
  return maxStreak;
}

export function getAchievements(state: AppState): Achievement[] {
  const sessions = state.sessions || [];
  const mockExams = state.mockExams || [];

  // Calculate subject-specific hours
  const getSubjectHours = (subj: string) => {
    const seconds = sessions
      .filter(s => s.subject === subj)
      .reduce((sum, s) => sum + s.durationSeconds, 0);
    return seconds / 3600;
  };

  const mathHours = getSubjectHours('Математика');
  const russianHours = getSubjectHours('Русский язык');
  const itHours = getSubjectHours('Информатика');
  const physicsHours = getSubjectHours('Физика');

  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalHours = totalSeconds / 3600;

  const correctTasks = sessions.reduce((sum, s) => {
    const sessionCorrect = s.answers ? s.answers.filter((a: any) => a.isCorrect).length : 0;
    return sum + sessionCorrect;
  }, 0);

  const maxStreak = getStreakStats(sessions);
  const sessionCount = sessions.length;
  const maxMockScore = mockExams.length > 0 ? Math.max(...mockExams.map((e: any) => e.score)) : 0;

  const rawAchievements = [
    // MATHEMATICS
    {
      id: 'math_1',
      title: 'Первые формулы',
      description: '1 час занятий математикой',
      category: 'Предметы',
      current: mathHours,
      target: 1,
      unit: 'ч',
      iconName: 'Calculator',
      color: 'from-amber-500 to-orange-600'
    },
    {
      id: 'math_5',
      title: 'Властелин цифр',
      description: '5 часов занятий математикой',
      category: 'Предметы',
      current: mathHours,
      target: 5,
      unit: 'ч',
      iconName: 'Calculator',
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'math_15',
      title: 'Профильный разум',
      description: '15 часов занятий математикой',
      category: 'Предметы',
      current: mathHours,
      target: 15,
      unit: 'ч',
      iconName: 'Calculator',
      color: 'from-red-600 to-rose-700'
    },
    {
      id: 'math_30',
      title: 'Аналитический мозг',
      description: '30 часов занятий математикой',
      category: 'Предметы',
      current: mathHours,
      target: 30,
      unit: 'ч',
      iconName: 'Calculator',
      color: 'from-fuchsia-600 to-pink-700'
    },

    // RUSSIAN
    {
      id: 'russian_1',
      title: 'Великий оратор',
      description: '1 час занятий русским языком',
      category: 'Предметы',
      current: russianHours,
      target: 1,
      unit: 'ч',
      iconName: 'Award',
      color: 'from-sky-500 to-blue-600'
    },
    {
      id: 'russian_5',
      title: 'Грамотей',
      description: '5 часов занятий русским языком',
      category: 'Предметы',
      current: russianHours,
      target: 5,
      unit: 'ч',
      iconName: 'Award',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'russian_15',
      title: 'Мастер слова',
      description: '15 часов занятий русским языком',
      category: 'Предметы',
      current: russianHours,
      target: 15,
      unit: 'ч',
      iconName: 'Award',
      color: 'from-indigo-600 to-purple-700'
    },
    {
      id: 'russian_30',
      title: 'Душа поэта',
      description: '30 часов занятий русским языком',
      category: 'Предметы',
      current: russianHours,
      target: 30,
      unit: 'ч',
      iconName: 'Award',
      color: 'from-violet-600 to-fuchsia-700'
    },

    // INFORMATICS
    {
      id: 'it_1',
      title: 'Первый алгоритм',
      description: '1 час занятий информатикой',
      category: 'Предметы',
      current: itHours,
      target: 1,
      unit: 'ч',
      iconName: 'Sparkles',
      color: 'from-teal-400 to-emerald-600'
    },
    {
      id: 'it_5',
      title: 'Юный хакер',
      description: '5 часов занятий информатикой',
      category: 'Предметы',
      current: itHours,
      target: 5,
      unit: 'ч',
      iconName: 'Sparkles',
      color: 'from-emerald-500 to-green-600'
    },
    {
      id: 'it_15',
      title: 'Повелитель байтов',
      description: '15 часов занятий информатикой',
      category: 'Предметы',
      current: itHours,
      target: 15,
      unit: 'ч',
      iconName: 'Sparkles',
      color: 'from-green-600 to-teal-700'
    },
    {
      id: 'it_30',
      title: 'Кибер-разум',
      description: '30 часов занятий информатикой',
      category: 'Предметы',
      current: itHours,
      target: 30,
      unit: 'ч',
      iconName: 'Sparkles',
      color: 'from-cyan-500 to-teal-600'
    },

    // PHYSICS
    {
      id: 'physics_1',
      title: 'Закон Ньютона',
      description: '1 час занятий физикой',
      category: 'Предметы',
      current: physicsHours,
      target: 1,
      unit: 'ч',
      iconName: 'Shield',
      color: 'from-orange-500 to-amber-600'
    },
    {
      id: 'physics_5',
      title: 'Сила притяжения',
      description: '5 часов занятий физикой',
      category: 'Предметы',
      current: physicsHours,
      target: 5,
      unit: 'ч',
      iconName: 'Shield',
      color: 'from-amber-600 to-yellow-700'
    },
    {
      id: 'physics_15',
      title: 'Квантовый скачок',
      description: '15 часов занятий физикой',
      category: 'Предметы',
      current: physicsHours,
      target: 15,
      unit: 'ч',
      iconName: 'Shield',
      color: 'from-yellow-500 to-lime-600'
    },
    {
      id: 'physics_30',
      title: 'Теория всего',
      description: '30 часов занятий физикой',
      category: 'Предметы',
      current: physicsHours,
      target: 30,
      unit: 'ч',
      iconName: 'Shield',
      color: 'from-emerald-500 to-teal-600'
    },

    // TOTAL TIME
    {
      id: 'time_10',
      title: 'Грызун гранита',
      description: '10 часов учебы всего',
      category: 'Время',
      current: totalHours,
      target: 10,
      unit: 'ч',
      iconName: 'Clock',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'time_30',
      title: 'Абсолютный фокус',
      description: '30 часов учебы всего',
      category: 'Время',
      current: totalHours,
      target: 30,
      unit: 'ч',
      iconName: 'Clock',
      color: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'time_100',
      title: 'Вечный студент',
      description: '100 часов учебы всего',
      category: 'Время',
      current: totalHours,
      target: 100,
      unit: 'ч',
      iconName: 'Clock',
      color: 'from-purple-600 to-pink-700'
    },

    // TASKS (CORRECT)
    {
      id: 'correct_30',
      title: 'Первые шаги',
      description: '30 верно решённых задач',
      category: 'Задачи',
      current: correctTasks,
      target: 30,
      unit: '',
      iconName: 'CheckCircle2',
      color: 'from-emerald-500 to-green-600'
    },
    {
      id: 'correct_50',
      title: 'Половина пути',
      description: '50 верно решённых задач',
      category: 'Задачи',
      current: correctTasks,
      target: 50,
      unit: '',
      iconName: 'CheckCircle2',
      color: 'from-green-500 to-teal-600'
    },
    {
      id: 'correct_100',
      title: 'Мастер решений',
      description: '100 верно решённых задач',
      category: 'Задачи',
      current: correctTasks,
      target: 100,
      unit: '',
      iconName: 'CheckCircle2',
      color: 'from-teal-500 to-cyan-600'
    },
    {
      id: 'correct_500',
      title: 'Гений мысли',
      description: '500 верно решённых задач',
      category: 'Задачи',
      current: correctTasks,
      target: 500,
      unit: '',
      iconName: 'Trophy',
      color: 'from-pink-500 to-rose-600'
    },
    {
      id: 'correct_1000',
      title: 'Укротитель тестов',
      description: '1000 верно решённых задач',
      category: 'Задачи',
      current: correctTasks,
      target: 1000,
      unit: '',
      iconName: 'Trophy',
      color: 'from-purple-600 to-pink-600'
    },

    // STREAKS
    {
      id: 'streak_3',
      title: 'Выносливость',
      description: 'Стрик из 3 дней занятий',
      category: 'Серии',
      current: maxStreak,
      target: 3,
      unit: 'дн',
      iconName: 'Flame',
      color: 'from-red-500 to-amber-600'
    },
    {
      id: 'streak_7',
      title: 'Регулярность',
      description: 'Неделя занятий подряд',
      category: 'Серии',
      current: maxStreak,
      target: 7,
      unit: 'дн',
      iconName: 'Flame',
      color: 'from-orange-500 to-yellow-600'
    },
    {
      id: 'streak_14',
      title: 'Железная воля',
      description: '2 недели занятий подряд',
      category: 'Серии',
      current: maxStreak,
      target: 14,
      unit: 'дн',
      iconName: 'Shield',
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'streak_30',
      title: 'Дисциплина титана',
      description: 'Месяц занятий подряд',
      category: 'Серии',
      current: maxStreak,
      target: 30,
      unit: 'дн',
      iconName: 'Flame',
      color: 'from-pink-600 to-red-600'
    },

    // SESSIONS
    {
      id: 'sessions_30',
      title: 'Погружение',
      description: '30 выполненных сессий',
      category: 'Сессии',
      current: sessionCount,
      target: 30,
      unit: '',
      iconName: 'Sparkles',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'sessions_50',
      title: 'Опытный боец',
      description: '50 выполненных сессий',
      category: 'Сессии',
      current: sessionCount,
      target: 50,
      unit: '',
      iconName: 'Sparkles',
      color: 'from-teal-500 to-emerald-600'
    },
    {
      id: 'sessions_100',
      title: 'Легенда',
      description: '100 выполненных сессий',
      category: 'Сессии',
      current: sessionCount,
      target: 100,
      unit: '',
      iconName: 'Trophy',
      color: 'from-yellow-500 to-amber-600'
    },
    {
      id: 'sessions_200',
      title: 'Абсолютный чемпион',
      description: '200 выполненных сессий',
      category: 'Сессии',
      current: sessionCount,
      target: 200,
      unit: '',
      iconName: 'Trophy',
      color: 'from-red-500 to-pink-600'
    },

    // MOCK EXAMS
    {
      id: 'mock_50',
      title: 'Хорошист',
      description: '50+ баллов за пробник',
      category: 'Пробники',
      current: maxMockScore,
      target: 50,
      unit: 'б',
      iconName: 'Award',
      color: 'from-sky-500 to-blue-600'
    },
    {
      id: 'mock_70',
      title: 'Прорыв',
      description: '70+ баллов за пробник',
      category: 'Пробники',
      current: maxMockScore,
      target: 70,
      unit: 'б',
      iconName: 'Award',
      color: 'from-violet-500 to-indigo-600'
    },
    {
      id: 'mock_75',
      title: 'Кандидат',
      description: '75+ баллов за пробник',
      category: 'Пробники',
      current: maxMockScore,
      target: 75,
      unit: 'б',
      iconName: 'Award',
      color: 'from-fuchsia-500 to-purple-600'
    },
    {
      id: 'mock_80',
      title: 'Отличник',
      description: '80+ баллов за пробник',
      category: 'Пробники',
      current: maxMockScore,
      target: 80,
      unit: 'б',
      iconName: 'Star',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      id: 'mock_85',
      title: 'Эксперт',
      description: '85+ баллов за пробник',
      category: 'Пробники',
      current: maxMockScore,
      target: 85,
      unit: 'б',
      iconName: 'Shield',
      color: 'from-emerald-400 to-teal-600'
    },
    {
      id: 'mock_90',
      title: 'Гений',
      description: '90+ баллов за пробник',
      category: 'Пробники',
      current: maxMockScore,
      target: 90,
      unit: 'б',
      iconName: 'Trophy',
      color: 'from-red-500 via-purple-600 to-blue-600'
    },
    {
      id: 'mock_100',
      title: 'Стобалльник',
      description: '100 баллов за пробник',
      category: 'Пробники',
      current: maxMockScore,
      target: 100,
      unit: 'б',
      iconName: 'Trophy',
      color: 'from-yellow-400 via-amber-500 to-emerald-500'
    }
  ];

  return rawAchievements.map(ach => {
    const isCompleted = ach.current >= ach.target;
    const progressPercentage = isCompleted 
      ? 100 
      : Math.min(100, Math.max(0, (ach.current / ach.target) * 100));
    return {
      ...ach,
      isCompleted,
      progressPercentage
    };
  });
}
