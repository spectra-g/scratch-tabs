import { getSetting } from "../../../db";
import { CANVAS_FEATURE_SETTING_KEY } from "../constants";

type SettingReader = (key: string) => Promise<string | undefined>;

const getEnvironmentFlag = (): string | undefined =>
  typeof __VITE_ENABLE_CANVAS__ === "string"
    ? __VITE_ENABLE_CANVAS__
    : undefined;

export const getCanvasFeatureEnabled = async (
  readSetting: SettingReader = getSetting,
  environmentFlag: string | undefined = getEnvironmentFlag(),
): Promise<boolean> => {
  if (environmentFlag === "true") return true;
  return (await readSetting(CANVAS_FEATURE_SETTING_KEY)) === "true";
};
