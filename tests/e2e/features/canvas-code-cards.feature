Feature: Canvas code cards
  As a developer
  I want durable, lightweight code cards on a Canvas
  So that I can inspect and reuse code without loading an editor per card

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"
    And I create a new Canvas

  Scenario: Format JSON and restore code-card presentation settings
    When I add a Canvas code card containing "{\"users\":[{\"id\":1}]}"
    And I format, wrap, and collapse the Canvas code card
    And I wait for the Canvas scene to be saved
    And I refresh the page
    Then the formatted Canvas code and settings should be restored

  Scenario: Detect and safely render non-JSON code
    When I add a Canvas code card containing "<!DOCTYPE html><html><body><strong>Safe text</strong></body></html>"
    Then the Canvas code card should use "html" and render markup as text

  Scenario: Open a code card in an independent text tab
    When I add a Canvas code card containing "{\"source\":\"canvas\"}"
    And I open the Canvas code card in a text tab
    And I edit the opened code tab and return to the Canvas
    Then the Canvas code card should be unchanged
