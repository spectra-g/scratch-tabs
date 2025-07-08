import React, { useCallback } from 'react';
import { Tablet, TabletState } from '../types';
import { Timer, Settings, BarChart2, Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, Coffee, Brain, ListChecks } from 'lucide-react';
import { PomodoroTimer } from './components/PomodoroTimer';
import { PomodoroSettings } from './components/PomodoroSettings';
import { PomodoroStats } from './components/PomodoroStats';
import { PomodoroQuote } from './components/PomodoroQuote';
import { PomodoroState } from './types';
import { DEFAULT_SETTINGS, DEFAULT_QUOTES } from './constants';
import { usePomodoroEngine } from './usePomodoroEngine';

interface PomodoroTabletState extends TabletState {
  type: 'pomodoro';
  data: PomodoroState;
}

// --- UI Component ---
const PomodoroTabletUI: React.FC<{
  state: PomodoroTabletState;
  onChange: (state: PomodoroTabletState) => void;
  tabletId: string;
}> = ({ state, onChange, tabletId }) => {
  // Memoize the onChange handler to prevent unnecessary re-renders
  const handleStateChange = useCallback((newData: PomodoroState) => {
    onChange({
      ...state,
      data: newData
    });
  }, [onChange, state]);

  const {
    state: data,
    handleStart, handlePause, handleReset, handleSkip, handleSettingsChange,
    setSessionGoal, toggleSound, changeView
  } = usePomodoroEngine(state.data, handleStateChange);

  const { status, currentSession, todayStats, activeView, soundEnabled } = data;

  const renderView = () => {
    switch (activeView) {
      case 'settings':
        return <PomodoroSettings settings={data.settings} onSave={handleSettingsChange} onCancel={() => changeView('timer')} />;
      case 'stats':
        return <PomodoroStats todayStats={todayStats} sessions={data.sessions} onBack={() => changeView('timer')} />;
      case 'timer':
      default:
        return (
          <div className="flex flex-col items-center w-full max-w-md">
            <PomodoroTimer 
              currentSession={currentSession} 
              status={status}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              onSkip={handleSkip}
            />
            <div className="w-full mt-6">
              <label htmlFor="session-goal" className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-400">
                <ListChecks size={16} />
                Session Goal
              </label>
              <input
                id="session-goal"
                type="text"
                value={currentSession.goal}
                onChange={(e) => setSessionGoal(e.target.value)}
                placeholder={currentSession.type === 'focus' ? "What's the one thing to focus on?" : "Time to relax..."}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 text-center"
                disabled={status === 'running'}
              />
            </div>
            <div className="mt-8 w-full max-w-md">
                <PomodoroQuote quotes={DEFAULT_QUOTES} />
            </div>
          </div>
        );
    }
  };

  const SessionIcon = currentSession.type === 'focus' ? Brain : Coffee;
  const sessionColor = currentSession.type === 'focus' ? 'text-blue-400' : currentSession.type === 'shortBreak' ? 'text-green-400' : 'text-purple-400';

  return (
    <div className="h-full bg-gray-900 text-gray-200 flex flex-col" data-pomodoro-id={tabletId}>
      <div className="flex-none p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Timer className="text-gray-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-100">Pomodoro Timer</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => changeView('timer')} className={`p-2 rounded-md transition-colors ${activeView === 'timer' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`} title="Timer"><Play size={18} /></button>
            <button onClick={() => changeView('stats')} className={`p-2 rounded-md transition-colors ${activeView === 'stats' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`} title="Statistics"><BarChart2 size={18} /></button>
            <button onClick={() => changeView('settings')} className={`p-2 rounded-md transition-colors ${activeView === 'settings' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`} title="Settings"><Settings size={18} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 custom-scrollbar flex flex-col items-center">
        {renderView()}
      </div>

      <div className="flex-none p-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={toggleSound} className={`p-2 rounded-md transition-colors ${soundEnabled ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-300'}`} title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}>
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <SessionIcon size={16} className={sessionColor} />
              <span>Session {todayStats.focusCompleted + 1}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleReset} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-colors" title="Reset Timer (R)"><RotateCcw size={18} /></button>
            <button onClick={handleSkip} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-colors" title="Skip to Next Session (S)"><SkipForward size={18} /></button>
            <button onClick={status === 'running' ? handlePause : handleStart} className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${status === 'running' ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`} title={status === 'running' ? 'Pause (Space)' : 'Start (Space)'}>
              {status === 'running' ? <Pause size={18} /> : <Play size={18} />}
              <span>{status === 'running' ? 'Pause' : 'Start'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Wrapper Component ---
const PomodoroTabletWrapper: React.FC<{
  state: PomodoroTabletState;
  onChange: (state: PomodoroTabletState) => void;
}> = ({ state, onChange }) => {
  const tabletInstanceId = React.useMemo(() => `pomodoro-${crypto.randomUUID()}`, []);
  return <PomodoroTabletUI state={state} onChange={onChange} tabletId={tabletInstanceId} />;
};


// --- Tablet Definition ---
export const PomodoroTablet: Tablet = {
  id: 'pomodoro',
  label: 'Pomodoro Timer',
  keywords: ['pomodoro', 'timer', 'focus', 'productivity', 'time management'],

  createInitialState(): PomodoroTabletState {
    return {
      type: 'pomodoro',
      data: {
        status: 'idle',
        currentSession: {
          type: 'focus',
          duration: DEFAULT_SETTINGS.focusDuration * 60,
          timeRemaining: DEFAULT_SETTINGS.focusDuration * 60,
          startTime: 0,
          pauseTime: 0,
          totalPausedTime: 0,
          goal: '',
        },
        settings: DEFAULT_SETTINGS,
        sessions: [],
        todayStats: {
          focusCompleted: 0,
          shortBreakCompleted: 0,
          longBreakCompleted: 0,
          totalFocusTime: 0,
          currentStreak: 0,
          bestStreak: 0
        },
        activeView: 'timer',
        soundEnabled: true
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    const defaultState = this.createInitialState();
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'pomodoro' && parsed.data) {
        // Deep merge to ensure all properties are present and handle old states
        const data = {
          ...defaultState.data,
          ...parsed.data,
          settings: { ...defaultState.data.settings, ...parsed.data.settings },
          currentSession: { ...defaultState.data.currentSession, ...parsed.data.currentSession },
          todayStats: { ...defaultState.data.todayStats, ...parsed.data.todayStats },
          sessions: Array.isArray(parsed.data.sessions) ? parsed.data.sessions : [],
        };
        return { type: 'pomodoro', data };
      }
    } catch (e) {
      console.error("Failed to deserialize pomodoro state:", e);
    }
    return defaultState;
  },

  render(state: TabletState, onChange) {
    const pomodoroState = state as PomodoroTabletState;
    return <PomodoroTabletWrapper state={pomodoroState} onChange={onChange as (newState: PomodoroTabletState) => void} />;
  },
};