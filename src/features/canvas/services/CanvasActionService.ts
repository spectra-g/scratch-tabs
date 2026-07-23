import type { Tab } from "../../../types";
import { useRootStore } from "../../../stores/rootStore";
import { useTabsStore } from "../../../stores/tabsStore";
import { getTabContentKind } from "../../../utils/tabContentKind";
import type { CanvasNormalizedInput } from "../utils/clipboardClassification";
import {
  canvasActionDispatcher,
  type CanvasActionDispatcher,
} from "./CanvasActionDispatcher";

export type CanvasActionTarget =
  | { kind: "new"; side: "left" | "right" }
  | { kind: "existing"; tabId: string };

export interface CanvasTargetSummary {
  id: string;
  title: string;
}

interface CanvasActionGateway {
  createCanvas(side: "left" | "right"): Promise<string | undefined>;
  activateTab(tabId: string): void;
  getTabs(): Tab[];
}

const rootStoreGateway: CanvasActionGateway = {
  createCanvas: (side) =>
    useRootStore.getState().handleNewCanvas(side === "right"),
  activateTab: (tabId) => useRootStore.getState().setActiveTab(tabId),
  getTabs: () => useTabsStore.getState().tabs,
};

export class CanvasActionService {
  constructor(
    private readonly gateway: CanvasActionGateway = rootStoreGateway,
    private readonly dispatcher: Pick<CanvasActionDispatcher, "dispatch"> =
      canvasActionDispatcher,
  ) {}

  getTargets(workspaceId: string): CanvasTargetSummary[] {
    return this.gateway
      .getTabs()
      .filter(
        (tab) =>
          tab.workspaceId === workspaceId &&
          getTabContentKind(tab) === "canvas",
      )
      .map(({ id, title }) => ({ id, title }));
  }

  async send(
    workspaceId: string,
    inputs: readonly CanvasNormalizedInput[],
    target: CanvasActionTarget,
  ): Promise<string> {
    if (inputs.length === 0) {
      throw new Error("There is no content to send to Canvas.");
    }

    const tabId =
      target.kind === "new"
        ? await this.gateway.createCanvas(target.side)
        : this.requireExistingTarget(workspaceId, target.tabId);
    if (!tabId) {
      throw new Error("Canvas is not available.");
    }

    this.gateway.activateTab(tabId);
    this.dispatcher.dispatch(tabId, inputs);
    return tabId;
  }

  private requireExistingTarget(workspaceId: string, tabId: string): string {
    const target = this.gateway.getTabs().find((tab) => tab.id === tabId);
    if (
      !target ||
      target.workspaceId !== workspaceId ||
      getTabContentKind(target) !== "canvas"
    ) {
      throw new Error("The selected Canvas is no longer available.");
    }
    return target.id;
  }
}

export const canvasActionService = new CanvasActionService();
