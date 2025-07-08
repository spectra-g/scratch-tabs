// src/tablets/pomodoro/usePomodoroEngine.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { PomodoroState, SessionType, PomodoroSession, PomodoroSettings as PomodoroSettingsType, TimerStatus } from './types';

export const usePomodoroEngine = (initialState: PomodoroState, onChange: (newState: PomodoroState) => void) => {
  const [state, setState] = useState(initialState);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onChangeRef = useRef(onChange);
  const pendingStateRef = useRef<PomodoroState | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);

  // Update the ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Effect to propagate state changes to parent with debouncing
  useEffect(() => {
    if (pendingStateRef.current) {
      // Clear any existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Debounce rapid state changes (e.g., timer updates) but allow immediate updates for user actions
      const isTimerUpdate = pendingStateRef.current.status === 'running' && 
                           state.status === 'running' && 
                           pendingStateRef.current.currentSession.timeRemaining !== state.currentSession.timeRemaining;
      
      if (isTimerUpdate) {
        // Debounce timer updates to reduce frequency
        debounceTimeoutRef.current = window.setTimeout(() => {
          onChangeRef.current(pendingStateRef.current!);
          pendingStateRef.current = null;
          debounceTimeoutRef.current = null;
        }, 100); // 100ms debounce for timer updates
      } else {
        // Immediate update for user actions
        onChangeRef.current(pendingStateRef.current);
        pendingStateRef.current = null;
      }
    }
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Initialize Audio object only once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/bell.mp3');
      audioRef.current.volume = 0.5; // Set volume to 50%
      
      // Preload the audio
      audioRef.current.load();
    }
  }, []);

  // Helper function to queue state change for parent
  const queueStateChange = useCallback((newState: PomodoroState) => {
    pendingStateRef.current = newState;
  }, []);

  const startNextSession = useCallback((completedSession: PomodoroSession) => {
    setState(prevState => {
      let newTodayStats = { ...prevState.todayStats };
      if (completedSession.type === 'focus' && completedSession.completed) {
        newTodayStats.focusCompleted++;
        newTodayStats.totalFocusTime += completedSession.duration;
        newTodayStats.currentStreak++;
        newTodayStats.bestStreak = Math.max(newTodayStats.bestStreak, newTodayStats.currentStreak);
      } else {
        newTodayStats.currentStreak = 0; // Reset streak on breaks or skips
        if (completedSession.type === 'shortBreak') newTodayStats.shortBreakCompleted++;
        if (completedSession.type === 'longBreak') newTodayStats.longBreakCompleted++;
      }

      let nextSessionType: SessionType = 'focus';
      if (completedSession.type === 'focus') {
        nextSessionType = (newTodayStats.focusCompleted % prevState.settings.longBreakInterval === 0) ? 'longBreak' : 'shortBreak';
      }

      const durationMap = {
        focus: prevState.settings.focusDuration * 60,
        shortBreak: prevState.settings.shortBreakDuration * 60,
        longBreak: prevState.settings.longBreakDuration * 60,
      };
      const nextDuration = durationMap[nextSessionType];

      const newSession = {
          type: nextSessionType,
          duration: nextDuration,
          timeRemaining: nextDuration,
          startTime: prevState.settings.autoStartNextSession ? Date.now() : 0,
          pauseTime: 0,
          totalPausedTime: 0,
          goal: ''
      };

      const newStatus: TimerStatus = prevState.settings.autoStartNextSession ? 'running' : 'idle';
      const newState: PomodoroState = {
          ...prevState,
          status: newStatus,
          currentSession: newSession,
          sessions: [...prevState.sessions, completedSession],
          todayStats: newTodayStats,
      };

      // Queue the state change for parent instead of calling onChange directly
      queueStateChange(newState);
      return newState;
    });
  }, [queueStateChange]);

  useEffect(() => {
    if (state.status !== 'running') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      document.title = 'Scratch Tabs'; // Reset title when not running
      return;
    }

    // Ensure startTime is set if we transition to running
    if (state.currentSession.startTime === 0) {
      setState(s => {
        const newState: PomodoroState = {
          ...s, 
          currentSession: {...s.currentSession, startTime: Date.now()}
        };
        queueStateChange(newState);
        return newState;
      });
    }

    timerRef.current = window.setInterval(() => {
      setState(prevState => {
        if (prevState.status !== 'running' || prevState.currentSession.startTime === 0) {
            return prevState;
        }

        const now = Date.now();
        const elapsed = Math.floor((now - prevState.currentSession.startTime) / 1000);
        const timeRemaining = Math.max(0, prevState.currentSession.duration - elapsed);

        document.title = `(${(new Date(timeRemaining * 1000).toISOString().substr(14, 5))}) ${prevState.currentSession.type}`;

        if (timeRemaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;

          if (prevState.soundEnabled && audioRef.current) {
            // Try to play the sound with better error handling
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  // Sound played successfully
                })
                .catch(err => {
                  console.error('Audio play failed:', err);
                });
            }
          }

          startNextSession({
            type: prevState.currentSession.type,
            duration: prevState.currentSession.duration,
            startTime: prevState.currentSession.startTime,
            endTime: now,
            completed: true,
            goal: prevState.currentSession.goal
          });
          return prevState;
        }

        const newState: PomodoroState = {
            ...prevState,
            currentSession: { ...prevState.currentSession, timeRemaining }
        };
        
        // Queue the state change for parent instead of calling onChange directly
        queueStateChange(newState);
        return newState;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.title = 'Scratch Tabs';
    };
  }, [state.status, state.currentSession.startTime, state.currentSession.duration, state.currentSession.type, state.soundEnabled, startNextSession, queueStateChange]);

  const handleStart = useCallback(() => {
    const now = Date.now();
    setState(prevState => {
      const newState: PomodoroState = {
        ...prevState,
        status: 'running',
        currentSession: {
          ...prevState.currentSession,
          startTime: prevState.status === 'paused' ? now - (prevState.currentSession.duration - prevState.currentSession.timeRemaining) * 1000 : now,
        }
      };
      queueStateChange(newState);
      return newState;
    });
  }, [queueStateChange]);

  const handlePause = useCallback(() => {
    setState(prevState => {
      const newState: PomodoroState = { ...prevState, status: 'paused' };
      queueStateChange(newState);
      return newState;
    });
  }, [queueStateChange]);

  const handleReset = useCallback(() => {
    const { settings, currentSession } = state;
    const duration = currentSession.type === 'focus' ? settings.focusDuration * 60 : currentSession.type === 'shortBreak' ? settings.shortBreakDuration * 60 : settings.longBreakDuration * 60;

    setState(prevState => {
      const newState: PomodoroState = {
        ...prevState,
        status: 'idle',
        currentSession: { ...prevState.currentSession, duration, timeRemaining: duration, startTime: 0, pauseTime: 0, totalPausedTime: 0 }
      };
      queueStateChange(newState);
      return newState;
    });
  }, [state.settings, state.currentSession.type, queueStateChange]);

  const handleSkip = useCallback(() => {
    startNextSession({ ...state.currentSession, endTime: Date.now(), completed: false });
  }, [state.currentSession, startNextSession]);

  const handleSettingsChange = useCallback((newSettings: PomodoroSettingsType) => {
    setState(prevState => {
        const newDuration = prevState.currentSession.type === 'focus' ? newSettings.focusDuration * 60 : prevState.currentSession.duration;
        const newState: PomodoroState = {
            ...prevState,
            settings: newSettings,
            status: 'idle',
            currentSession: { ...prevState.currentSession, duration: newDuration, timeRemaining: newDuration, startTime: 0, pauseTime: 0, totalPausedTime: 0 }
        };
        queueStateChange(newState);
        return newState;
    });
  }, [queueStateChange]);

  const setSessionGoal = useCallback((goal: string) => {
    setState(prevState => {
      const newState: PomodoroState = {
          ...prevState,
          currentSession: { ...prevState.currentSession, goal }
      };
      queueStateChange(newState);
      return newState;
    });
  }, [queueStateChange]);

  const toggleSound = useCallback(() => {
    setState(prevState => {
      const newState: PomodoroState = { ...prevState, soundEnabled: !prevState.soundEnabled };
      queueStateChange(newState);
      return newState;
    });
  }, [queueStateChange]);

  const changeView = useCallback((view: 'timer' | 'settings' | 'stats') => {
    setState(prevState => {
      const newState: PomodoroState = { ...prevState, activeView: view };
      queueStateChange(newState);
      return newState;
    });
  }, [queueStateChange]);

  return {
    state,
    handleStart,
    handlePause,
    handleReset,
    handleSkip,
    handleSettingsChange,
    setSessionGoal,
    toggleSound,
    changeView,
  };
};