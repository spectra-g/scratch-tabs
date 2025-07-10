import { CronExpression, CronDialect, CronValidationError } from "../types";

/**
 * Validates a cron expression for a specific dialect
 */
export function validateCronExpression(
  expression: CronExpression,
  dialect: CronDialect,
): CronValidationError[] {
  const errors: CronValidationError[] = [];

  // Check if the expression is empty
  if (!expression.raw.trim()) {
    errors.push({
      field: "global",
      message: "Cron expression cannot be empty",
      type: "error",
    });
    return errors;
  }

  // Split the expression into parts
  const parts = expression.raw.trim().split(/\s+/);

  // Check if the number of parts is correct for the dialect
  const expectedParts = getExpectedPartsForDialect(dialect);
  if (parts.length !== expectedParts) {
    errors.push({
      field: "global",
      message: `${dialect} cron expressions should have ${expectedParts} fields`,
      type: "error",
    });
  }

  // Validate each field based on dialect
  validateMinuteField(expression.minute, errors);
  validateHourField(expression.hour, errors);
  validateDayOfMonthField(expression.dayOfMonth, errors);
  validateMonthField(expression.month, errors);
  validateDayOfWeekField(expression.dayOfWeek, dialect, errors);

  // Validate second field for dialects that support it
  if (dialect === "quartz" || dialect === "spring") {
    validateSecondField(expression.second || "0", errors);
  }

  // Validate year field for dialects that support it
  if (dialect === "quartz" || dialect === "aws") {
    validateYearField(expression.year || "*", errors);
  }

  // Validate dialect-specific rules
  validateDialectSpecificRules(expression, dialect, errors);

  // Check for impossible schedules
  validateSchedulePossibility(expression, errors);

  return errors;
}

/**
 * Gets the expected number of parts for a dialect
 */
function getExpectedPartsForDialect(dialect: CronDialect): number {
  switch (dialect) {
    case "unix":
    case "crontab":
    case "jenkins":
      return 5;
    case "quartz":
      return 7;
    case "spring":
    case "aws":
      return 6;
    default:
      return 5;
  }
}

/**
 * Validates the minute field
 */
function validateMinuteField(
  minute: string,
  errors: CronValidationError[],
): void {
  if (!isValidField(minute, 0, 59)) {
    errors.push({
      field: "minute",
      message: "Minute must be between 0 and 59",
      type: "error",
    });
  }
}

/**
 * Validates the hour field
 */
function validateHourField(hour: string, errors: CronValidationError[]): void {
  if (!isValidField(hour, 0, 23)) {
    errors.push({
      field: "hour",
      message: "Hour must be between 0 and 23",
      type: "error",
    });
  }
}

/**
 * Validates the day of month field
 */
function validateDayOfMonthField(
  dayOfMonth: string,
  errors: CronValidationError[],
): void {
  if (!isValidField(dayOfMonth, 1, 31)) {
    errors.push({
      field: "dayOfMonth",
      message: "Day of month must be between 1 and 31",
      type: "error",
    });
  }

  // Check for impossible dates like February 30
  if (/^(29|30|31)$/.test(dayOfMonth)) {
    errors.push({
      field: "dayOfMonth",
      message: "Some months do not have this many days",
      type: "warning",
    });
  }
}

/**
 * Validates the month field
 */
function validateMonthField(
  month: string,
  errors: CronValidationError[],
): void {
  if (!isValidField(month, 1, 12)) {
    errors.push({
      field: "month",
      message: "Month must be between 1 and 12",
      type: "error",
    });
  }
}

/**
 * Validates the day of week field
 */
function validateDayOfWeekField(
  dayOfWeek: string,
  dialect: CronDialect,
  errors: CronValidationError[],
): void {
  // Different dialects have different valid ranges for day of week
  const maxValue = dialect === "quartz" || dialect === "spring" ? 7 : 6;

  if (!isValidField(dayOfWeek, 0, maxValue)) {
    errors.push({
      field: "dayOfWeek",
      message: `Day of week must be between 0 and ${maxValue}`,
      type: "error",
    });
  }
}

/**
 * Validates the second field
 */
function validateSecondField(
  second: string,
  errors: CronValidationError[],
): void {
  if (!isValidField(second, 0, 59)) {
    errors.push({
      field: "second",
      message: "Second must be between 0 and 59",
      type: "error",
    });
  }
}

/**
 * Validates the year field
 */
function validateYearField(year: string, errors: CronValidationError[]): void {
  if (year !== "*" && !/^\d{4}$/.test(year) && !/^\d{4}-\d{4}$/.test(year)) {
    errors.push({
      field: "year",
      message:
        "Year must be a 4-digit number or range (e.g., 2023 or 2023-2025)",
      type: "error",
    });
  }
}

/**
 * Validates dialect-specific rules
 */
function validateDialectSpecificRules(
  expression: CronExpression,
  dialect: CronDialect,
  errors: CronValidationError[],
): void {
  // Quartz and Spring require either day-of-month or day-of-week to be '?'
  if (dialect === "quartz" || dialect === "spring") {
    if (expression.dayOfMonth !== "?" && expression.dayOfWeek !== "?") {
      errors.push({
        field: "global",
        message:
          'In Quartz/Spring, either day-of-month or day-of-week must be "?"',
        type: "error",
      });
    }

    if (expression.dayOfMonth === "?" && expression.dayOfWeek === "?") {
      errors.push({
        field: "global",
        message:
          'In Quartz/Spring, both day-of-month and day-of-week cannot be "?"',
        type: "error",
      });
    }
  }

  // AWS does not support the '?' character
  if (dialect === "aws") {
    if (expression.raw.includes("?")) {
      errors.push({
        field: "global",
        message: 'AWS cron expressions do not support the "?" character',
        type: "error",
      });
    }
  }
}

/**
 * Validates if a schedule is possible
 */
function validateSchedulePossibility(
  expression: CronExpression,
  errors: CronValidationError[],
): void {
  // Check for February 30/31
  if (
    expression.month === "2" &&
    (expression.dayOfMonth === "30" || expression.dayOfMonth === "31")
  ) {
    errors.push({
      field: "dayOfMonth",
      message: "February never has 30 or 31 days",
      type: "error",
    });
  }

  // Check for February 29 (only in leap years)
  if (
    expression.month === "2" &&
    expression.dayOfMonth === "29" &&
    expression.year !== "*"
  ) {
    errors.push({
      field: "dayOfMonth",
      message: "February 29 only exists in leap years",
      type: "warning",
    });
  }

  // Check for 31st day in months that don't have 31 days
  if (expression.dayOfMonth === "31" && /^(4|6|9|11)$/.test(expression.month)) {
    errors.push({
      field: "dayOfMonth",
      message: "This month only has 30 days",
      type: "error",
    });
  }
}

/**
 * Checks if a field value is valid
 */
function isValidField(value: string, min: number, max: number): boolean {
  // Handle special characters
  if (value === "*" || value === "?") {
    return true;
  }

  // Handle lists (e.g., 1,2,3)
  if (value.includes(",")) {
    return value.split(",").every((part) => isValidField(part, min, max));
  }

  // Handle ranges (e.g., 1-5)
  if (value.includes("-")) {
    const [start, end] = value.split("-").map(Number);
    return (
      !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end
    );
  }

  // Handle steps (e.g., */5)
  if (value.includes("/")) {
    const [range, step] = value.split("/");
    return (
      isValidField(range, min, max) && !isNaN(Number(step)) && Number(step) > 0
    );
  }

  // Handle simple numbers
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}
