import React, { useState, useEffect, useRef } from "react";
import { CronExpression, CronDialect, CronValidationError } from "../types";

interface NaturalLanguageBuilderProps {
  expression: CronExpression;
  dialect: CronDialect;
  onExpressionChange: (expression: string) => void;
  validationErrors: CronValidationError[];
}

export const NaturalLanguageBuilder: React.FC<NaturalLanguageBuilderProps> = ({
  expression,
  dialect,
  onExpressionChange,
  validationErrors,
}) => {
  // State for natural language components
  const [frequency, setFrequency] = useState("hourly");
  const [minuteValue, setMinuteValue] = useState("0");
  const [hourValue, setHourValue] = useState("0");
  const [dayValue, setDayValue] = useState("*");
  const [monthValue, setMonthValue] = useState("*");
  const [weekdayValue, setWeekdayValue] = useState("*");

  // Flag to prevent circular dependency
  const isUpdatingExpressionRef = useRef(false);

  // Set appropriate default values when frequency changes
  useEffect(() => {
    switch (frequency) {
      case "weekly":
        // Set Sunday as default if weekdayValue is '*' or invalid
        if (weekdayValue === "*") {
          setWeekdayValue("0");
        }
        break;
      case "monthly":
        // Set day 1 as default if dayValue is '*' or invalid
        if (dayValue === "*") {
          setDayValue("1");
        }
        break;
      case "yearly":
        // Set day 1 and January as defaults if they are '*' or invalid
        if (dayValue === "*") {
          setDayValue("1");
        }
        if (monthValue === "*") {
          setMonthValue("1");
        }
        break;
    }
  }, [frequency]);

  // Initialize from expression (only run when expression changes from external sources)
  useEffect(() => {
    // Skip if we're in the middle of updating the expression from this component
    if (isUpdatingExpressionRef.current) {
      return;
    }

    // Detect frequency from expression
    if (expression.minute === "*" && expression.hour === "*") {
      setFrequency("minutely");
    } else if (expression.minute !== "*" && expression.hour === "*") {
      setFrequency("hourly");
      setMinuteValue(expression.minute);
    } else if (
      expression.minute !== "*" &&
      expression.hour !== "*" &&
      expression.dayOfMonth === "*" &&
      expression.month === "*" &&
      expression.dayOfWeek === "*"
    ) {
      setFrequency("daily");
      setMinuteValue(expression.minute);
      setHourValue(expression.hour);
    } else if (
      expression.minute !== "*" &&
      expression.hour !== "*" &&
      expression.dayOfMonth === "*" &&
      expression.month === "*" &&
      expression.dayOfWeek !== "*"
    ) {
      setFrequency("weekly");
      setMinuteValue(expression.minute);
      setHourValue(expression.hour);
      setWeekdayValue(expression.dayOfWeek);
    } else if (
      expression.minute !== "*" &&
      expression.hour !== "*" &&
      expression.dayOfMonth !== "*" &&
      expression.month === "*" &&
      expression.dayOfWeek === "*"
    ) {
      setFrequency("monthly");
      setMinuteValue(expression.minute);
      setHourValue(expression.hour);
      setDayValue(expression.dayOfMonth);
    } else if (
      expression.minute !== "*" &&
      expression.hour !== "*" &&
      expression.dayOfMonth !== "*" &&
      expression.month !== "*" &&
      expression.dayOfWeek === "*"
    ) {
      setFrequency("yearly");
      setMinuteValue(expression.minute);
      setHourValue(expression.hour);
      setDayValue(expression.dayOfMonth);
      setMonthValue(expression.month);
    } else {
      setFrequency("custom");
      setMinuteValue(expression.minute);
      setHourValue(expression.hour);
      setDayValue(expression.dayOfMonth);
      setMonthValue(expression.month);
      setWeekdayValue(expression.dayOfWeek);
    }
  }, [expression]);

  // Update expression when natural language components change
  useEffect(() => {
    isUpdatingExpressionRef.current = true;

    let newExpression = "";

    switch (frequency) {
      case "minutely":
        newExpression = "* * * * *";
        break;
      case "hourly":
        newExpression = `${minuteValue} * * * *`;
        break;
      case "daily":
        newExpression = `${minuteValue} ${hourValue} * * *`;
        break;
      case "weekly":
        newExpression = `${minuteValue} ${hourValue} * * ${weekdayValue}`;
        break;
      case "monthly":
        newExpression = `${minuteValue} ${hourValue} ${dayValue} * *`;
        break;
      case "yearly":
        newExpression = `${minuteValue} ${hourValue} ${dayValue} ${monthValue} *`;
        break;
      case "custom":
        newExpression = `${minuteValue} ${hourValue} ${dayValue} ${monthValue} ${weekdayValue}`;
        break;
    }

    // Add second field for Quartz and Spring
    if (dialect === "quartz" || dialect === "spring") {
      newExpression = `0 ${newExpression}`;
    }

    // Add year field for Quartz and AWS
    if (dialect === "quartz" || dialect === "aws") {
      newExpression = `${newExpression} *`;
    }

    // Only update if the expression has changed
    if (newExpression !== expression.raw) {
      onExpressionChange(newExpression);
    }

    // Reset flag after a short delay to allow the expression to update
    setTimeout(() => {
      isUpdatingExpressionRef.current = false;
    }, 0);
  }, [
    frequency,
    minuteValue,
    hourValue,
    dayValue,
    monthValue,
    weekdayValue,
    dialect,
    onExpressionChange,
  ]);

  return (
    <div className="bg-surface-secondary rounded-lg p-4 border border-base">
      <h3 className="text-sm font-medium text-main mb-4">
        Natural Language Builder
      </h3>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-secondary">Run</span>

          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="input-themed bg-surface text-main text-sm"
          >
            <option value="minutely">Every minute</option>
            <option value="hourly">Every hour</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
            <option value="yearly">Every year</option>
            <option value="custom">Custom schedule</option>
          </select>

          {frequency === "hourly" && (
            <>
              <span className="text-secondary">at minute</span>
              <input
                type="number"
                min="0"
                max="59"
                value={minuteValue}
                onChange={(e) => setMinuteValue(e.target.value)}
                className="input-themed bg-surface text-main text-sm w-16"
              />
            </>
          )}

          {(frequency === "daily" ||
            frequency === "weekly" ||
            frequency === "monthly" ||
            frequency === "yearly" ||
            frequency === "custom") && (
              <>
                <span className="text-secondary">at</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hourValue}
                  onChange={(e) => setHourValue(e.target.value)}
                  className="input-themed bg-surface text-main text-sm w-16"
                />
                <span className="text-secondary">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minuteValue}
                  onChange={(e) => setMinuteValue(e.target.value)}
                  className="input-themed bg-surface text-main text-sm w-16"
                />
              </>
            )}

          {frequency === "weekly" && (
            <>
              <span className="text-gray-300">on</span>
              <select
                value={weekdayValue}
                onChange={(e) => setWeekdayValue(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="1-5">Monday-Friday</option>
                <option value="0,6">Saturday-Sunday</option>
              </select>
            </>
          )}

          {(frequency === "monthly" ||
            frequency === "yearly" ||
            frequency === "custom") && (
              <>
                <span className="text-secondary">on day</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayValue === "*" ? "" : dayValue}
                  onChange={(e) => setDayValue(e.target.value || "*")}
                  placeholder="*"
                  className="input-themed bg-surface text-main text-sm w-16"
                />
              </>
            )}

          {(frequency === "yearly" || frequency === "custom") && (
            <>
              <span className="text-secondary">of</span>
              <select
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
                className="input-themed bg-surface text-main text-sm"
              >
                <option value="*">Every month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </>
          )}

          {frequency === "custom" && (
            <>
              <span className="text-gray-300">on</span>
              <select
                value={weekdayValue}
                onChange={(e) => setWeekdayValue(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="*">Any day of week</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="1-5">Monday-Friday</option>
                <option value="0,6">Saturday-Sunday</option>
              </select>
            </>
          )}
        </div>

        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-danger-subtle border border-danger/30 rounded-md">
            <h4 className="text-sm font-medium text-danger mb-1">
              Validation Errors
            </h4>
            <ul className="text-xs text-danger space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-danger mr-1">•</span>
                  <span>{error.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
