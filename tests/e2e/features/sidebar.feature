@sidebar
Feature: Workspace Sidebar
  As a user
  I want to use the workspace sidebar to navigate and manage workspaces and tabs
  So that I can efficiently organize and access my work

  Background:
    Given I am on the homepage

    Scenario: Toggle sidebar visibility with keyboard shortcut
    When I click the icon for "New tab"
    Then the sidebar should be visible
    When I press "Cmd+B" to toggle the sidebar
    Then the sidebar should be hidden
    And the icon rail should be visible
    When I press "Cmd+B" to toggle the sidebar
    Then the sidebar should be visible

    Scenario: Click workspace to expand and collapse tabs
    When I click the icon for "New tab"
    Then the sidebar should be visible
    And I type "AAA" into the editor
    And workspace "Default Workspace" should be expanded in the sidebar
    And I should see tabs in the expanded workspace
    When I click on workspace "Default Workspace" in the sidebar
    Then workspace "Default Workspace" should be collapsed in the sidebar

    Scenario: Click tab in active workspace to activate it
    When I click the icon for "New tab"
    And I click the icon for "New tab"
    And the sidebar should be visible
    And workspace "Default Workspace" should be expanded in the sidebar
    When I click on tab "Scratch 1" in the sidebar
    Then tab "Scratch 1" should be active in the tab bar
    And tab "Scratch 1" should show active indicator in sidebar

    Scenario: Active workspace has visual distinction
    When I click the icon for "New tab"
    Then the sidebar should be visible
    And workspace "Default Workspace" should be marked as active in sidebar
    When I click the create workspace button in sidebar
    Then workspace "New Workspace" should be expanded in the sidebar
    When I right-click on workspace "New Workspace" in the sidebar
    And I select "Rename Workspace" from the context menu
    And I type "Project Alpha" in the workspace rename input
    And I press Enter to confirm rename
    Then the "Project Alpha" workspace should be visible
    And workspace "Project Alpha" should be marked as active in sidebar
    And workspace "Default Workspace" should not be marked as active in sidebar

    Scenario: Click tab in inactive workspace switches workspace
    When I click the icon for "New tab"
    And I double-click on the active tab
    And I type "Default Tab" in the rename input
    And I press Enter to confirm rename
    Then the "Default Tab" tab should exist on the page
    When I click the create workspace button in sidebar
    Then workspace "New Workspace" should be expanded in the sidebar
    When I right-click on workspace "New Workspace" in the sidebar
    And I select "Rename Workspace" from the context menu
    And I type "Project Alpha" in the workspace rename input
    And I press Enter to confirm rename
    Then the "Project Alpha" workspace should be visible
    When I click the icon for "New tab"
    And I wait for the state to be saved
    And I double-click on the active tab
    And I type "Alpha Tab" in the rename input
    And I press Enter to confirm rename
    Then the "Alpha Tab" tab should exist on the page
    When I click on tab "Default Tab" in the sidebar
    And tab "Default Tab" should be active in the tab bar
    And workspace "Default Workspace" should be marked as active in sidebar

  Scenario: Create new workspace from sidebar
    When I click the icon for "New tab"
    Then the sidebar should be visible
    When I click the create workspace button in sidebar
    Then workspace "New Workspace" should be expanded in the sidebar
    And workspace "New Workspace" should be marked as active in sidebar

  Scenario: Icon rail shows workspace icons when collapsed
    When I click the icon for "New tab"
    Then the sidebar should be visible
    When I press "Cmd+B" to toggle the sidebar
    Then the sidebar should be hidden
    And the icon rail should be visible
    And I should see workspace icons in the icon rail

  Scenario: Click workspace icon in icon rail switches workspace
    When I click the icon for "New tab"
    And I double-click on the active tab
    And I type "Default Tab" in the rename input
    And I press Enter to confirm rename
    Then the "Default Tab" tab should exist on the page
    And I click the create workspace button in sidebar
    Then workspace "New Workspace" should be expanded in the sidebar
    When I right-click on workspace "New Workspace" in the sidebar
    And I select "Rename Workspace" from the context menu
    And I type "Project Alpha" in the workspace rename input
    And I press Enter to confirm rename
    Then the "Project Alpha" workspace should be visible
    When I press "Cmd+B" to toggle the sidebar
    Then the icon rail should be visible
    Then the "Default Tab" tab should not exist on the page
    When I click on workspace icon for "Default Workspace" in icon rail
    Then the "Default Tab" tab should exist on the page

  Scenario: Icon rail mode persists on page refresh
    When I click the icon for "New tab"
    Then the sidebar should be visible
    When I press "Cmd+B" to toggle the sidebar
    Then the sidebar should be hidden
    And the icon rail should be visible
    When I wait for the state to be saved
    And I refresh the page
    And I wait for the application to load
    Then the sidebar should be hidden
    And the icon rail should be visible

  Scenario: Workspace expand collapse state persists on page refresh
    When I click the icon for "New tab"
    Then the sidebar should be visible
    And I type "AAA" into the editor
    And workspace "Default Workspace" should be expanded in the sidebar
    When I click on workspace "Default Workspace" in the sidebar
    Then workspace "Default Workspace" should be collapsed in the sidebar
    When I click the create workspace button in sidebar
    Then workspace "New Workspace" should be expanded in the sidebar
    When I right-click on workspace "New Workspace" in the sidebar
    And I select "Rename Workspace" from the context menu
    And I type "Project Alpha" in the workspace rename input
    And I press Enter to confirm rename
    Then the "Project Alpha" workspace should be visible
    And workspace "Project Alpha" should be expanded in the sidebar
    When I wait for the state to be saved
    And I refresh the page
    And I wait for the application to load
    Then the sidebar should be visible
    And workspace "Default Workspace" should be collapsed in the sidebar
    And workspace "Project Alpha" should be expanded in the sidebar
