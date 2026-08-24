import { formatBytes, formatRelativeTime } from "../useAppStats";

describe("useAppStats utility functions", () => {
  describe("formatBytes", () => {
    it("should format 0 bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("should format bytes under 1KB correctly", () => {
      expect(formatBytes(100)).toBe("100 B");
      expect(formatBytes(500)).toBe("500 B");
      expect(formatBytes(1023)).toBe("1023 B");
    });

    it("should format kilobytes correctly", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(10240)).toBe("10 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(5242880)).toBe("5 MB");
      expect(formatBytes(104857600)).toBe("100 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatBytes(1073741824)).toBe("1 GB");
      expect(formatBytes(5368709120)).toBe("5 GB");
    });
  });

  describe("formatRelativeTime", () => {
    const now = new Date();

    it('should return "Today" for current date', () => {
      expect(formatRelativeTime(now)).toBe("Today");
    });

    it('should return "1 day" for yesterday', () => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelativeTime(yesterday)).toBe("1 day");
    });

    it("should return days for less than a week", () => {
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(formatRelativeTime(threeDaysAgo)).toBe("3 days");

      const sixDaysAgo = new Date(now);
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
      expect(formatRelativeTime(sixDaysAgo)).toBe("6 days");
    });

    it("should return weeks for 7-29 days", () => {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      expect(formatRelativeTime(oneWeekAgo)).toBe("1 week");

      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      expect(formatRelativeTime(twoWeeksAgo)).toBe("2 weeks");

      const threeWeeksAgo = new Date(now);
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
      expect(formatRelativeTime(threeWeeksAgo)).toBe("3 weeks");
    });

    it("should return months for 30-364 days", () => {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      expect(formatRelativeTime(oneMonthAgo)).toBe("1 month");

      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      expect(formatRelativeTime(threeMonthsAgo)).toBe("3 months");

      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
      expect(formatRelativeTime(sixMonthsAgo)).toBe("6 months");
    });

    it("should return years for 365+ days", () => {
      const oneYearAgo = new Date(now);
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);
      expect(formatRelativeTime(oneYearAgo)).toBe("1 year");

      const twoYearsAgo = new Date(now);
      twoYearsAgo.setDate(twoYearsAgo.getDate() - 730);
      expect(formatRelativeTime(twoYearsAgo)).toBe("2 years");
    });
  });
});
