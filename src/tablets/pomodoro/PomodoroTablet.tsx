import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tablet, TabletState } from '../types';
import { Timer, Settings, BarChart2, Clock, Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, ChevronDown, ChevronUp, Coffee, Brain } from 'lucide-react';
import { PomodoroTimer } from './components/PomodoroTimer';
import { PomodoroSettings } from './components/PomodoroSettings';
import { PomodoroStats } from './components/PomodoroStats';
import { PomodoroQuote } from './components/PomodoroQuote';
import { PomodoroTimeline } from './components/PomodoroTimeline';
import { PomodoroState, SessionType, PomodoroSession, PomodoroSettings as PomodoroSettingsType } from './types';
import { DEFAULT_SETTINGS, DEFAULT_QUOTES } from './constants';
import { formatTime } from './utils/timeUtils';

interface PomodoroTabletState extends TabletState {
  type: 'pomodoro';
  data: PomodoroState;
}

// Separate React component for Pomodoro tablet UI
const PomodoroTabletUI: React.FC<{
  state: PomodoroTabletState;
  onChange: (state: PomodoroTabletState) => void;
  tabletId: string;
}> = ({ state, onChange, tabletId }) => {
  const { data } = state;
  const [showExpandedView, setShowExpandedView] = useState(false);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio elements
  useEffect(() => {
    audioRef.current = new Audio('/sounds/bell.mp3');
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Timer logic - completely rewritten to avoid state inconsistencies
  useEffect(() => {
    // Only start timer if status is running
    if (data.status !== 'running') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    // Start the timer interval
    timerRef.current = window.setInterval(() => {
      // This function will run every second with the current state values
      const now = Date.now();
      const elapsed = Math.floor((now - data.currentSession.startTime + data.currentSession.totalPausedTime) / 1000);
      const timeRemaining = Math.max(0, data.currentSession.duration - elapsed);
      
      if (timeRemaining <= 0) {
        // Clear the interval before handling session complete to avoid race conditions
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Session completed logic is separated out
        const completedSession: PomodoroSession = {
          type: data.currentSession.type,
          duration: data.currentSession.duration,
          startTime: data.currentSession.startTime - data.currentSession.totalPausedTime,
          endTime: Date.now(),
          completed: true
        };
        
        // Play sound if enabled
        if (data.soundEnabled && audioRef.current) {
          audioRef.current.play().catch(err => console.error('Error playing sound:', err));
        }
        
        // Update stats
        const newTodayStats = { ...data.todayStats };
        
        if (data.currentSession.type === 'focus') {
          newTodayStats.focusCompleted++;
          newTodayStats.totalFocusTime += data.currentSession.duration;
          newTodayStats.currentStreak++;
          newTodayStats.bestStreak = Math.max(newTodayStats.bestStreak, newTodayStats.currentStreak);
        } else if (data.currentSession.type === 'shortBreak') {
          newTodayStats.shortBreakCompleted++;
        } else if (data.currentSession.type === 'longBreak') {
          newTodayStats.longBreakCompleted++;
        }
        
        // Determine next session type
        let nextSessionType: SessionType;
        
        if (data.currentSession.type === 'focus') {
          // After focus, check if we need a long break
          if (newTodayStats.focusCompleted % data.settings.longBreakInterval === 0) {
            nextSessionType = 'longBreak';
          } else {
            nextSessionType = 'shortBreak';
          }
        } else {
          // After any break, go back to focus
          nextSessionType = 'focus';
        }
        
        // Set up next session
        const nextSessionDuration = 
          nextSessionType === 'focus' ? data.settings.focusDuration * 60 :
          nextSessionType === 'shortBreak' ? data.settings.shortBreakDuration * 60 :
          data.settings.longBreakDuration * 60;
        
        const nextSession = {
          type: nextSessionType,
          duration: nextSessionDuration,
          timeRemaining: nextSessionDuration,
          startTime: 0,
          pauseTime: 0,
          totalPausedTime: 0
        };
        
        // Update state with all changes at once
        onChange({
          ...state,
          data: {
            ...data,
            status: data.settings.autoStartNextSession ? 'running' : 'idle',
            currentSession: {
              ...nextSession,
              startTime: data.settings.autoStartNextSession ? Date.now() : 0
            },
            sessions: [...data.sessions, completedSession],
            todayStats: newTodayStats
          }
        });
      } else {
        // Just update the time remaining
        onChange({
          ...state,
          data: {
            ...data,
            currentSession: {
              ...data.currentSession,
              timeRemaining
            }
          }
        });
      }
    }, 1000);
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    data.status, 
    data.currentSession.startTime, 
    data.currentSession.totalPausedTime,
    data.settings,
    data.soundEnabled
  ]);
  
  // Check if it's a new day and reset stats if needed
  useEffect(() => {
    const lastSessionDate = data.sessions.length > 0 
      ? new Date(data.sessions[data.sessions.length - 1].endTime).toDateString() 
      : '';
    const today = new Date().toDateString();
    
    if (lastSessionDate && lastSessionDate !== today) {
      // Reset today's stats
      onChange({
        ...state,
        data: {
          ...data,
          todayStats: {
            focusCompleted: 0,
            shortBreakCompleted: 0,
            longBreakCompleted: 0,
            totalFocusTime: 0,
            currentStreak: 0,
            bestStreak: data.todayStats.bestStreak
          }
        }
      });
    }
  }, [data.sessions]);
  
  // Keyboard shortcuts - make them specific to this pomodoro instance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if this pomodoro is the active one by looking for the pomodoro container
      const pomodoroContainer = document.querySelector(`[data-pomodoro-id="${tabletId}"]`);
      if (!pomodoroContainer || !pomodoroContainer.contains(e.target as Node)) {
        return;
      }

      // Only handle shortcuts if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case ' ': // Space
          e.preventDefault();
          if (data.status === 'running') {
            handlePause();
          } else {
            handleStart();
          }
          break;
        case 'r':
          e.preventDefault();
          handleReset();
          break;
        case 's':
          e.preventDefault();
          handleSkip();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [data.status, tabletId]);
  
  // Timer control handlers
  const handleStart = useCallback(() => {
    const now = Date.now();
    
    onChange({
      ...state,
      data: {
        ...data,
        status: 'running',
        currentSession: {
          ...data.currentSession,
          startTime: data.status === 'paused' 
            ? now - (data.currentSession.duration - data.currentSession.timeRemaining) * 1000 + data.currentSession.totalPausedTime
            : now,
          pauseTime: 0
        }
      }
    });
  }, [data, state, onChange]);
  
  const handlePause = useCallback(() => {
    onChange({
      ...state,
      data: {
        ...data,
        status: 'paused',
        currentSession: {
          ...data.currentSession,
          pauseTime: Date.now()
        }
      }
    });
  }, [data, state, onChange]);
  
  const handleReset = useCallback(() => {
    // Reset current session
    const sessionType = data.currentSession.type;
    const duration = 
      sessionType === 'focus' ? data.settings.focusDuration * 60 :
      sessionType === 'shortBreak' ? data.settings.shortBreakDuration * 60 :
      data.settings.longBreakDuration * 60;
    
    onChange({
      ...state,
      data: {
        ...data,
        status: 'idle',
        currentSession: {
          type: sessionType,
          duration,
          timeRemaining: duration,
          startTime: 0,
          pauseTime: 0,
          totalPausedTime: 0
        }
      }
    });
  }, [data, state, onChange]);
  
  const handleSkip = useCallback(() => {
    // Skip current session and move to next
    const currentSession = data.currentSession;
    
    // Record skipped session
    const skippedSession: PomodoroSession = {
      type: currentSession.type,
      duration: currentSession.duration,
      startTime: currentSession.startTime - currentSession.totalPausedTime,
      endTime: Date.now(),
      completed: false
    };
    
    // Determine next session type
    let nextSessionType: SessionType;
    
    if (currentSession.type === 'focus') {
      // After focus, check if we need a long break
      if (data.todayStats.focusCompleted % data.settings.longBreakInterval === 0) {
        nextSessionType = 'longBreak';
      } else {
        nextSessionType = 'shortBreak';
      }
    } else {
      // After any break, go back to focus
      nextSessionType = 'focus';
    }
    
    // Set up next session
    const nextSessionDuration = 
      nextSessionType === 'focus' ? data.settings.focusDuration * 60 :
      nextSessionType === 'shortBreak' ? data.settings.shortBreakDuration * 60 :
      data.settings.longBreakDuration * 60;
    
    const nextSession = {
      type: nextSessionType,
      duration: nextSessionDuration,
      timeRemaining: nextSessionDuration,
      startTime: 0,
      pauseTime: 0,
      totalPausedTime: 0
    };
    
    // Update state
    onChange({
      ...state,
      data: {
        ...data,
        status: 'idle',
        currentSession: nextSession,
        sessions: [...data.sessions, skippedSession]
      }
    });
  }, [data, state, onChange]);
  
  const handleToggleSound = useCallback(() => {
    onChange({
      ...state,
      data: {
        ...data,
        soundEnabled: !data.soundEnabled
      }
    });
  }, [data, state, onChange]);
  
  const handleChangeSettings = useCallback((newSettings: PomodoroSettingsType) => {
    // Update settings and reset current session
    const sessionType = data.currentSession.type;
    const duration = 
      sessionType === 'focus' ? newSettings.focusDuration * 60 :
      sessionType === 'shortBreak' ? newSettings.shortBreakDuration * 60 :
      newSettings.longBreakDuration * 60;
    
    onChange({
      ...state,
      data: {
        ...data,
        settings: newSettings,
        status: 'idle',
        currentSession: {
          type: sessionType,
          duration,
          timeRemaining: duration,
          startTime: 0,
          pauseTime: 0,
          totalPausedTime: 0
        }
      }
    });
  }, [data, state, onChange]);
  
  const handleChangeView = useCallback((view: 'timer' | 'settings' | 'stats') => {
    onChange({
      ...state,
      data: {
        ...data,
        activeView: view
      }
    });
  }, [data, state, onChange]);
  
  // Render the appropriate view
  const renderView = () => {
    switch (data.activeView) {
      case 'settings':
        return (
          <PomodoroSettings 
            settings={data.settings} 
            onSave={handleChangeSettings} 
            onCancel={() => handleChangeView('timer')}
          />
        );
      case 'stats':
        return (
          <PomodoroStats 
            todayStats={data.todayStats} 
            sessions={data.sessions} 
            onBack={() => handleChangeView('timer')}
          />
        );
      case 'timer':
      default:
        return (
          <PomodoroTimer 
            currentSession={data.currentSession}
            status={data.status}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onSkip={handleSkip}
          />
        );
    }
  };
  
  // Get session type icon
  const getSessionTypeIcon = () => {
    switch (data.currentSession.type) {
      case 'focus':
        return <Brain size={16} className="text-blue-400" />;
      case 'shortBreak':
        return <Coffee size={16} className="text-green-400" />;
      case 'longBreak':
        return <Coffee size={16} className="text-purple-400" />;
    }
  };
  
  // Get session type color
  const getSessionTypeColor = () => {
    switch (data.currentSession.type) {
      case 'focus':
        return 'text-blue-400';
      case 'shortBreak':
        return 'text-green-400';
      case 'longBreak':
        return 'text-purple-400';
    }
  };
  
  // Get session type name
  const getSessionTypeName = () => {
    switch (data.currentSession.type) {
      case 'focus':
        return 'Focus';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
    }
  };
  
  return (
    <div className="h-full bg-gray-900 text-gray-200 flex flex-col" data-pomodoro-id={tabletId}>
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Timer className="text-gray-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-100">Pomodoro Timer</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleChangeView('timer')}
              className={`p-2 rounded-md transition-colors ${
                data.activeView === 'timer' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Timer"
            >
              <Clock size={18} />
            </button>
            
            <button
              onClick={() => handleChangeView('stats')}
              className={`p-2 rounded-md transition-colors ${
                data.activeView === 'stats' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Statistics"
            >
              <BarChart2 size={18} />
            </button>
            
            <button
              onClick={() => handleChangeView('settings')}
              className={`p-2 rounded-md transition-colors ${
                data.activeView === 'settings' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        {/* Session Type Indicator */}
        <div className="flex items-center justify-center mb-4">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-800/50 ${getSessionTypeColor()}`}>
            {getSessionTypeIcon()}
            <span className="font-medium">{getSessionTypeName()}</span>
            {data.status === 'running' && (
              <span className="ml-2 text-xs text-gray-400">
                {formatTime(data.currentSession.timeRemaining)}
              </span>
            )}
          </div>
        </div>
        
        {/* Main View */}
        <div className="flex flex-col items-center">
          {renderView()}
        </div>
        
        {/* Expanded View */}
        {data.activeView === 'timer' && (
          <div className="mt-6">
            <button
              onClick={() => setShowExpandedView(!showExpandedView)}
              className="flex items-center justify-center space-x-1 mx-auto px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
            >
              {showExpandedView ? (
                <>
                  <ChevronUp size={16} />
                  <span>Show Less</span>
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  <span>Show More</span>
                </>
              )}
            </button>
            
            {showExpandedView && (
              <div className="mt-4 space-y-6">
                {/* Today's Stats Summary */}
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Today's Progress</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{data.todayStats.focusCompleted}</div>
                      <div className="text-xs text-gray-400">Focus Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{data.todayStats.shortBreakCompleted}</div>
                      <div className="text-xs text-gray-400">Short Breaks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{data.todayStats.longBreakCompleted}</div>
                      <div className="text-xs text-gray-400">Long Breaks</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Total Focus Time</span>
                      <span className="text-sm font-medium text-gray-200">
                        {Math.floor(data.todayStats.totalFocusTime / 60)} min
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">Current Streak</span>
                      <span className="text-sm font-medium text-gray-200">
                        {data.todayStats.currentStreak} sessions
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">Best Streak</span>
                      <span className="text-sm font-medium text-gray-200">
                        {data.todayStats.bestStreak} sessions
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Timeline */}
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Session Timeline</h3>
                  <PomodoroTimeline sessions={data.sessions} />
                </div>
                
                {/* Motivational Quote */}
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                  <PomodoroQuote quotes={DEFAULT_QUOTES} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex-none p-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-md transition-colors ${
                data.soundEnabled 
                  ? 'text-gray-300 hover:text-gray-100' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title={data.soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {data.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            
            {/* Session Counter */}
            <div className="text-sm text-gray-400">
              <span className="text-blue-400">{data.todayStats.focusCompleted}</span> focus sessions today
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-colors"
              title="Reset Timer (R)"
            >
              <RotateCcw size={18} />
            </button>
            
            {/* Skip Button */}
            <button
              onClick={handleSkip}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-colors"
              title="Skip to Next Session (S)"
            >
              <SkipForward size={18} />
            </button>
            
            {/* Start/Pause Button */}
            <button
              onClick={data.status === 'running' ? handlePause : handleStart}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                data.status === 'running'
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
              title={data.status === 'running' ? 'Pause (Space)' : 'Start (Space)'}
            >
              {data.status === 'running' ? <Pause size={18} /> : <Play size={18} />}
              <span>{data.status === 'running' ? 'Pause' : 'Start'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component to handle stable ID generation
const PomodoroTabletWrapper: React.FC<{
  state: PomodoroTabletState;
  onChange: (state: PomodoroTabletState) => void;
}> = ({ state, onChange }) => {
  const tabletInstanceId = React.useMemo(() => `pomodoro-${crypto.randomUUID()}`, []);
  return <PomodoroTabletUI state={state} onChange={onChange} tabletId={tabletInstanceId} />;
};

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
          duration: 25 * 60, // 25 minutes in seconds
          timeRemaining: 25 * 60,
          startTime: 0,
          pauseTime: 0,
          totalPausedTime: 0
        },
        settings: {
          focusDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          longBreakInterval: 4,
          autoStartNextSession: false
        },
        sessions: [],
        todayStats: {
          focusCompleted: 0,
          shortBreakCompleted: 0,
          longBreakCompleted: 0,
          totalFocusTime: 0,
          currentStreak: 0,
          bestStreak: 0
        },
        soundEnabled: true,
        activeView: 'timer'
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json) as PomodoroTabletState;
      if (parsed.type === 'pomodoro' && parsed.data) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse Pomodoro tablet state:', e);
    }
    return this.createInitialState();
  },

  render(state: PomodoroTabletState, onChange) {
    return <PomodoroTabletWrapper state={state} onChange={onChange} />;
  }
};