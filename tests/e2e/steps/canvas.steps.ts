import { Given, Then, When } from "@cucumber/cucumber";
import type { E2EWorld } from "../support/world";

Given(
  "the Canvas experimental feature is enabled",
  async function (this: E2EWorld) {
    await this.canvas.enableFeature();
  },
);

Given("I am using a Canvas desktop viewport", async function (this: E2EWorld) {
  await this.canvas.useDesktopViewport();
});

When("I resize to a narrow Canvas viewport", async function (this: E2EWorld) {
  await this.canvas.useNarrowViewport();
});

When(
  "I resize to a wide Canvas split viewport",
  async function (this: E2EWorld) {
    await this.canvas.useWideSplitViewport();
  },
);

When("I create a new Canvas", async function (this: E2EWorld) {
  await this.canvas.createCanvas();
});

When("I remember the active Canvas document", async function (this: E2EWorld) {
  await this.canvas.rememberDocumentId();
});

When(
  "I add a Canvas text card containing {string}",
  async function (this: E2EWorld, text: string) {
    await this.canvas.addTextCard(text);
  },
);

When(
  "I add a Canvas text card containing {string} on the left side",
  async function (this: E2EWorld, text: string) {
    await this.canvas.addTextCardInPane(text, "left");
  },
);

When(
  "I add a Canvas text card containing {string} on the right side",
  async function (this: E2EWorld, text: string) {
    await this.canvas.addTextCardInPane(text, "right");
  },
);

When(
  "I wait for the Canvas scene to be saved",
  async function (this: E2EWorld) {
    await this.canvas.waitForSceneSave();
  },
);

When(
  "I wait for the left Canvas scene to be saved",
  async function (this: E2EWorld) {
    await this.canvas.waitForPaneSceneSave("left");
  },
);

When(
  "I wait for the right Canvas scene to be saved",
  async function (this: E2EWorld) {
    await this.canvas.waitForPaneSceneSave("right");
  },
);

When(
  "I move and resize the Canvas text card",
  async function (this: E2EWorld) {
    await this.canvas.moveAndResizeTextCard();
  },
);

When(
  "I remember the Canvas text card bounds",
  async function (this: E2EWorld) {
    await this.canvas.rememberTextCardBounds();
  },
);

When(
  "I delete the Canvas text card",
  async function (this: E2EWorld) {
    await this.canvas.deleteTextCard();
  },
);

Then("I should see an empty Canvas", async function (this: E2EWorld) {
  await this.canvas.expectEmptyCanvas();
});

Then("the Canvas should be saved locally", async function (this: E2EWorld) {
  await this.canvas.expectSavedLocally();
});

Then(
  "I should see the same active empty Canvas",
  async function (this: E2EWorld) {
    await this.canvas.expectRememberedCanvas();
  },
);

Then(
  "the remembered Canvas document should be deleted",
  async function (this: E2EWorld) {
    await this.canvas.expectRememberedDocumentDeleted();
  },
);

Then(
  "I should see the Canvas desktop-only notice",
  async function (this: E2EWorld) {
    await this.canvas.expectDesktopOnlyNotice();
  },
);

Then(
  "the Canvas should contain a text card with {string}",
  async function (this: E2EWorld, text: string) {
    await this.canvas.expectTextCard(text);
  },
);

Then(
  "the left Canvas should contain a text card with {string}",
  async function (this: E2EWorld, text: string) {
    await this.canvas.expectTextCardInPane(text, "left");
  },
);

Then(
  "the right Canvas should contain a text card with {string}",
  async function (this: E2EWorld, text: string) {
    await this.canvas.expectTextCardInPane(text, "right");
  },
);

Then(
  "each split Canvas should show its own status contribution",
  async function (this: E2EWorld) {
    await this.canvas.expectIndependentSplitStatusContributions();
  },
);

Then(
  "the Canvas text card should have the remembered bounds",
  async function (this: E2EWorld) {
    await this.canvas.expectRememberedTextCardBounds();
  },
);

Then(
  "the Canvas should not contain any cards",
  async function (this: E2EWorld) {
    await this.canvas.expectNoCards();
  },
);
