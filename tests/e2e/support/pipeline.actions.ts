import { Page, expect } from '@playwright/test';

/**
 * Pipeline Actions
 *
 * Encapsulates interactions with the Pipeline Editor Modal.
 * Follows the action class pattern used by other E2E test helpers.
 */
export class PipelineActions {
  constructor(private page: Page) {}

  // ========== MODAL MANAGEMENT ==========

  /**
   * Open the Pipeline modal via context menu
   */
  async openPipelineModal(): Promise<void> {
    // Wait for the Pipeline modal to be visible
    const modal = this.page.locator('text=Transformation Pipeline');
    await expect(modal).toBeVisible();
  }

  /**
   * Verify the Pipeline modal is visible
   */
  async expectPipelineModalVisible(): Promise<void> {
    const modal = this.page.locator('text=Transformation Pipeline');
    await expect(modal).toBeVisible();
  }

  /**
   * Verify the Pipeline modal is not visible
   */
  async expectPipelineModalNotVisible(): Promise<void> {
    const modal = this.page.locator('text=Transformation Pipeline');
    await expect(modal).not.toBeVisible();
  }

  /**
   * Close the Pipeline modal using the X button
   */
  async closePipelineModal(): Promise<void> {
    const closeButton = this.page.locator('[title="Close modal"]');
    await closeButton.click();
    await this.expectPipelineModalNotVisible();
  }

  /**
   * Click the Cancel button
   */
  async clickCancel(): Promise<void> {
    const cancelButton = this.page.locator('button:has-text("Cancel")').last();
    await cancelButton.click();
  }

  // ========== OPERATION PALETTE ==========

  /**
   * Search for an operation in the palette
   */
  async searchOperation(searchText: string): Promise<void> {
    const searchInput = this.page.locator('input[placeholder="Search operations..."]');
    await searchInput.fill(searchText);
  }

  /**
   * Clear the operation search
   */
  async clearOperationSearch(): Promise<void> {
    const searchInput = this.page.locator('input[placeholder="Search operations..."]');
    await searchInput.fill('');
  }

  /**
   * Expand a category in the operation palette
   */
  async expandCategory(categoryName: string): Promise<void> {
    const categoryButton = this.page.locator(`button:has-text("${categoryName}")`).first();
    await categoryButton.click();
  }

  /**
   * Add an operation by clicking on it in the palette
   * Works with both search results and category listings
   */
  async addOperation(operationName: string): Promise<void> {
    // Look for the operation item and click it
    const operationItem = this.page.locator(`div:has-text("${operationName}")`).filter({
      has: this.page.locator('svg') // Has a plus icon
    }).first();
    await operationItem.click();
  }

  /**
   * Add an operation by searching for it first
   */
  async searchAndAddOperation(operationName: string): Promise<void> {
    await this.searchOperation(operationName);
    // Wait for search results to appear
    const operationItem = this.page.locator(`div.cursor-pointer:has-text("${operationName}")`).first();
    await expect(operationItem).toBeVisible();
    await operationItem.click();
    // Clear search after adding
    await this.clearOperationSearch();
  }

  // ========== PIPELINE STEPS ==========

  /**
   * Get the number of steps in the pipeline
   */
  async getStepCount(): Promise<number> {
    // Count the step number badges (1, 2, 3, etc.)
    const stepNumbers = this.page.locator('.rounded-full.bg-element');
    return await stepNumbers.count();
  }

  /**
   * Expect a specific number of steps
   * Note: UI always shows "steps" regardless of count (e.g., "1 steps", "2 steps")
   */
  async expectStepCount(expectedCount: number): Promise<void> {
    // The step count is shown below "Pipeline Steps" header
    // Find the container with "Pipeline Steps" and then look for the count
    const pipelineStepsHeader = this.page.locator('h3:has-text("Pipeline Steps")');
    await expect(pipelineStepsHeader).toBeVisible();

    // The count is in a sibling <p> element
    const stepCountText = pipelineStepsHeader.locator('..').locator('p', { hasText: `${expectedCount} steps` });
    await expect(stepCountText).toBeVisible();
  }

  /**
   * Toggle a step's enabled state
   * @param stepIndex 1-based step index
   */
  async toggleStepEnabled(stepIndex: number): Promise<void> {
    const toggleButton = this.page.locator(`button[title="Disable step"], button[title="Enable step"]`).nth(stepIndex - 1);
    await toggleButton.click();
  }

