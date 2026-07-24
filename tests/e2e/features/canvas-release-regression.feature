@canvas @increment-17
Feature: Canvas release regression
  Background:
    Given I am using a Canvas desktop viewport
    And I am on the homepage

  Scenario: Complete the primary Canvas workflow with the keyboard
    When I complete the Canvas release workflow using only the keyboard
    Then the keyboard Canvas workflow should be restored accessibly

  Scenario: Restore a mixed local board and keep offline-safe actions usable
    When I click the icon for "New tab"
    And I create a new Canvas
    And I create and reload a mixed Canvas release board offline
    Then every mixed Canvas card should remain usable offline

  Scenario: Recover explicitly from storage quota exhaustion
    When I click the icon for "New tab"
    And I create a new Canvas
    And I exhaust storage while saving Canvas text "Unsaved quota note"
    Then the Canvas should show unsaved state and recover when I retry
    When I refresh the page
    Then the Canvas should contain a text card with "Unsaved quota note"

  Scenario: Isolate split-pane shortcuts and avoid narrow renderer initialization
    When I click the icon for "New tab"
    And I resize to a wide Canvas split viewport
    And I create a new Canvas
    And I create a new Canvas
    And I click the "Canvas 1" tab
    And I right-click the "Canvas 2" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    When I add a Canvas text card containing "Left release note" on the left side
    And I add a Canvas text card containing "Right release note" on the right side
    Then split Canvas shortcuts and narrow fallbacks should remain isolated
