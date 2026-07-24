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

When("I open the Canvas in a second window", async function (this: E2EWorld) {
  await this.canvasConflict.openInSecondWindow();
});

When(
  "I save {string} in the first Canvas window",
  async function (this: E2EWorld, text: string) {
    await this.canvasConflict.saveInFirstWindow(text);
  },
);

When(
  "I edit {string} in the second Canvas window",
  async function (this: E2EWorld, text: string) {
    await this.canvasConflict.editInSecondWindow(text);
  },
);

Then(
  "the second Canvas window should warn about unsaved conflicting work",
  async function (this: E2EWorld) {
    await this.canvasConflict.expectConflictWarning();
  },
);

When(
  "I reload the saved Canvas version in the second window",
  async function (this: E2EWorld) {
    await this.canvasConflict.reloadSavedVersion();
  },
);

Then(
  "the second Canvas window should contain {string} but not {string}",
  async function (this: E2EWorld, saved: string, discarded: string) {
    await this.canvasConflict.expectOnlyText(saved, discarded);
  },
);

When(
  "I take over the Canvas from the second window",
  async function (this: E2EWorld) {
    await this.canvasConflict.takeOverFromSecondWindow();
  },
);

When("I reload both Canvas windows", async function (this: E2EWorld) {
  await this.canvasConflict.reloadBothWindows();
});

Then(
  "both Canvas windows should contain {string}",
  async function (this: E2EWorld, text: string) {
    await this.canvasConflict.expectBothWindowsContain(text);
  },
);

Then(
  "Canvas revision broadcasts should contain identifiers only",
  async function (this: E2EWorld) {
    await this.canvasConflict.expectMetadataOnlyBroadcasts();
  },
);

When(
  "I verify the primary plus still creates a text tab",
  async function (this: E2EWorld) {
    await this.canvas.expectPrimaryNewTabStillCreatesText();
  },
);

When(
  "I create a Canvas from the Tool Selector",
  async function (this: E2EWorld) {
    await this.canvas.createCanvasFromToolSelector();
  },
);

When(
  "I create a Canvas from the empty workspace action",
  async function (this: E2EWorld) {
    await this.canvas.createCanvasFromEmptyWorkspace();
  },
);

When(
  "I send the full tab to a new Canvas",
  async function (this: E2EWorld) {
    await this.canvas.sendFullTabToNewCanvas();
  },
);

When(
  "I send a selected URL to the existing Canvas",
  async function (this: E2EWorld) {
    await this.canvas.sendSelectedUrlToExistingCanvas();
  },
);

When(
  "I send an image tab to the existing Canvas",
  async function (this: E2EWorld) {
    await this.canvas.sendImageTabToExistingCanvas();
  },
);

When(
  "I open the direct Canvas route",
  async function (this: E2EWorld) {
    await this.canvas.createCanvasFromDirectRoute();
  },
);

When(
  "I duplicate the Canvas tab {string}",
  async function (this: E2EWorld, title: string) {
    await this.canvas.duplicateCanvasTab(title);
  },
);

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
  "I add a Canvas code card containing {string}",
  async function (this: E2EWorld, source: string) {
    await this.canvas.addCodeCard(source);
  },
);

When(
  "I add an image through the Canvas file chooser",
  async function (this: E2EWorld) {
    await this.canvas.addImageCard();
  },
);

When("I replace the Canvas image", async function (this: E2EWorld) {
  await this.canvas.replaceImageCard();
});

When(
  "I choose an unsupported file for a Canvas image",
  async function (this: E2EWorld) {
    await this.canvas.chooseUnsupportedImage();
  },
);

When(
  "I paste plain text and complete JSON into the Canvas",
  async function (this: E2EWorld) {
    await this.canvas.pastePlainTextAndJson();
  },
);

When("I paste a normal URL into the Canvas", async function (this: E2EWorld) {
  await this.canvas.pasteNormalUrl();
});

When(
  "I reload the Canvas with the linked host unavailable",
  async function (this: E2EWorld) {
    await this.canvas.reloadWithLinkedHostUnavailable();
  },
);

When(
  "I paste recognized and unrecognized video URLs into the Canvas",
  async function (this: E2EWorld) {
    await this.canvas.pasteRecognizedAndUnrecognizedVideoUrls();
  },
);

When(
  "I paste a recognized video URL into the Canvas",
  async function (this: E2EWorld) {
    await this.canvas.pasteRecognizedVideoUrl();
  },
);

When("I play the Canvas video", async function (this: E2EWorld) {
  await this.canvas.playCanvasVideo();
});

When(
  "I stop and replay the Canvas video",
  async function (this: E2EWorld) {
    await this.canvas.stopAndReplayCanvasVideo();
  },
);