  /**
   * Remove a step by clicking its remove button
   * @param stepIndex 1-based step index
   */
  async removeStep(stepIndex: number): Promise<void> {
    const removeButton = this.page.locator('button[title="Remove step"]').nth(stepIndex - 1);
    await removeButton.click();
  }

  /**
   * Expand a step to show its parameters
   * @param stepIndex 1-based step index
   */
  async expandStep(stepIndex: number): Promise<void> {
    // Click on the step header area to expand
    const stepHeader = this.page.locator('.cursor-grab').nth(stepIndex - 1).locator('..').locator('button').first();
    await stepHeader.click();
  }

  /**
   * Check the "Apply per line" checkbox for a step
   * @param stepIndex 1-based step index
   */
  async toggleApplyPerLine(stepIndex: number): Promise<void> {
    // Find the "Apply per line" checkbox within the step's expanded parameters
    const applyPerLineCheckbox = this.page.locator('text=Apply per line').locator('..').locator('input[type="checkbox"]');
    await applyPerLineCheckbox.click();
  }

  /**
   * Set a parameter value for a step
   */
  async setStepParameter(paramLabel: string, value: string): Promise<void> {
    // Find the parameter input by its label
    const parameterSection = this.page.locator(`text="${paramLabel}"`).locator('..');
    const input = parameterSection.locator('input, select, textarea').first();

    const tagName = await input.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await input.selectOption(value);
    } else {
      await input.fill(value);
    }
  }

  /**
   * Set a number parameter value
   */
  async setNumberParameter(paramLabel: string, value: number): Promise<void> {
    const parameterSection = this.page.locator(`text="${paramLabel}"`).locator('..');
    const input = parameterSection.locator('input[type="number"]');
    await input.fill(value.toString());
  }

  // ========== INPUT / OUTPUT ==========

  /**
   * Set the pipeline input text
   */
  async setInput(content: string): Promise<void> {
    const inputTextarea = this.page.locator('textarea[placeholder="Enter or paste content to transform..."]');
    await inputTextarea.fill(content);
  }

  /**
   * Get the pipeline input text
   */
  async getInput(): Promise<string> {
    const inputTextarea = this.page.locator('textarea[placeholder="Enter or paste content to transform..."]');
    return await inputTextarea.inputValue();
  }

  /**
   * Get the pipeline output text
   */
  async getOutput(): Promise<string> {
    // Output is the second read-only textarea
    const outputTextarea = this.page.locator('textarea[readonly]').last();
    return await outputTextarea.inputValue();
  }

  /**
   * Expect the output to contain specific text
   */
  async expectOutputContains(expectedText: string): Promise<void> {
    const outputTextarea = this.page.locator('textarea[readonly]').last();
    await expect(outputTextarea).toContainText(expectedText);
  }

  /**
   * Expect the output to equal specific text
   */
  async expectOutputEquals(expectedText: string): Promise<void> {
    const outputTextarea = this.page.locator('textarea[readonly]').last();
    await expect(outputTextarea).toHaveValue(expectedText);
  }

  /**
   * Expect output shows "Modified" badge
   */
  async expectOutputModified(): Promise<void> {
    // Use exact match to avoid matching dropdown options containing "Modified"
    const modifiedBadge = this.page.getByText('Modified', { exact: true });
    await expect(modifiedBadge).toBeVisible();
  }

  /**
   * Expect an error to be displayed
   */
  async expectError(errorMessage?: string): Promise<void> {
    // Look for the error container specifically (has both bg-danger/10 and border)
    const errorAlert = this.page.locator('.bg-danger\\/10.border');
    await expect(errorAlert).toBeVisible();

    if (errorMessage) {
      await expect(errorAlert).toContainText(errorMessage);
    }
  }

  /**
   * Expect the footer to show error state
   */
  async expectFooterShowsError(): Promise<void> {
    const errorText = this.page.locator('text=Pipeline has errors');
    await expect(errorText).toBeVisible();
  }

  // ========== SAVE / LOAD ==========

  /**
   * Click the Save button
   */
  async clickSave(): Promise<void> {
    const saveButton = this.page.locator('button:has-text("Save")').first();
    await saveButton.click();
  }

  /**
   * Enter a pipeline name in the save dialog and save
   */
  async savePipelineAs(name: string): Promise<void> {
    await this.clickSave();

    // Wait for the save input to appear
    const saveInput = this.page.locator('input[placeholder="Enter pipeline name..."]');
    await expect(saveInput).toBeVisible();
    await saveInput.fill(name);

    // Click the Save button in the dropdown
    const confirmSaveButton = this.page.locator('button:has-text("Save")').last();
    await confirmSaveButton.click();

    // Wait for the dropdown to close
    await expect(saveInput).not.toBeVisible();
  }

  /**
   * Click the Load button
   */
  async clickLoad(): Promise<void> {
    const loadButton = this.page.locator('button:has-text("Load")');
    await loadButton.click();
  }

  /**
   * Load a saved pipeline by name
   */
  async loadPipeline(name: string): Promise<void> {
    await this.clickLoad();

    // Wait for the saved pipelines dropdown to appear
    const savedPipelinesHeader = this.page.locator('text=Saved Pipelines');
    await expect(savedPipelinesHeader).toBeVisible();

    // The clickable row has cursor-pointer class and contains the pipeline name
    // Target the row div specifically, not inner divs
    const pipelineRow = this.page.locator('div.cursor-pointer').filter({
      has: this.page.locator(`text="${name}"`)
    }).first();

    await expect(pipelineRow).toBeVisible();
    await pipelineRow.click();

    // Wait for the dropdown to close (indicates load completed)
    await expect(savedPipelinesHeader).not.toBeVisible();
  }

  /**
   * Expect a saved pipeline to be in the load dropdown
   */
  async expectSavedPipelineExists(name: string): Promise<void> {
    await this.clickLoad();
    const pipelineItem = this.page.locator(`text="${name}"`);
    await expect(pipelineItem).toBeVisible();
    // Click elsewhere to close dropdown
    await this.page.keyboard.press('Escape');
  }

  /**
   * Delete a saved pipeline from the load dropdown
   */
  async deleteSavedPipeline(name: string): Promise<void> {
    await this.clickLoad();

    // Find the pipeline item and its delete button
    const pipelineRow = this.page.locator(`div:has-text("${name}")`).filter({
      has: this.page.locator('text=steps')
    }).first();

    const deleteButton = pipelineRow.locator('button[title="Delete pipeline"]');
    await deleteButton.click();
  }

  /**
   * Expect no saved pipelines message
   */
  async expectNoSavedPipelines(): Promise<void> {
    await this.clickLoad();
    const noSavedMessage = this.page.locator('text=No saved pipelines');
    await expect(noSavedMessage).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  // ========== RESET ==========

  /**
   * Click the Reset button
   */
  async clickReset(): Promise<void> {
    const resetButton = this.page.locator('button:has-text("Reset")');
    await resetButton.click();
  }

  /**
   * Expect the pipeline to be empty (no steps)
   */
  async expectPipelineEmpty(): Promise<void> {
    const emptyMessage = this.page.locator('text=No steps yet');
    await expect(emptyMessage).toBeVisible();
  }

  // ========== APPLY ==========

  /**
   * Click Apply Changes button
   */
  async clickApplyChanges(): Promise<void> {
    const applyButton = this.page.locator('button:has-text("Apply Changes")');
    await applyButton.click();
  }

  /**
   * Expect the Apply Changes button to be enabled
   */
  async expectApplyEnabled(): Promise<void> {
    const applyButton = this.page.locator('button:has-text("Apply Changes")');
    await expect(applyButton).toBeEnabled();
  }

  /**
   * Expect the Apply Changes button to be disabled
   */
  async expectApplyDisabled(): Promise<void> {
    const applyButton = this.page.locator('button:has-text("Apply Changes")');
    await expect(applyButton).toBeDisabled();
  }

  // ========== EXECUTION STATS ==========

  /**
   * Expect execution time to be displayed
   */
  async expectExecutionTimeDisplayed(): Promise<void> {
    // Look for the time display in ms format
    const timeDisplay = this.page.locator('text=/\\d+ms/');
    await expect(timeDisplay.first()).toBeVisible();
  }

  /**
   * Expect footer to show success message with execution time
   */
  async expectSuccessMessage(): Promise<void> {
    const successMessage = this.page.locator('text=/Pipeline executed in \\d+ms/');
    await expect(successMessage).toBeVisible();
  }

  // ========== PIPELINE NAME ==========

  /**
   * Expect the pipeline name to be displayed in the header
   */
  async expectPipelineName(name: string): Promise<void> {
    const nameDisplay = this.page.locator(`.bg-element:has-text("${name}")`);
    await expect(nameDisplay).toBeVisible();
  }

  // ========== NEW OPERATIONS ASSERTIONS ==========

  /**
   * Expect the output to not be empty
   */
  async expectOutputNotEmpty(): Promise<void> {
    const output = await this.getOutput();
    expect(output.trim().length).toBeGreaterThan(0);
  }
}
