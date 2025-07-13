import { CronExpression, CronDialect } from "../types";

/**
 * Converts day-of-week values between Unix and Quartz numbering systems
 * Unix: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
 * Quartz: 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday
 */
function convertDayOfWeekUnixToQuartz(unixValue: string): string {
  if (unixValue === "*" || unixValue === "?") {
    return unixValue;
  }

  // Handle complex expressions (ranges, lists, steps)
  return unixValue.replace(/\b\d+\b/g, (match) => {
    const num = parseInt(match);
    // Convert Unix to Quartz: add 1, but handle 7 (Unix alternative Sunday) as 1
    if (num === 7) return "1"; // Unix Sunday alternative -> Quartz Sunday
    return String(num + 1);
  });
}

/**
 * Converts day-of-week values from Quartz to Unix numbering systems
 */
function convertDayOfWeekQuartzToUnix(quartzValue: string): string {
  if (quartzValue === "*" || quartzValue === "?") {
    return quartzValue;
  }

  // Handle complex expressions (ranges, lists, steps)
  return quartzValue.replace(/\b\d+\b/g, (match) => {
    const num = parseInt(match);
    // Convert Quartz to Unix: subtract 1, but handle 1 (Quartz Sunday) as 0
    if (num === 1) return "0"; // Quartz Sunday -> Unix Sunday
    return String(num - 1);
  });
}

/**
 * Determines if a dialect uses Quartz-style day-of-week numbering (1=Sunday)
 */
function usesQuartzDayOfWeek(dialect: CronDialect): boolean {
  return dialect === "quartz" || dialect === "spring";
}

/**
 * Determines if a dialect requires ? for mutually exclusive day fields
 */
function requiresQuestionMark(dialect: CronDialect): boolean {
  return dialect === "quartz" || dialect === "spring";
}

/**
 * Converts a cron expression from one dialect to another
 */
export function convertBetweenDialects(
  expression: CronExpression,
  fromDialect: CronDialect,
  toDialect: CronDialect,
): CronExpression {
  // If dialects are the same, return the original expression
  if (fromDialect === toDialect) {
    return { ...expression };
  }

  // Create a new expression object
  const newExpression: CronExpression = {
    minute: expression.minute,
    hour: expression.hour,
    dayOfMonth: expression.dayOfMonth,
    month: expression.month,
    dayOfWeek: expression.dayOfWeek,
    second: expression.second || "0",
    year: expression.year || "*",
    raw: "", // Will be set at the end
  };

  // Convert day-of-week numbering if needed
  const fromUsesQuartz = usesQuartzDayOfWeek(fromDialect);
  const toUsesQuartz = usesQuartzDayOfWeek(toDialect);

  if (fromUsesQuartz && !toUsesQuartz) {
    // Quartz/Spring to Unix/AWS: convert day-of-week numbering
    newExpression.dayOfWeek = convertDayOfWeekQuartzToUnix(
      newExpression.dayOfWeek,
    );
  } else if (!fromUsesQuartz && toUsesQuartz) {
    // Unix/AWS to Quartz/Spring: convert day-of-week numbering
    newExpression.dayOfWeek = convertDayOfWeekUnixToQuartz(
      newExpression.dayOfWeek,
    );
  }

  // Handle ? vs * conversions
  const fromRequiresQuestion = requiresQuestionMark(fromDialect);
  const toRequiresQuestion = requiresQuestionMark(toDialect);

  if (fromRequiresQuestion && !toRequiresQuestion) {
    // Quartz/Spring to Unix/AWS: convert ? to *
    if (newExpression.dayOfWeek === "?") {
      newExpression.dayOfWeek = "*";
    }
    if (newExpression.dayOfMonth === "?") {
      newExpression.dayOfMonth = "*";
    }
  } else if (!fromRequiresQuestion && toRequiresQuestion) {
    // Unix/AWS to Quartz/Spring: convert * to ? appropriately
    // In Quartz, either day-of-month or day-of-week must be '?'
    if (newExpression.dayOfMonth !== "*" && newExpression.dayOfWeek !== "*") {
      // Both are specified, set day-of-week to '?'
      newExpression.dayOfWeek = "?";
    } else if (
      newExpression.dayOfMonth === "*" &&
      newExpression.dayOfWeek !== "*"
    ) {
      // Only day-of-week is specified, set day-of-month to '?'
      newExpression.dayOfMonth = "?";
    } else if (
      newExpression.dayOfMonth !== "*" &&
      newExpression.dayOfWeek === "*"
    ) {
      // Only day-of-month is specified, set day-of-week to '?'
      newExpression.dayOfWeek = "?";
    } else {
      // Both are *, set day-of-month to ? (prefer monthly over weekly)
      newExpression.dayOfMonth = "?";
    }
  }

  // Build the raw string based on the target dialect
  let rawParts: string[] = [];

  switch (toDialect) {
    case "unix":
    case "crontab":
    case "jenkins":
      rawParts = [
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
      ];
      break;

    case "quartz":
      rawParts = [
        newExpression.second || "0",
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
        newExpression.year || "*",
      ];
      break;

    case "spring":
      rawParts = [
        newExpression.second || "0",
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
      ];
      break;

    case "aws":
      rawParts = [
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
        newExpression.year || "*",
      ];
      break;
  }

  newExpression.raw = rawParts.join(" ");

  return newExpression;
}

/**
 * Normalizes a cron expression for a specific dialect
 */
export function normalizeExpression(
  expression: string,
  dialect: CronDialect,
): string {
  const parts = expression.trim().split(/\s+/);

  // Ensure the correct number of parts for the dialect
  switch (dialect) {
    case "unix":
    case "crontab":
    case "jenkins":
      // 5 parts: minute hour day-of-month month day-of-week
      if (parts.length < 5) {
        // Pad with * if needed
        while (parts.length < 5) {
          parts.push("*");
        }
      } else if (parts.length > 5) {
        // Truncate if too many
        parts.splice(5);
      }
      break;

    case "quartz":
      // 6 or 7 parts: second minute hour day-of-month month day-of-week [year]
      if (parts.length < 6) {
        // Add second field if missing
        parts.unshift("0");
      }
      if (parts.length < 7) {
        // Add year field if missing
        parts.push("*");
      } else if (parts.length > 7) {
        // Truncate if too many
        parts.splice(7);
      }
      break;

    case "spring":
      // 6 parts: second minute hour day-of-month month day-of-week
      if (parts.length < 6) {
        // Add second field if missing
        parts.unshift("0");
      } else if (parts.length > 6) {
        // Truncate if too many
        parts.splice(6);
      }
      break;

    case "aws":
      // 6 parts: minute hour day-of-month month day-of-week year
      if (parts.length < 6) {
        // Add year field if missing
        parts.push("*");
      } else if (parts.length > 6) {
        // Truncate if too many
        parts.splice(6);
      }
      break;
  }

  return parts.join(" ");
}
