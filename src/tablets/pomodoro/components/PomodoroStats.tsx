import React, { useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PomodoroSession, TodayStats } from "../types";
import {
  formatTime,
  formatTimeFromTimestamp,
  formatDateFromTimestamp,
  isSameDay,
} from "../utils/timeUtils";

interface PomodoroStatsProps {
  todayStats: TodayStats;
  sessions: PomodoroSession[];
  onBack: () => void;
}

export const PomodoroStats: React.FC<PomodoroStatsProps> = ({
  todayStats,
  sessions,
  onBack,
}) => {
  // Group sessions by day
  const sessionsByDay = useMemo(() => {
    const grouped: Record<string, PomodoroSession[]> = {};

    sessions.forEach((session) => {
      const dateKey = formatDateFromTimestamp(session.endTime);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });

    return grouped;
  }, [sessions]);

  // Sort days in reverse chronological order
  const sortedDays = useMemo(() => {
    return Object.keys(sessionsByDay).sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return dateB - dateA;
    });
  }, [sessionsByDay]);

  // Calculate stats for each day
  const dailyStats = useMemo(() => {
    return sortedDays.map((day) => {
      const daySessions = sessionsByDay[day];
      const focusCompleted = daySessions.filter(
        (s) => s.type === "focus" && s.completed,
      ).length;
      const shortBreakCompleted = daySessions.filter(
        (s) => s.type === "shortBreak" && s.completed,
      ).length;
      const longBreakCompleted = daySessions.filter(
        (s) => s.type === "longBreak" && s.completed,
      ).length;
      const totalFocusTime = daySessions
        .filter((s) => s.type === "focus" && s.completed)
        .reduce((total, session) => total + session.duration, 0);

      return {
        day,
        focusCompleted,
        shortBreakCompleted,
        longBreakCompleted,
        totalFocusTime,
      };
    });
  }, [sortedDays, sessionsByDay]);

  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-colors mr-3"
          title="Back to Timer"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-semibold text-gray-100">
          Pomodoro Statistics
        </h2>
      </div>

      {/* Today's Stats */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-200 mb-4">
          Today's Progress
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {todayStats.focusCompleted}
            </div>
            <div className="text-sm text-gray-400">Focus Sessions</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {todayStats.shortBreakCompleted}
            </div>
            <div className="text-sm text-gray-400">Short Breaks</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {todayStats.longBreakCompleted}
            </div>
            <div className="text-sm text-gray-400">Long Breaks</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              Focus Time
            </h4>
            <div className="flex items-center">
              <Clock size={20} className="text-blue-400 mr-3" />
              <div className="text-2xl font-bold text-gray-200">
                {Math.floor(todayStats.totalFocusTime / 60)} min
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              Current Streak
            </h4>
            <div className="flex items-center">
              <CheckCircle2 size={20} className="text-green-400 mr-3" />
              <div className="text-2xl font-bold text-gray-200">
                {todayStats.currentStreak} sessions
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Best: {todayStats.bestStreak} sessions
            </div>
          </div>
        </div>
      </div>

      {/* Session History */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-200 mb-4">
          Session History
        </h3>

        {dailyStats.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No session history yet
          </div>
        ) : (
          <div className="space-y-6">
            {dailyStats.map((dayStat) => (
              <div
                key={dayStat.day}
                className="border-b border-gray-700/50 pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center mb-3">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  <h4 className="text-sm font-medium text-gray-300">
                    {dayStat.day}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-400">
                      {dayStat.focusCompleted}
                    </div>
                    <div className="text-xs text-gray-400">Focus</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-400">
                      {dayStat.shortBreakCompleted}
                    </div>
                    <div className="text-xs text-gray-400">Short Breaks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-400">
                      {dayStat.longBreakCompleted}
                    </div>
                    <div className="text-xs text-gray-400">Long Breaks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-200">
                      {Math.floor(dayStat.totalFocusTime / 60)} min
                    </div>
                    <div className="text-xs text-gray-400">Total Focus</div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 max-h-40 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-400 uppercase">
                      <tr>
                        <th className="text-left py-2 px-3">Type</th>
                        <th className="text-left py-2 px-3">Time</th>
                        <th className="text-left py-2 px-3">Duration</th>
                        <th className="text-left py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/30">
                      {sessionsByDay[dayStat.day].map((session, index) => (
                        <tr key={index} className="hover:bg-gray-700/20">
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                session.type === "focus"
                                  ? "bg-blue-400"
                                  : session.type === "shortBreak"
                                    ? "bg-green-400"
                                    : "bg-purple-400"
                              }`}
                            ></span>
                            {session.type === "focus"
                              ? "Focus"
                              : session.type === "shortBreak"
                                ? "Short Break"
                                : "Long Break"}
                          </td>
                          <td className="py-2 px-3 text-gray-400">
                            {formatTimeFromTimestamp(session.startTime)}
                          </td>
                          <td className="py-2 px-3 text-gray-400">
                            {formatTime(session.duration)}
                          </td>
                          <td className="py-2 px-3">
                            {session.completed ? (
                              <span className="flex items-center text-green-400">
                                <CheckCircle2 size={14} className="mr-1" />
                                Completed
                              </span>
                            ) : (
                              <span className="flex items-center text-yellow-400">
                                <XCircle size={14} className="mr-1" />
                                Skipped
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
