const { When: WorkspaceWhen, Then: WorkspaceThen } = require('@cucumber/cucumber');
const { expect: expectWorkspace } = require('@playwright/test');

WorkspaceThen('the {string} workspace should be visible', async function (workspaceName) {
  await this.workspace.waitForWorkspaceToBeVisible(workspaceName);
});

WorkspaceThen('the "{string}" workspace should be visible', async function (workspaceName) {
  await this.workspace.waitForWorkspaceToBeVisible(workspaceName);
});

WorkspaceWhen('I click the workspace switcher', async function () {
  await this.workspace.clickWorkspaceSwitcher();
});

WorkspaceWhen('I click the "New workspace" button', async function () {
  await this.workspace.clickNewWorkspaceButton();
});

WorkspaceWhen('I type {string} into the workspace name input', async function (workspaceName) {
  await this.workspace.typeWorkspaceName(workspaceName);
});

WorkspaceWhen('I type "{string}" into the workspace name input', async function (workspaceName) {
  await this.workspace.typeWorkspaceName(workspaceName);
});

WorkspaceWhen('I click the "Create" button', async function () {
  await this.workspace.clickCreateWorkspaceButton();
});

WorkspaceWhen('I click on workspace {string}', async function (workspaceName) {
  await this.workspace.clickWorkspace(workspaceName);
});

WorkspaceWhen('I click on workspace "{string}"', async function (workspaceName) {
  await this.workspace.clickWorkspace(workspaceName);
});

WorkspaceThen('the {string} workspace should not be visible', async function (workspaceName) {
  await this.workspace.waitForWorkspaceToNotBeVisible(workspaceName);
});

WorkspaceThen('the "{string}" workspace should not be visible', async function (workspaceName) {
  await this.workspace.waitForWorkspaceToNotBeVisible(workspaceName);
});
