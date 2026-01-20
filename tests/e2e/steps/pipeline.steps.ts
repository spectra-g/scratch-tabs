const { When, Then } = require('@cucumber/cucumber');

export {}; // Make this file a module

// ========== MODAL MANAGEMENT ==========

Then('the Pipeline modal should be visible', async function () {
  await this.pipeline.expectPipelineModalVisible();
});

Then('the Pipeline modal should not be visible', async function () {
  await this.pipeline.expectPipelineModalNotVisible();
});

When('I close the Pipeline modal', async function () {
  await this.pipeline.closePipelineModal();
});

When('I click Cancel in the Pipeline modal', async function () {
  await this.pipeline.clickCancel();
});

// ========== OPERATION SEARCH AND ADD ==========

When('I search for operation {string}', async function (searchText: string) {
  await this.pipeline.searchOperation(searchText);
});

When('I search for operation "{string}"', async function (searchText: string) {
  await this.pipeline.searchOperation(searchText);
});

When('I clear the operation search', async function () {
  await this.pipeline.clearOperationSearch();
});

When('I expand the {string} category', async function (categoryName: string) {
  await this.pipeline.expandCategory(categoryName);
});

When('I expand the "{string}" category', async function (categoryName: string) {
  await this.pipeline.expandCategory(categoryName);
});

When('I add the {string} operation', async function (operationName: string) {
  await this.pipeline.searchAndAddOperation(operationName);
});

When('I add the "{string}" operation', async function (operationName: string) {
  await this.pipeline.searchAndAddOperation(operationName);
});

// ========== PIPELINE STEPS ==========

Then('the pipeline should have {int} steps', async function (count: number) {
  await this.pipeline.expectStepCount(count);
});

When('I toggle step {int} enabled state', async function (stepIndex: number) {
  await this.pipeline.toggleStepEnabled(stepIndex);
});

When('I remove step {int}', async function (stepIndex: number) {
  await this.pipeline.removeStep(stepIndex);
});

When('I expand step {int}', async function (stepIndex: number) {
  await this.pipeline.expandStep(stepIndex);
});

When('I toggle Apply per line for the current step', async function () {
  await this.pipeline.toggleApplyPerLine(1);
});

When('I set parameter {string} to {string}', async function (paramLabel: string, value: string) {
  await this.pipeline.setStepParameter(paramLabel, value);
});

When('I set parameter "{string}" to "{string}"', async function (paramLabel: string, value: string) {
  await this.pipeline.setStepParameter(paramLabel, value);
});

When('I set number parameter {string} to {int}', async function (paramLabel: string, value: number) {
  await this.pipeline.setNumberParameter(paramLabel, value);
});

When('I set number parameter "{string}" to {int}', async function (paramLabel: string, value: number) {
  await this.pipeline.setNumberParameter(paramLabel, value);
});

// ========== INPUT / OUTPUT ==========

When('I set the pipeline input to {string}', async function (content: string) {
  await this.pipeline.setInput(content);
});

When('I set the pipeline input to "{string}"', async function (content: string) {
  await this.pipeline.setInput(content);
});

When('I set the pipeline input to:', async function (content: string) {
  await this.pipeline.setInput(content);
});

Then('the pipeline output should contain {string}', async function (expectedText: string) {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectOutputContains(expectedText);
});

Then('the pipeline output should contain "{string}"', async function (expectedText: string) {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectOutputContains(expectedText);
});

Then('the pipeline output should be {string}', async function (expectedText: string) {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectOutputEquals(expectedText);
});

Then('the pipeline output should be "{string}"', async function (expectedText: string) {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectOutputEquals(expectedText);
});

Then('the pipeline output should be:', async function (expectedText: string) {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectOutputEquals(expectedText);
});

Then('the pipeline output should show as modified', async function () {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectOutputModified();
});

When('I wait for the pipeline to execute', async function () {
  await this.pipeline.waitForPipelineExecution();
});

// ========== ERROR HANDLING ==========

Then('the pipeline should show an error', async function () {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectError();
});

Then('the pipeline should show error {string}', async function (errorMessage: string) {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectError(errorMessage);
});

Then('the pipeline should show error "{string}"', async function (errorMessage: string) {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectError(errorMessage);
});

Then('the pipeline footer should show error state', async function () {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectFooterShowsError();
});

// ========== SAVE / LOAD ==========

When('I save the pipeline as {string}', async function (name: string) {
  await this.pipeline.savePipelineAs(name);
});

When('I save the pipeline as "{string}"', async function (name: string) {
  await this.pipeline.savePipelineAs(name);
});

When('I load the saved pipeline {string}', async function (name: string) {
  await this.pipeline.loadPipeline(name);
});

When('I load the saved pipeline "{string}"', async function (name: string) {
  await this.pipeline.loadPipeline(name);
});

Then('the saved pipeline {string} should exist', async function (name: string) {
  await this.pipeline.expectSavedPipelineExists(name);
});

Then('the saved pipeline "{string}" should exist', async function (name: string) {
  await this.pipeline.expectSavedPipelineExists(name);
});

When('I delete the saved pipeline {string}', async function (name: string) {
  await this.pipeline.deleteSavedPipeline(name);
});

When('I delete the saved pipeline "{string}"', async function (name: string) {
  await this.pipeline.deleteSavedPipeline(name);
});

Then('there should be no saved pipelines', async function () {
  await this.pipeline.expectNoSavedPipelines();
});

// ========== RESET ==========

When('I reset the pipeline', async function () {
  await this.pipeline.clickReset();
});

Then('the pipeline should be empty', async function () {
  await this.pipeline.expectPipelineEmpty();
});

// ========== APPLY ==========

When('I apply the pipeline changes', async function () {
  await this.pipeline.clickApplyChanges();
});

Then('the Apply Changes button should be enabled', async function () {
  await this.pipeline.expectApplyEnabled();
});

Then('the Apply Changes button should be disabled', async function () {
  await this.pipeline.expectApplyDisabled();
});

// ========== EXECUTION STATS ==========

Then('the execution time should be displayed', async function () {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectExecutionTimeDisplayed();
});

Then('the pipeline should show success message', async function () {
  await this.pipeline.waitForPipelineExecution();
  await this.pipeline.expectSuccessMessage();
});

// ========== PIPELINE NAME ==========

Then('the pipeline name should be displayed as {string}', async function (name: string) {
  await this.pipeline.expectPipelineName(name);
});

Then('the pipeline name should be displayed as "{string}"', async function (name: string) {
  await this.pipeline.expectPipelineName(name);
});
