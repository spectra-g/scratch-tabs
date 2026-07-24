Feature: Canvas creation and Send to Canvas entry points
  As a developer collecting related working material
  I want to create and populate Canvas documents from existing Scratch Tabs surfaces
  So that spatial organization is discoverable and does not interrupt my normal tab workflow

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage

  Scenario: Create Canvas documents from the document menu and Tool Selector
    When I verify the primary plus still creates a text tab
    And I create a new Canvas
    Then I should see an empty Canvas
    When I create a Canvas from the Tool Selector
    Then I should see an empty Canvas

  Scenario: Create a Canvas from an empty workspace
    When I verify the primary plus still creates a text tab
    And I create a Canvas from the empty workspace action
    Then I should see an empty Canvas

  Scenario: Send a full tab, selected URL, and image to new and existing Canvases
    When I verify the primary plus still creates a text tab
    And I send the full tab to a new Canvas
    And I send a selected URL to the existing Canvas
    And I send an image tab to the existing Canvas
    Then the sent Canvas content should survive reload

  Scenario: Create and activate a Canvas from the direct route
    When I open the direct Canvas route
    Then I should see an empty Canvas
