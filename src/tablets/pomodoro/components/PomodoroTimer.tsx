import React, { useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { CurrentSession, TimerStatus } from "../types";
import { formatTime } from "../utils/timeUtils";

interface PomodoroTimerProps {
  currentSession: CurrentSession;
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  currentSession,
  status,
  onStart,
  onPause,
  onReset,
  onSkip,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw timer circle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const size = 300;
    canvas.width = size;
    canvas.height = size;

    // Calculate progress
    const progress = currentSession.timeRemaining / currentSession.duration;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(75, 85, 99, 0.3)";
    ctx.lineWidth = 10;
    ctx.stroke();

    // Draw progress arc
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + 2 * Math.PI * progress,
    );

    // Set color based on session type
    let gradientColor;
    switch (currentSession.type) {
      case "focus":
        gradientColor = status === "running" ? "#3b82f6" : "#1e40af";
        break;
      case "shortBreak":
        gradientColor = status === "running" ? "#10b981" : "#065f46";
        break;
      case "longBreak":
        gradientColor = status === "running" ? "#8b5cf6" : "#5b21b6";
        break;
    }

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, gradientColor);
    gradient.addColorStop(1, "rgba(17, 24, 39, 0.8)");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.stroke();

    // Draw pulsing circle if running
    if (status === "running") {
      const pulseSize = 5 + Math.sin(Date.now() / 500) * 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + pulseSize, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [
    currentSession.timeRemaining,
    currentSession.duration,
    currentSession.type,
    status,
  ]);

  // Get session type color
  const getSessionTypeColor = () => {
    switch (currentSession.type) {
      case "focus":
        return "text-blue-400";
      case "shortBreak":
        return "text-green-400";
      case "longBreak":
        return "text-purple-400";
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width="300"
          height="300"
          className="mb-4"
        ></canvas>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-6xl font-bold ${getSessionTypeColor()}`}>
            {formatTime(currentSession.timeRemaining)}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            {currentSession.type === "focus"
              ? "Focus Session"
              : currentSession.type === "shortBreak"
                ? "Short Break"
                : "Long Break"}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4 mt-6">
        <button
          onClick={onReset}
          className="p-3 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-full transition-colors"
          title="Reset Timer (R)"
        >
          <RotateCcw size={20} />
        </button>

        <button
          onClick={status === "running" ? onPause : onStart}
          className={`p-4 rounded-full transition-colors ${
            status === "running"
              ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
          }`}
          title={status === "running" ? "Pause (Space)" : "Start (Space)"}
        >
          {status === "running" ? <Pause size={24} /> : <Play size={24} />}
        </button>

        <button
          onClick={onSkip}
          className="p-3 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-full transition-colors"
          title="Skip to Next Session (S)"
        >
          <SkipForward size={20} />
        </button>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        Press{" "}
        <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">
          Space
        </kbd>{" "}
        to start/pause,
        <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 ml-1">
          R
        </kbd>{" "}
        to reset,
        <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 ml-1">
          S
        </kbd>{" "}
        to skip
      </div>
    </div>
  );
};
