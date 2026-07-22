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

When("I create a new Canvas", async function (this: E2EWorld) {
  await this.canvas.createCanvas();
});

When("I remember the active Canvas document", async function (this: E2EWorld) {
  await this.canvas.rememberDocumentId();
});

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

