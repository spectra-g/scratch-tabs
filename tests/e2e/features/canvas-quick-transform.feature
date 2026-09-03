Feature: Canvas quick transform
  As a developer
  I want to run pipeline operations on Canvas cards
  So that I can build linked transform chains without leaving the Canvas

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"
    And I create a new Canvas

  Scenario: Transform a code card into a linked derived card
    When I add a Canvas code card containing "hello world"
    And I open Quick Transform for the Canvas code card
    And I search for "uppercase" in the Canvas transform dialog
    And I run the Canvas transform "text.uppercase"
    Then the Canvas derived card should contain "HELLO WORLD"
    And the Canvas transform badge should show "Uppercase"
    And 1 Canvas transform edges should be visible
    When I wait for the Canvas scene to be saved
    And I refresh the page
    Then the Canvas derived card should contain "HELLO WORLD"
    And 1 Canvas transform edges should be visible

  Scenario: Editing a source card refreshes its derived card
    When I add a Canvas code card containing "hello world"
    And I open Quick Transform for the Canvas code card
    And I search for "uppercase" in the Canvas transform dialog
    And I run the Canvas transform "text.uppercase"
    And I edit the Canvas code card containing "hello world" to contain "hello canvas"
    Then the Canvas derived card should contain "HELLO CANVAS"

  Scenario: Detaching a derived card makes it editable
    When I add a Canvas code card containing "hello world"
    And I open Quick Transform for the Canvas code card
    And I search for "uppercase" in the Canvas transform dialog
    And I run the Canvas transform "text.uppercase"
    And I detach the Canvas derived card
    Then the Canvas card containing "HELLO WORLD" should be editable
    And 0 Canvas transform edges should be visible
