export type TimerStatus = 'idle' | 'running' | 'paused';
export type SessionType = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  focusDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // number of focus sessions before a long break
  autoStartNextSession: boolean;
}

export interface PomodoroSession {
  type: SessionType;
  duration: number; // in seconds
  startTime: number; // timestamp
  endTime: number; // timestamp
  completed: boolean;
}

export interface CurrentSession {
  type: SessionType;
  duration: number; // in seconds
  timeRemaining: number; // in seconds
  startTime: number; // timestamp when started
  pauseTime: number; // timestamp when paused
  totalPausedTime: number; // total time spent paused in ms
}

export interface TodayStats {
  focusCompleted: number;
  shortBreakCompleted: number;
  longBreakCompleted: number;
  totalFocusTime: number; // in seconds
  currentStreak: number;
  bestStreak: number;
}

export interface PomodoroState {
  status: TimerStatus;
  currentSession: CurrentSession;
  settings: PomodoroSettings;
  sessions: PomodoroSession[];
  todayStats: TodayStats;
  activeView: 'timer' | 'settings' | 'stats';
  soundEnabled: boolean;
}

export interface Quote {
  text: string;
  author: string;
}