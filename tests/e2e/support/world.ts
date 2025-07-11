import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import { Page, BrowserContext } from '@playwright/test';
import { EditorActions } from './editor.actions';
import { TabBarActions } from './tabBar.actions';
import { ContextMenuActions } from './contextMenu.actions';
import { NavigationActions } from './navigation.actions';
import { ClipboardActions } from './clipboard.actions';
import { FileActions } from './file.actions';
import { StatusBarActions } from './statusBar.actions';

export class E2EWorld extends World {
  context!: BrowserContext;
  page!: Page;

  // Action helpers
  editor!: EditorActions;
  tabBar!: TabBarActions;
  contextMenu!: ContextMenuActions;
  navigation!: NavigationActions;
  clipboard!: ClipboardActions;
  file!: FileActions;
  statusBar!: StatusBarActions;

  constructor(options: IWorldOptions) {
    super(options);
    // The 'page' object isn't available yet, so we initialize helpers in a 'Before' hook
    // where the page is guaranteed to exist.
  }

  // This method will be called from the Before hook in hooks.ts
  initializeHelpers() {
    this.editor = new EditorActions(this.page);
    this.tabBar = new TabBarActions(this.page);
    this.contextMenu = new ContextMenuActions(this.page);
    this.navigation = new NavigationActions(this.page);
    this.clipboard = new ClipboardActions(this.page);
    this.file = new FileActions(this.page);
    this.statusBar = new StatusBarActions(this.page);
  }

  // Legacy method delegates - these maintain backwards compatibility
  // while migrating step definitions to use the new action classes
  
  // Navigation delegates
  async navigateToHome() {
    return this.navigation.navigateToHome();
  }

  async clickButton(buttonText: string) {
    return this.navigation.clickButton(buttonText);
  }

  async clickLink(linkText: string) {
    return this.navigation.clickLink(linkText);
  }

  async clickIcon(iconTestId: string) {
    return this.navigation.clickIcon(iconTestId);
  }

  async waitForPageStabilization() {
    return this.navigation.waitForPageStabilization();
  }

  async expectTextToExist(text: string) {
    return this.navigation.expectTextToExist(text);
  }

  async expectUrlContains(expectedUrlPart: string) {
    return this.navigation.expectUrlContains(expectedUrlPart);
  }

  async waitForSeconds(seconds: number) {
    return this.navigation.waitForSeconds(seconds);
  }

  async doubleClickOnPage() {
    return this.navigation.doubleClickOnPage();
  }

  // Editor delegates
  async clickTab(tabTitle: string) {
    return this.tabBar.clickTab(tabTitle);
  }

  async typeInEditor(content: string) {
    return this.editor.typeInEditor(content);
  }

  async rightClickEditor() {
    return this.editor.rightClickEditor();
  }

  async doubleClickEditor() {
    return this.editor.doubleClickEditor();
  }

  async clickInEditor() {
    return this.editor.clickInEditor();
  }

  async getMonacoEditorContent(): Promise<string> {
    return this.editor.getMonacoEditorContent();
  }

  async expectEditorContentToEqual(expectedContent: string) {
    return this.editor.expectEditorContentToEqual(expectedContent);
  }

  async expectEditorContentToContain(text: string) {
    return this.editor.expectEditorContentToContain(text);
  }

  async expectEditorContainsMarkdown() {
    return this.editor.expectEditorContainsMarkdown();
  }

  async expectPreviewIsVisible() {
    return this.editor.expectPreviewIsVisible();
  }

  async typeMarkdownContent(content: string) {
    return this.editor.typeMarkdownContent(content);
  }

  async typeText(text: string) {
    return this.editor.typeText(text);
  }

  async pressCtrlZ() {
    return this.editor.pressCtrlZ();
  }

  async expectFirst10LinesContainJson() {
    return this.editor.expectFirst10LinesContainJson();
  }

  async expectContentIsSingleLine() {
    return this.editor.expectContentIsSingleLine();
  }

  async expectContentIsNotSingleLine() {
    return this.editor.expectContentIsNotSingleLine();
  }

  // Tab delegates
  async expectTabIsActive(tabTitle: string) {
    return this.tabBar.expectTabIsActive(tabTitle);
  }

  async expectTabExistsAndNotActive(tabTitle: string) {
    return this.tabBar.expectTabExistsAndNotActive(tabTitle);
  }

  async rightClickTab(tabTitle: string) {
    return this.tabBar.rightClickTab(tabTitle);
  }

  async clickThreeDotsMenu() {
    return this.tabBar.clickThreeDotsMenu();
  }

  async clickNewTabFromPaste() {
    return this.tabBar.clickNewTabFromPaste();
  }

  async clickNewTablet() {
    return this.tabBar.clickNewTablet();
  }

  async selectTablet(tabletName: string) {
    return this.tabBar.selectTablet(tabletName);
  }

  async expectTabletIsActive(tabletName: string) {
    return this.tabBar.expectTabletIsActive(tabletName);
  }

  async clickOpenSpecializedTablet() {
    return this.tabBar.clickOpenSpecializedTablet();
  }

  async clickImportFromClipboard() {
    return this.tabBar.clickImportFromClipboard();
  }

  // Context menu delegates
  async selectContextMenuOption(optionText: string) {
    return this.contextMenu.selectContextMenuOption(optionText);
  }

  async selectFromContextMenu(menuItem: string) {
    return this.contextMenu.selectFromContextMenu(menuItem);
  }

  async selectFromSubmenu(parentItem: string, subItem: string) {
    return this.contextMenu.selectFromSubmenu(parentItem, subItem);
  }

  // Clipboard delegates
  async setClipboardContent(content: string) {
    return this.clipboard.setClipboardContent(content);
  }

  // File delegates
  async uploadFile(filename: string, content: string) {
    return this.file.uploadFile(filename, content);
  }

  async dragFileOntoPage(filename: string, content: string) {
    return this.file.dragFileOntoPage(filename, content);
  }

  async generateLargeJsonFile() {
    return this.file.generateLargeJsonFile();
  }

  // Status bar delegates
  getStatusBarLanguageLabel() {
    return this.statusBar.getStatusBarLanguageLabel();
  }

  getStatusBarValidationIcon() {
    return this.statusBar.getStatusBarValidationIcon();
  }

  async expectStatusBarLanguage(language: string) {
    return this.statusBar.expectStatusBarLanguage(language);
  }

  async expectStatusBarValidationTick() {
    return this.statusBar.expectStatusBarValidationTick();
  }
}

setWorldConstructor(E2EWorld); 