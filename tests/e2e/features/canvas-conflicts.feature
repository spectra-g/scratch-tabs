@canvas @increment-16
Feature: Canvas cross-window revision conflicts
  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"

  Scenario: Reload or take over stale local work without leaking scene content
    When I create a new Canvas
    And I open the Canvas in a second window
    And I save "saved in the first window" in the first Canvas window
    And I edit "stale work in the second window" in the second Canvas window
    Then the second Canvas window should warn about unsaved conflicting work

    When I reload the saved Canvas version in the second window
    Then the second Canvas window should contain "saved in the first window" but not "stale work in the second window"

    When I save "newer remote work" in the first Canvas window
    And I edit "chosen take-over work" in the second Canvas window
    And I take over the Canvas from the second window
    And I reload both Canvas windows
    Then both Canvas windows should contain "chosen take-over work"
    And Canvas revision broadcasts should contain identifiers only
