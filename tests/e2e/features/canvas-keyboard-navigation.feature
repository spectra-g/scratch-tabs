Feature: Canvas keyboard focus and spatial navigation

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"
    And I create a new Canvas

  Scenario: Arrow keys traverse a fixed irregular card layout
    When I create the fixed Canvas keyboard layout
    And I focus the Canvas card "Middle left"
    And I press "ArrowUp" in the Canvas
    Then the Canvas card "Top left" should be focused and selected
    When I press "ArrowRight" in the Canvas
    Then the Canvas card "Top right" should be focused and selected
    When I press "ArrowDown" in the Canvas
    Then the Canvas card "Middle right" should be focused and selected
    When I press "ArrowLeft" in the Canvas
    Then the Canvas card "Middle left" should be focused and selected

  Scenario: Tab and Shift+Tab traverse spatial order without trapping focus
    When I create the fixed Canvas keyboard layout
    And I traverse the Canvas forward with Tab
    Then the forward Canvas traversal should follow spatial order and exit at the boundary
    When I traverse the Canvas backward with Shift+Tab
    Then the backward Canvas traversal should reverse spatial order and exit at the boundary

  Scenario: Keyboard navigation reveals an offscreen card without changing zoom
    When I create a Canvas layout with an offscreen card
    And I press "ArrowRight" in the Canvas
    Then the Canvas card "Offscreen card" should be focused and selected
    And the offscreen Canvas card should be fully visible without a zoom change

  Scenario: Enter and Escape isolate text editing from Canvas navigation
    When I add a Canvas text card containing "Keyboard editable"
    And I focus the Canvas card "Keyboard editable"
    And I enter the focused Canvas card editing mode
    Then Canvas text-editing keys should remain in card "Keyboard editable"
    When I leave Canvas card editing with Escape
    Then the Canvas card "Keyboard editable" should be focused and selected
