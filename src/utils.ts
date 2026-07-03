import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Subject } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BLOCKS_CONFIG: { [subject: string]: { [blockName: string]: string[] } } = {
  'Русский язык': {
    'Блок 1-3': ['Задание 1', 'Задание 2', 'Задание 3'],
    'Блок 23-26': ['Задание 23', 'Задание 24', 'Задание 25', 'Задание 26']
  },
  'Информатика': {
    'Блок 19-21': ['Задание 19', 'Задание 20', 'Задание 21']
  }
};

export const SUBTASKS_CONFIG: { [subject: string]: { [taskName: string]: string[] } } = {
  'Математика': {
    'Задание 13': ['13 (а)', '13 (б)'],
    'Задание 14': ['14 (а)', '14 (б)'],
    'Задание 15': ['15 (а)', '15 (б)'],
    'Задание 17': ['17 (а)', '17 (б)'],
    'Задание 18': ['18 (а)', '18 (б)'],
    'Задание 19': ['19 (а)', '19 (б)', '19 (в)']
  }
};

export function isBlockTask(subject: string, taskType: string): boolean {
  return !!(BLOCKS_CONFIG[subject]?.[taskType]) || !!(SUBTASKS_CONFIG[subject]?.[taskType]);
}

export function getBlockSubtasks(subject: string, taskType: string): string[] {
  return BLOCKS_CONFIG[subject]?.[taskType] || SUBTASKS_CONFIG[subject]?.[taskType] || [];
}

export function getTaskTypes(subject: Subject): string[] {
  const result: string[] = [];
  let total = 0;
  const blocks = BLOCKS_CONFIG[subject] ? Object.keys(BLOCKS_CONFIG[subject]) : [];

  switch (subject) {
    case 'Математика':
      total = 19;
      break;
    case 'Русский язык':
      total = 27;
      break;
    case 'Информатика':
      total = 27;
      break;
    case 'Физика':
      total = 26;
      break;
    case 'Химия':
      total = 34;
      break;
    case 'Биология':
      total = 28;
      break;
    case 'Обществознание':
      total = 25;
      break;
    default:
      total = 20;
  }

  // Generate task types, skipping those in blocks and adding block names in their place
  for (let i = 1; i <= total; i++) {
    const taskName = `Задание ${i}`;
    // Check if taskName is part of any block
    const matchingBlock = blocks.find(blockName => 
      BLOCKS_CONFIG[subject][blockName].includes(taskName)
    );

    if (matchingBlock) {
      if (!result.includes(matchingBlock)) {
        result.push(matchingBlock);
      }
    } else {
      result.push(taskName);
    }
  }

  return result;
}
