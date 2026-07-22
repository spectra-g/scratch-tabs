import { getSetting } from "../../../db";
import { CANVAS_FEATURE_SETTING_KEY } from "../constants";

type SettingReader = (key: string) => Promise<string | undefined>;

export const getCanvasFeatureEnabled = async (
  readSetting: SettingReader = getSetting,
): Promise<boolean> => {
  return (await readSetting(CANVAS_FEATURE_SETTING_KEY)) === "true";
};
