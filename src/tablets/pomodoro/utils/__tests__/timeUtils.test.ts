import {
  formatTime,
  formatDuration,
  formatTimeFromTimestamp,
  formatDateFromTimestamp,
  isSameDay,
  getStartOfDay,
  getEndOfDay,
} from "../timeUtils";

describe("timeUtils", () => {
  describe("formatTime", () => {
    it("should format seconds into MM:SS format", () => {
      expect(formatTime(0)).toBe("00:00");
      expect(formatTime(59)).toBe("00:59");
      expect(formatTime(60)).toBe("01:00");
      expect(formatTime(125)).toBe("02:05");
      expect(formatTime(3599)).toBe("59:59");
      expect(formatTime(3600)).toBe("60:00");
    });

    it("should pad single digits with zeros", () => {
      expect(formatTime(5)).toBe("00:05");
      expect(formatTime(65)).toBe("01:05");
    });

    it("should handle large numbers", () => {
      expect(formatTime(7200)).toBe("120:00");
      expect(formatTime(10000)).toBe("166:40");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds into human-readable duration", () => {
      expect(formatDuration(0)).toBe("0m");
      expect(formatDuration(59)).toBe("0m");
      expect(formatDuration(60)).toBe("1m");
      expect(formatDuration(120)).toBe("2m");
      expect(formatDuration(1500)).toBe("25m");
    });

    it("should include hours when duration is over an hour", () => {
      expect(formatDuration(3600)).toBe("1h 0m");
      expect(formatDuration(3660)).toBe("1h 1m");
      expect(formatDuration(7200)).toBe("2h 0m");
      expect(formatDuration(7380)).toBe("2h 3m");
    });

    it("should handle large durations", () => {
      expect(formatDuration(36000)).toBe("10h 0m");
      expect(formatDuration(36125)).toBe("10h 2m");
    });
  });

  describe("formatTimeFromTimestamp", () => {
    it("should format timestamp into HH:MM format", () => {
      // Test with specific dates
      const midnight = new Date(2024, 0, 1, 0, 0, 0).getTime();
      expect(formatTimeFromTimestamp(midnight)).toBe("00:00");

      const noon = new Date(2024, 0, 1, 12, 0, 0).getTime();
      expect(formatTimeFromTimestamp(noon)).toBe("12:00");

      const afternoon = new Date(2024, 0, 1, 15, 30, 0).getTime();
      expect(formatTimeFromTimestamp(afternoon)).toBe("15:30");

      const evening = new Date(2024, 0, 1, 23, 59, 0).getTime();
      expect(formatTimeFromTimestamp(evening)).toBe("23:59");
    });

    it("should pad single digits with zeros", () => {
      const morning = new Date(2024, 0, 1, 9, 5, 0).getTime();
      expect(formatTimeFromTimestamp(morning)).toBe("09:05");
    });
  });

  describe("formatDateFromTimestamp", () => {
    it("should format timestamp into MM/DD/YYYY format", () => {
      const date1 = new Date(2024, 0, 1).getTime(); // Jan 1, 2024
      expect(formatDateFromTimestamp(date1)).toBe("1/1/2024");

      const date2 = new Date(2024, 11, 31).getTime(); // Dec 31, 2024
      expect(formatDateFromTimestamp(date2)).toBe("12/31/2024");

      const date3 = new Date(2024, 5, 15).getTime(); // Jun 15, 2024
      expect(formatDateFromTimestamp(date3)).toBe("6/15/2024");
    });
  });

  describe("isSameDay", () => {
    it("should return true for timestamps on the same day", () => {
      const morning = new Date(2024, 0, 1, 9, 0, 0).getTime();
      const afternoon = new Date(2024, 0, 1, 15, 0, 0).getTime();
      const evening = new Date(2024, 0, 1, 23, 59, 59).getTime();

      expect(isSameDay(morning, afternoon)).toBe(true);
      expect(isSameDay(morning, evening)).toBe(true);
      expect(isSameDay(afternoon, evening)).toBe(true);
    });

    it("should return false for timestamps on different days", () => {
      const today = new Date(2024, 0, 1, 12, 0, 0).getTime();
      const tomorrow = new Date(2024, 0, 2, 12, 0, 0).getTime();
      const yesterday = new Date(2023, 11, 31, 12, 0, 0).getTime();

      expect(isSameDay(today, tomorrow)).toBe(false);
      expect(isSameDay(today, yesterday)).toBe(false);
    });

    it("should handle edge cases across day boundaries", () => {
      const lastSecondOfDay = new Date(2024, 0, 1, 23, 59, 59).getTime();
      const firstSecondOfNextDay = new Date(2024, 0, 2, 0, 0, 0).getTime();

      expect(isSameDay(lastSecondOfDay, firstSecondOfNextDay)).toBe(false);
    });
  });

  describe("getStartOfDay", () => {
    it("should return timestamp for the start of the day (00:00:00.000)", () => {
      const timestamp = new Date(2024, 0, 1, 15, 30, 45, 123).getTime();
      const startOfDay = getStartOfDay(timestamp);
      const date = new Date(startOfDay);

      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
      expect(date.getDate()).toBe(1);
      expect(date.getMonth()).toBe(0);
      expect(date.getFullYear()).toBe(2024);
    });

    it("should not change timestamp that is already at start of day", () => {
      const startOfDayTimestamp = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
      const result = getStartOfDay(startOfDayTimestamp);

      expect(result).toBe(startOfDayTimestamp);
    });
  });

  describe("getEndOfDay", () => {
    it("should return timestamp for the end of the day (23:59:59.999)", () => {
      const timestamp = new Date(2024, 0, 1, 15, 30, 45, 123).getTime();
      const endOfDay = getEndOfDay(timestamp);
      const date = new Date(endOfDay);

      expect(date.getHours()).toBe(23);
      expect(date.getMinutes()).toBe(59);
      expect(date.getSeconds()).toBe(59);
      expect(date.getMilliseconds()).toBe(999);
      expect(date.getDate()).toBe(1);
      expect(date.getMonth()).toBe(0);
      expect(date.getFullYear()).toBe(2024);
    });

    it("should handle timestamps at start of day", () => {
      const startOfDayTimestamp = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
      const endOfDay = getEndOfDay(startOfDayTimestamp);
      const date = new Date(endOfDay);

      expect(date.getHours()).toBe(23);
      expect(date.getMinutes()).toBe(59);
      expect(date.getSeconds()).toBe(59);
      expect(date.getMilliseconds()).toBe(999);
    });
  });
});
