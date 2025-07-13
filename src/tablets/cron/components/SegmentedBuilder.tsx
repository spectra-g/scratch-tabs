import React from "react";
import { CronExpression, CronDialect, CronValidationError } from "../types";
import { getFieldNamesForDialect } from "../utils/dialectDetector";

interface SegmentedBuilderProps {
  expression: CronExpression;
  dialect: CronDialect;
  onExpressionChange: (expression: CronExpression) => void;
  validationErrors: CronValidationError[];
}

export const SegmentedBuilder: React.FC<SegmentedBuilderProps> = ({
  expression,
  dialect,
  onExpressionChange,
  validationErrors,
}) => {
  const fieldNames = getFieldNamesForDialect(dialect);

  // Get field options based on field name
  const getFieldOptions = (fieldName: string) => {
    switch (fieldName.toLowerCase()) {
      case "minute":
        return getMinuteOptions();
      case "hour":
        return getHourOptions();
      case "day of month":
        return getDayOfMonthOptions();
      case "month":
        return getMonthOptions();
      case "day of week":
        return getDayOfWeekOptions(dialect);
      case "second":
        return getSecondOptions();
      case "year":
        return getYearOptions();
      default:
        return [];
    }
  };

  // Get field value based on field name
  const getFieldValue = (fieldName: string) => {
    switch (fieldName.toLowerCase()) {
      case "minute":
        return expression.minute;
      case "hour":
        return expression.hour;
      case "day of month":
        return expression.dayOfMonth;
      case "month":
        return expression.month;
      case "day of week":
        return expression.dayOfWeek;
      case "second":
        return expression.second || "0";
      case "year":
        return expression.year || "*";
      default:
        return "*";
    }
  };

  // Update field value
  const updateField = (fieldName: string, value: string) => {
    const updatedExpression = { ...expression };

    switch (fieldName.toLowerCase()) {
      case "minute":
        updatedExpression.minute = value;
        break;
      case "hour":
        updatedExpression.hour = value;
        break;
      case "day of month":
        updatedExpression.dayOfMonth = value;
        break;
      case "month":
        updatedExpression.month = value;
        break;
      case "day of week":
        updatedExpression.dayOfWeek = value;
        break;
      case "second":
        updatedExpression.second = value;
        break;
      case "year":
        updatedExpression.year = value;
        break;
    }

    onExpressionChange(updatedExpression);
  };

  // Get validation error for a field
  const getFieldError = (fieldName: string) => {
    const fieldKey = fieldName
      .toLowerCase()
      .replace(/\s+/g, "") as keyof CronExpression;
    return validationErrors.find((error) => error.field === fieldKey);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-300 mb-4">
        Segmented Builder
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fieldNames.map((fieldName, index) => {
          const fieldError = getFieldError(fieldName);
          const fieldValue = getFieldValue(fieldName);
          const fieldOptions = getFieldOptions(fieldName);

          return (
            <div key={index} className="space-y-1">
              <label className="block text-sm text-gray-300">{fieldName}</label>
              <div className="flex space-x-2">
                <select
                  value={
                    fieldOptions.find((opt) => opt.value === fieldValue)
                      ?.value || "custom"
                  }
                  onChange={(e) => updateField(fieldName, e.target.value)}
                  className={`bg-gray-700 border rounded-md px-3 py-2 text-sm text-gray-200 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fieldError ? "border-red-500" : "border-gray-600"
                  }`}
                >
                  {fieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  {!fieldOptions.find((opt) => opt.value === fieldValue) && (
                    <option value="custom">Custom: {fieldValue}</option>
                  )}
                </select>

                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => updateField(fieldName, e.target.value)}
                  className={`bg-gray-700 border rounded-md px-3 py-2 text-sm text-gray-200 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fieldError ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder={`Enter ${fieldName.toLowerCase()}`}
                />
              </div>

              {fieldError && (
                <p className="text-xs text-red-400">{fieldError.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper functions to get field options
function getMinuteOptions() {
  return [
    { value: "*", label: "Every minute" },
    { value: "0", label: "At minute 0" },
    { value: "15", label: "At minute 15" },
    { value: "30", label: "At minute 30" },
    { value: "45", label: "At minute 45" },
    { value: "0,30", label: "At minutes 0 and 30" },
    { value: "*/5", label: "Every 5 minutes" },
    { value: "*/10", label: "Every 10 minutes" },
    { value: "*/15", label: "Every 15 minutes" },
    { value: "*/30", label: "Every 30 minutes" },
  ];
}

function getHourOptions() {
  return [
    { value: "*", label: "Every hour" },
    { value: "0", label: "At midnight (00:00)" },
    { value: "12", label: "At noon (12:00)" },
    { value: "9-17", label: "Business hours (9-17)" },
    { value: "*/2", label: "Every 2 hours" },
    { value: "*/4", label: "Every 4 hours" },
    { value: "*/6", label: "Every 6 hours" },
    { value: "*/12", label: "Every 12 hours" },
  ];
}

function getDayOfMonthOptions() {
  return [
    { value: "*", label: "Every day" },
    { value: "1", label: "On the 1st" },
    { value: "15", label: "On the 15th" },
    { value: "L", label: "Last day of month" },
    { value: "1-5", label: "First 5 days" },
    { value: "L-3", label: "3rd to last day" },
    { value: "?", label: "Any day (?)" },
  ];
}

function getMonthOptions() {
  return [
    { value: "*", label: "Every month" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
    { value: "1,4,7,10", label: "Quarterly" },
    { value: "1,7", label: "Bi-annually" },
  ];
}

function getDayOfWeekOptions(dialect: CronDialect) {
  const options = [
    { value: "*", label: "Every day" },
    { value: "0", label: "Sunday" },
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" },
    { value: "1-5", label: "Monday-Friday" },
    { value: "0,6", label: "Weekends" },
  ];

  // Add Quartz-specific options
  if (dialect === "quartz" || dialect === "spring") {
    options.push({ value: "?", label: "Any day (?)" });
    options.push({ value: "L", label: "Last day of week" });
    options.push({ value: "1L", label: "Last Monday" });
    options.push({ value: "6L", label: "Last Saturday" });
    options.push({ value: "1#1", label: "First Monday" });
    options.push({ value: "2#2", label: "Second Tuesday" });
  }

  return options;
}

function getSecondOptions() {
  return [
    { value: "0", label: "At second 0" },
    { value: "*", label: "Every second" },
    { value: "*/5", label: "Every 5 seconds" },
    { value: "*/10", label: "Every 10 seconds" },
    { value: "*/15", label: "Every 15 seconds" },
    { value: "*/30", label: "Every 30 seconds" },
  ];
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return [
    { value: "*", label: "Every year" },
    { value: currentYear.toString(), label: `${currentYear}` },
    { value: (currentYear + 1).toString(), label: `${currentYear + 1}` },
    {
      value: `${currentYear}-${currentYear + 5}`,
      label: `${currentYear} to ${currentYear + 5}`,
    },
  ];
}
