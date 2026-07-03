export type Subject = 'Математика' | 'Русский язык' | 'Информатика' | 'Физика' | 'Обществознание' | 'Биология' | 'Химия';

export interface Answer {
  id: string;
  isCorrect: boolean;
  comment?: string;
  timestamp: number;
  taskType?: string;
}

export interface Session {
  id: string;
  date: string; // ISO string
  subject: Subject;
  taskType: string;
  durationSeconds: number;
  answers: Answer[];
}

export interface Plan {
  id: string;
  title: string;
  subject: Subject;
  taskType: string;
  targetTasks: number;
  completedTasks: number;
  createdAt?: number;
}

export interface Settings {
  hideTimer: boolean;
  hideErrorComments: boolean;
  hideTaskMarkers: boolean;
  screenBurnProtection: boolean;
  activeSubjects: Subject[];
  syncCode: string;
  syncCodeCreatedAt?: number;
  theme?: 'green' | 'monochrome';
  timerMode: TimerModeType;
}

export type TimerModeType = 'default' | 'onlyMinutes' | 'currentTime';

export interface ActiveSession {
  focusState: 'setup' | 'active' | 'results';
  subject: Subject;
  taskType: string;
  targetInput: string;
  elapsedSeconds: number;
  startTime: number | null;
  answers: Answer[];
  compositeCorrectness?: { [taskType: string]: boolean | null };
}

export interface MockExam {
  id: string;
  subject: Subject;
  score: number; // 1-100
  date: string; // ISO string (e.g. 2026-06-25T00:00:00.000Z)
}

export type TabType = 'focus' | 'stats' | 'history' | 'plans' | 'settings';

export interface AppState {
  sessions: Session[];
  plans: Plan[];
  mockExams: MockExam[];
  settings: Settings;
  activeTab: TabType;
}
