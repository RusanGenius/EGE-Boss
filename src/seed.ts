import { AppState } from './types';

export const INITIAL_STATE: AppState = {
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

