import { getSetting, setSetting } from "../../db";
import { RecentItem } from "./types";

const SETTING_KEY = "quickTransform.recent";
const MAX_RECENTS = 10;

export async function getRecentItems(): Promise<RecentItem[]> {
  const value = await getSetting(SETTING_KEY);
  if (!value) return [];
  try {
    return JSON.parse(value) as RecentItem[];
  } catch {
    return [];
  }
}

export async function addRecentItem(item: RecentItem): Promise<void> {
  const current = await getRecentItems();
  const deduped = current.filter(
    (r) => !(r.type === item.type && r.id === item.id),
  );
  const updated = [item, ...deduped].slice(0, MAX_RECENTS);
  await setSetting(SETTING_KEY, JSON.stringify(updated));
}