When(
  "I paste an unsafe URL scheme into the Canvas",
  async function (this: E2EWorld) {
    await this.canvas.pasteUnsafeUrlScheme();
  },
);

When(
  "I drop an image and code file onto the Canvas",
  async function (this: E2EWorld) {
    await this.canvas.dropImageAndCodeFileOnCanvas();
  },
);

When(
  "I paste multiple inputs at a known Canvas pointer position",
  async function (this: E2EWorld) {
    await this.canvas.pasteMultipleInputsAtKnownPointer();
  },
);

When("I copy the Canvas selection", async function (this: E2EWorld) {
  await this.canvas.copyCanvasSelection();
});

When("I cut the Canvas selection", async function (this: E2EWorld) {
  await this.canvas.cutCanvasSelection();
});

When("I paste the Canvas selection", async function (this: E2EWorld) {
  await this.canvas.pasteCanvasSelection();
});

When(
  "I paste natively while editing the Canvas card",
  async function (this: E2EWorld) {
    await this.canvas.pasteNativelyWhileEditingCanvasCard();
  },
);

When(
  "I remove the Canvas image asset from local storage",
  async function (this: E2EWorld) {
    await this.canvas.removeImageAssetFromStorage();
  },
);

When(
  "I format, wrap, and collapse the Canvas code card",
  async function (this: E2EWorld) {
    await this.canvas.formatAndConfigureCodeCard();
  },
);

When(
  "I collapse the Canvas code card",
  async function (this: E2EWorld) {
    await this.canvas.collapseCodeCard();
  },
);

When(
  "I drag the collapsed Canvas code card by its header",
  async function (this: E2EWorld) {
    await this.canvas.dragCollapsedCodeCardByHeader();
  },
);

Then(
  "the Canvas code card should move",
  async function (this: E2EWorld) {
    await this.canvas.expectCodeCardMoved();
  },
);

When(
  "I open the Canvas code card in a text tab",
  async function (this: E2EWorld) {
    await this.canvas.openCodeCardInTextTab();
  },
);

When(
  "I edit the opened code tab and return to the Canvas",
  async function (this: E2EWorld) {
    await this.canvas.editOpenedCodeTabWithoutChangingCanvas();
  },
);

When(
  "I multi-select Canvas cards {string} and {string}",
  async function (this: E2EWorld, firstText: string, secondText: string) {
    await this.canvas.multiSelectTextCards(firstText, secondText);
  },
);

When(
  "I duplicate the selected Canvas cards {string} and {string}",
  async function (this: E2EWorld, firstText: string, secondText: string) {
    await this.canvas.duplicateSelection([firstText, secondText]);
  },
);

When(
  "I duplicate the current Canvas selection",
  async function (this: E2EWorld) {
    await this.canvas.duplicateCurrentSelection();
  },
);

When("I move the selected Canvas card", async function (this: E2EWorld) {
  await this.canvas.moveSelectedCard();
});

When("I resize the selected Canvas card", async function (this: E2EWorld) {
  await this.canvas.resizeSelectedCard();
});

When("I undo the Canvas operation", async function (this: E2EWorld) {
  await this.canvas.undoOperation();
});

When("I redo the Canvas operation", async function (this: E2EWorld) {
  await this.canvas.redoOperation();
});

