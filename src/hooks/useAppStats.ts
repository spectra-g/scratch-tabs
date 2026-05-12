import { useState, useEffect } from "react";
import { db, getSetting } from "../db";

export interface AppStats {
  storageUsedBytes: number;
  storageUsedFormatted: string;
  memberSinceDate: Date | null;
  memberSinceFormatted: string;
  tabsCreatedTotal: number;
  isLoading: boolean;
  error: string | null;
}

const TABS_CREATED_KEY = "tabs.created.total";

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${sizes[i]}`;
}

/**
 * Format relative time from date
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day";
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (diffDays < 365) {
    const months = Math.round(diffDays / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 year" : `${years} years`;
}

/**
 * Get the oldest workspace creation date from IndexedDB
 */
export async function getOldestWorkspaceDate(): Promise<Date | null> {
  try {
    const workspaces = await db.workspaces.toArray();
    if (workspaces.length === 0) return null;

    const oldestTimestamp = Math.min(...workspaces.map((w) => w.createdAt));
    return new Date(oldestTimestamp);
  } catch {
    return null;
  }
}

/**
 * Get the total number of tabs created from settings
 */
export async function getTabsCreatedTotal(): Promise<number> {
  try {
    const value = await getSetting(TABS_CREATED_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Get storage usage estimate
 */
export async function getStorageUsage(): Promise<number> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Hook to fetch app statistics asynchronously
 */
export function useAppStats(): AppStats {
  const [stats, setStats] = useState<AppStats>({
    storageUsedBytes: 0,
    storageUsedFormatted: "-",
    memberSinceDate: null,
    memberSinceFormatted: "-",
    tabsCreatedTotal: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        const [storageBytes, oldestDate, tabsCount] = await Promise.all([
          getStorageUsage(),
          getOldestWorkspaceDate(),
          getTabsCreatedTotal(),
        ]);

        if (!isMounted) return;

        setStats({
          storageUsedBytes: storageBytes,
          storageUsedFormatted: formatBytes(storageBytes),
          memberSinceDate: oldestDate,
          memberSinceFormatted: oldestDate
            ? formatRelativeTime(oldestDate)
            : "-",
          tabsCreatedTotal: tabsCount,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (!isMounted) return;
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load stats",
        }));
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return stats;
}
