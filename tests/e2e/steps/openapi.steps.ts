import { Then as OpenApiThen, When as OpenApiWhen } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

export {};

OpenApiThen('I should see the OpenAPI Smart View', async function() {
  await expect(this.page.locator('[data-testid="openapi-explorer"]')).toBeVisible();
});

OpenApiThen('the OpenAPI Smart View should contain {string}', async function(expectedText: string) {
  await expect(this.page.locator('[data-testid="openapi-explorer"]')).toContainText(expectedText);
});

OpenApiThen('the OpenAPI Smart View should contain "{string}"', async function(expectedText: string) {
  await expect(this.page.locator('[data-testid="openapi-explorer"]')).toContainText(expectedText);
});

OpenApiWhen('I select the OpenAPI endpoint {string} {string}', async function(method: string, path: string) {
  const row = this.page.locator('[data-testid="openapi-operation-row"]', {
    hasText: path,
  }).filter({
    hasText: method,
  }).first();

  await expect(row).toBeVisible();
  await row.click();
});

OpenApiThen('the OpenAPI endpoint detail should contain {string}', async function(expectedText: string) {
  await expect(this.page.locator('[data-testid="openapi-endpoint-detail"]')).toContainText(expectedText);
});

OpenApiThen('the OpenAPI endpoint detail should contain "{string}"', async function(expectedText: string) {
  await expect(this.page.locator('[data-testid="openapi-endpoint-detail"]')).toContainText(expectedText);
});

OpenApiWhen('I select the OpenAPI response {string}', async function(status: string) {
  const statusButton = this.page.locator(`[data-testid="openapi-response-status-${status}"]`);
  await expect(statusButton).toBeVisible();
  await statusButton.click();
});

OpenApiWhen('I open the OpenAPI schema {string}', async function(schemaName: string) {
  const schemaLink = this.page.locator('[data-testid="openapi-schema-link"]', {
    hasText: schemaName,
  }).first();

  if (await schemaLink.isVisible()) {
    await schemaLink.click();
    return;
  }

  await this.page.locator('[data-testid="openapi-tab-schemas"]').click();
  const schemaRow = this.page.locator(`[data-testid="openapi-schema-row"][data-schema-name="${schemaName}"]`);
  await expect(schemaRow).toBeVisible();
  await schemaRow.click();
});

OpenApiThen('I should see the OpenAPI schema detail for {string}', async function(schemaName: string) {
  const detail = this.page.locator('[data-testid="openapi-schema-detail"]');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(schemaName);
});

OpenApiThen('I should see the OpenAPI schema detail for "{string}"', async function(schemaName: string) {
  const detail = this.page.locator('[data-testid="openapi-schema-detail"]');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(schemaName);
});

OpenApiThen('the OpenAPI schema example should contain {string}', async function(expectedText: string) {
  await expect(this.page.locator('[data-testid="openapi-schema-detail"]')).toContainText(expectedText);
});

OpenApiThen('the OpenAPI schema example should contain "{string}"', async function(expectedText: string) {
  await expect(this.page.locator('[data-testid="openapi-schema-detail"]')).toContainText(expectedText);
});
