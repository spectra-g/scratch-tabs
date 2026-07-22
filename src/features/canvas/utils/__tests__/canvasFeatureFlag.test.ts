import { getSetting } from "../../../../db";
import { CANVAS_FEATURE_SETTING_KEY } from "../../constants";
import { getCanvasFeatureEnabled } from "../canvasFeatureFlag";

jest.mock("../../../../db", () => ({
  getSetting: jest.fn(),
}));

const mockGetSetting = getSetting as jest.MockedFunction<typeof getSetting>;

describe("getCanvasFeatureEnabled", () => {
  beforeEach(() => {
    mockGetSetting.mockReset();
  });

  it("enables Canvas when its IndexedDB setting is true", async () => {
    mockGetSetting.mockResolvedValue("true");

    await expect(getCanvasFeatureEnabled(mockGetSetting)).resolves.toBe(true);
    expect(mockGetSetting).toHaveBeenCalledWith(CANVAS_FEATURE_SETTING_KEY);
  });

  it("keeps Canvas disabled for a missing or non-true setting", async () => {
    mockGetSetting.mockResolvedValue(undefined);

    await expect(getCanvasFeatureEnabled(mockGetSetting)).resolves.toBe(false);
  });
});