When(
  "I delete the Canvas selection from the selection toolbar",
  async function (this: E2EWorld) {
    await this.canvas.deleteSelectionFromToolbar();
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

When("I move and resize the Canvas text card", async function (this: E2EWorld) {
  await this.canvas.moveAndResizeTextCard();
});

When("I remember the Canvas text card bounds", async function (this: E2EWorld) {
  await this.canvas.rememberTextCardBounds();
});

When("I delete the Canvas text card", async function (this: E2EWorld) {
  await this.canvas.deleteTextCard();
});

When(
  "I create the fixed Canvas keyboard layout",
  async function (this: E2EWorld) {
    await this.canvas.createKeyboardNavigationLayout();
  },
);

When(
  "I focus the Canvas card {string}",
  async function (this: E2EWorld, text: string) {
    await this.canvas.focusCanvasCard(text);
  },
);

When(
  "I press {string} in the Canvas",
  async function (this: E2EWorld, key: string) {
    await this.canvas.pressCanvasKey(key);
  },
);

When("I traverse the Canvas forward with Tab", async function (this: E2EWorld) {
  await this.canvas.traverseCanvasSequentially("forward");
});

When(
  "I traverse the Canvas backward with Shift+Tab",
  async function (this: E2EWorld) {
    await this.canvas.traverseCanvasSequentially("backward");
  },
);

When(
  "I create a Canvas layout with an offscreen card",
  async function (this: E2EWorld) {
    await this.canvas.createOffscreenNavigationLayout();
  },
);

When(
  "I enter the focused Canvas card editing mode",
  async function (this: E2EWorld) {
    await this.canvas.enterFocusedCardEditing();
  },
);

When(
  "I leave Canvas card editing with Escape",
  async function (this: E2EWorld) {
    await this.canvas.leaveCardEditing();
  },
);

When(
  "I create two Canvas cards using the keyboard",
  async function (this: E2EWorld) {
    await this.canvas.createTwoCardsWithKeyboard();
  },
);

When(
  "I select all Canvas cards using the keyboard",
  async function (this: E2EWorld) {
    await this.canvas.selectAllCardsWithKeyboard();
  },
);

When(
  "I nudge the Canvas selection using small and large keyboard steps",
  async function (this: E2EWorld) {
    await this.canvas.nudgeSelectionWithKeyboard();
  },
);

When(
  "I duplicate the Canvas selection using the keyboard",
  async function (this: E2EWorld) {
    await this.canvas.duplicateSelectionWithKeyboard();
  },
);

When(
  "I delete the Canvas selection using the keyboard",
  async function (this: E2EWorld) {
    await this.canvas.deleteSelectionWithKeyboard();
  },
);

When(
  "I undo using the Canvas keyboard shortcut",
  async function (this: E2EWorld) {
    await this.canvas.undoWithKeyboard();
  },
);

When(
  "I redo using the Canvas keyboard shortcut",
  async function (this: E2EWorld) {
    await this.canvas.redoWithKeyboard();
  },
);

When(
  "I exercise the Canvas keyboard viewport commands",
  async function (this: E2EWorld) {
    await this.canvas.exerciseKeyboardViewportCommands();
  },
);

When(
  "I exercise Canvas shortcut help and the editing guard",
  async function (this: E2EWorld) {
    await this.canvas.exerciseShortcutHelpAndEditingGuard();
  },
);

Then("I should see an empty Canvas", async function (this: E2EWorld) {
  await this.canvas.expectEmptyCanvas();
});

Then(
  "the sent Canvas content should survive reload",
  async function (this: E2EWorld) {
    await this.canvas.expectSentCanvasContentAfterReload();
  },
);

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
  "the Canvas should not contain a text card with {string}",
  async function (this: E2EWorld, text: string) {
    await this.canvas.expectNoTextCard(text);
  },
);

Then(
  "the remembered Canvas image asset should still exist",
  async function (this: E2EWorld) {
    await this.canvas.expectRememberedImageAsset(true);
  },
);

Then(
  "the remembered Canvas image asset should be deleted",
  async function (this: E2EWorld) {
    await this.canvas.expectRememberedImageAsset(false);
  },
);

Then(
  "the moved Canvas image should use a target-workspace asset",
  async function (this: E2EWorld) {
    await this.canvas.expectMovedImageAssetRemapped();
  },
);

Then(
  "the formatted Canvas code and settings should be restored",
  async function (this: E2EWorld) {
    await this.canvas.expectFormattedCodeCardAfterReload();
  },
);

Then(
  "the pasted content should become text and JSON cards",
  async function (this: E2EWorld) {
    await this.canvas.expectPastedTextAndJsonCards();
  },
);

Then(
  "the Canvas link should retain its URL hostname and actions",
  async function (this: E2EWorld) {
    await this.canvas.expectRestoredLinkAndActions();
  },
);

Then(
  "the recognized URL should be a video card and the unknown URL a link card",
  async function (this: E2EWorld) {
    await this.canvas.expectVideoClassification();
  },
);

Then(
  "no Canvas video iframe should exist",
  async function (this: E2EWorld) {
    await this.canvas.expectNoVideoIframe();
  },
);

Then(
  "one policy-restricted Canvas video iframe should exist",
  async function (this: E2EWorld) {
    await this.canvas.expectRestrictedVideoIframe();
  },
);

Then(
  "no unsafe Canvas link should be created",
  async function (this: E2EWorld) {
    await this.canvas.expectNoUnsafeLink();
  },
);

Then(
  "the dropped files should become Canvas cards without creating tabs",
  async function (this: E2EWorld) {
    await this.canvas.expectDroppedFilesStayedInCanvas();
  },
);

Then(
  "the pasted cards should be deterministically placed and selected",
  async function (this: E2EWorld) {
    await this.canvas.expectKnownPointerPlacement();
  },
);

Then(
  "the Canvas code card should use {string} and render markup as text",
  async function (this: E2EWorld, language: string) {
    await this.canvas.expectCodeLanguageAndEscapedRendering(language);
  },
);

Then(
  "the Canvas code card should be unchanged",
  async function (this: E2EWorld) {
    await this.canvas.expectCanvasCodeUnchanged();
  },
);

Then(
  "the Canvas image and its dimensions should be restored",
  async function (this: E2EWorld) {
    await this.canvas.expectImageRestored();
  },
);

Then(
  "I can open the replacement in the Image Smart View",
  async function (this: E2EWorld) {
    await this.canvas.openImageInSmartView();
  },
);

Then(
  "I should see a Canvas image error and no image card",
  async function (this: E2EWorld) {
    await this.canvas.expectImageRejected();
  },
);

Then(
  "the Canvas image card should show a recoverable placeholder",
  async function (this: E2EWorld) {
    await this.canvas.expectMissingImagePlaceholder();
  },
);

Then(
  "the duplicated Canvas cards {string} and {string} should be selected and offset",
  async function (this: E2EWorld, firstText: string, secondText: string) {
    await this.canvas.expectOffsetDuplicatesSelected([firstText, secondText]);
  },
);

Then(
  "the Canvas card should have its bounds from before the operation",
  async function (this: E2EWorld) {
    await this.canvas.expectOperationBounds("before");
  },
);

Then(
  "the Canvas card should have its bounds from after the operation",
  async function (this: E2EWorld) {
    await this.canvas.expectOperationBounds("after");
  },
);

Then(
  "the Canvas text card count should be {int}",
  async function (this: E2EWorld, count: number) {
    await this.canvas.expectTextCardCount(count);
  },
);

Then(
  "the Canvas undo history should be empty",
  async function (this: E2EWorld) {
    await this.canvas.expectUndoHistoryEmpty();
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

Then(
  "the Canvas card {string} should be focused and selected",
  async function (this: E2EWorld, text: string) {
    await this.canvas.expectFocusedCanvasCard(text);
  },
);

Then(
  "the forward Canvas traversal should follow spatial order and exit at the boundary",
  async function (this: E2EWorld) {
    await this.canvas.expectSequentialTraversal("forward");
  },
);

Then(
  "the backward Canvas traversal should reverse spatial order and exit at the boundary",
  async function (this: E2EWorld) {
    await this.canvas.expectSequentialTraversal("backward");
  },
);

Then(
  "the offscreen Canvas card should be fully visible without a zoom change",
  async function (this: E2EWorld) {
    await this.canvas.expectOffscreenCardRevealedWithoutZoomChange();
  },
);

Then(
  "Canvas text-editing keys should remain in card {string}",
  async function (this: E2EWorld, text: string) {
    await this.canvas.expectEditingKeysStayInCard(text);
  },
);

Then(
  "the Canvas selection should move by one and ten grid units",
  async function (this: E2EWorld) {
    await this.canvas.expectKeyboardNudgeDistances();
  },
);

Then(
  "the Canvas selected card count should be {int}",
  async function (this: E2EWorld, count: number) {
    await this.canvas.expectSelectedCardCount(count);
  },
);

Then(
  "the Canvas viewport commands should complete successfully",
  function (this: E2EWorld) {
    this.canvas.expectKeyboardViewportCommandsCompleted();
  },
);

Then(
  "Canvas shortcut help and editing isolation should complete successfully",
  function (this: E2EWorld) {
    this.canvas.expectShortcutEditingGuardCompleted();
  },
);

When("I create searchable Canvas cards", async function (this: E2EWorld) {
  await this.canvas.createSearchableCanvasCards();
});

Then(
  "every Canvas card type should appear in global search",
  async function (this: E2EWorld) {
    await this.canvas.expectEveryCanvasCardTypeIsSearchable();
  },
);

When(
  "I place a searchable Canvas card offscreen",
  async function (this: E2EWorld) {
    await this.canvas.placeSearchTargetOffscreen();
  },
);

When(
  "I activate its global search result",
  async function (this: E2EWorld) {
    await this.canvas.activateOffscreenCanvasSearchResult();
  },
);

Then(
  "the searched Canvas card should be visible, selected, and focused",
  async function (this: E2EWorld) {
    await this.canvas.expectSearchTargetVisibleSelectedAndFocused();
  },
);

When(
  "I edit and delete indexed Canvas content",
  async function (this: E2EWorld) {
    await this.canvas.changeAndDeleteIndexedCanvasContent();
  },
);

Then(
  "stale Canvas search results should disappear",
  async function (this: E2EWorld) {
    await this.canvas.expectStaleCanvasSearchResultsRemoved();
  },
);

Given(
  "another workspace has searchable Canvas metadata",
  async function (this: E2EWorld) {
    await this.canvas.seedAnotherWorkspaceCanvasAndTrackAssetReads();
  },
);

When(
  "I search all workspaces for that Canvas metadata",
  async function (this: E2EWorld) {
    await this.canvas.searchAllWorkspacesForRemoteCanvas();
  },
);

Then(
  "global search should not read Canvas asset blobs",
  async function (this: E2EWorld) {
    await this.canvas.expectNoCanvasAssetsReadBySearch();
  },
);
