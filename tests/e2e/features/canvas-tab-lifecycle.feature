@canvas @desktop
Feature: Canvas tab lifecycle
  As a Canvas user
  I want tab lifecycle actions to preserve scenes and image assets safely
  So that duplication, deletion, and workspace moves never corrupt my work

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"

  Scenario: Duplicate a mixed Canvas without linking scene edits
    When I create a new Canvas
    And I add a Canvas text card containing "Original note"
    And I add an image through the Canvas file chooser
    And I wait for the Canvas scene to be saved
    And I duplicate the Canvas tab "Canvas 1"
    Then the "Canvas 1 (Copy)" tab should be active
    When I add a Canvas text card containing "Duplicate only"
    And I wait for the Canvas scene to be saved
    And I click the "Canvas 1" tab
    Then the Canvas should contain a text card with "Original note"
    And the Canvas should not contain a text card with "Duplicate only"
    And the Canvas image and its dimensions should be restored

  Scenario: Delete shared image assets only after the final Canvas reference
    When I create a new Canvas
    And I add an image through the Canvas file chooser
    And I wait for the Canvas scene to be saved
    And I duplicate the Canvas tab "Canvas 1"
    Then the "Canvas 1 (Copy)" tab should be active
    When I right-click on tab "Canvas 1 (Copy)" in the sidebar
    And I select "Close" from the context menu
    And I click "Close" in the confirmation dialog
    And I click the "Canvas 1" tab
    Then the Canvas image and its dimensions should be restored
    And the remembered Canvas image asset should still exist
    When I right-click on tab "Canvas 1" in the sidebar
    And I select "Close" from the context menu
    And I click "Close" in the confirmation dialog
    Then the remembered Canvas image asset should be deleted

  Scenario: Move a mixed Canvas to another workspace with remapped assets
    When I create a new Canvas
    And I add a Canvas text card containing "Move me"
    And I add an image through the Canvas file chooser
    And I wait for the Canvas scene to be saved
    And I click the create workspace button in sidebar
    And I right-click on workspace "New Workspace" in the sidebar
    And I select "Rename Workspace" from the context menu
    And I type "Destination" in the workspace rename input
    And I press Enter to confirm rename
    And I click on tab "Canvas 1" in the sidebar
    And I right-click on tab "Canvas 1" in the sidebar
    And I select "Destination" from the "Move to Workspace" submenu
    And I click on tab "Canvas 1" in the sidebar
    And I refresh the page
    Then the Canvas should contain a text card with "Move me"
    And the Canvas image and its dimensions should be restored
    And the moved Canvas image should use a target-workspace asset
