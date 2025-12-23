import React from "react";
import { PomodoroSession } from "../types";
import { formatTimeFromTimestamp } from "../utils/timeUtils";

interface PomodoroTimelineProps {
  sessions: PomodoroSession[];
}

export const PomodoroTimeline: React.FC<PomodoroTimelineProps> = ({
  sessions,
}) => {
  // Filter to only show today's sessions
  const todaySessions = sessions.filter((session) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return session.endTime >= today.getTime();
  });

  if (todaySessions.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        No sessions completed today
      </div>
    );
  }

  // Sort sessions by start time
  const sortedSessions = [...todaySessions].sort(
    (a, b) => a.startTime - b.startTime,
  );

  return (
    <div className="w-full">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-surface-secondary/50"></div>

        {/* Timeline items */}
        <div className="space-y-3">
          {sortedSessions.map((session, index) => (
            <div key={index} className="flex items-start ml-4 pl-6 relative">
              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ${session.type === "focus"
                    ? "bg-primary"
                    : session.type === "shortBreak"
                      ? "bg-green-400"
                      : "bg-purple-400"
                  } ${!session.completed ? "opacity-50" : ""}`}
              ></div>

              {/* Session content */}
              <div
                className={`flex-1 p-3 rounded-md ${session.type === "focus"
                    ? "bg-primary/10 border border-primary/20"
                    : session.type === "shortBreak"
                      ? "bg-green-500/10 border border-green-500/20"
                      : "bg-purple-500/10 border border-purple-500/20"
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div
                      className={`text-sm font-medium ${session.type === "focus"
                          ? "text-primary"
                          : session.type === "shortBreak"
                            ? "text-green-400"
                            : "text-purple-400"
                        }`}
                    >
                      {session.type === "focus"
                        ? "Focus Session"
                        : session.type === "shortBreak"
                          ? "Short Break"
                          : "Long Break"}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Duration: {Math.floor(session.duration / 60)} minutes
                    </div>
                  </div>
                  <div className="text-xs text-muted">
                    {formatTimeFromTimestamp(session.startTime)}
                  </div>
                </div>

                {!session.completed && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Session skipped
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
