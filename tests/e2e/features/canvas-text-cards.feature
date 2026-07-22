Feature: Canvas text cards

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"
    And I create a new Canvas

  Scenario: Create and edit a text card durably
    When I add a Canvas text card containing "Durable canvas note"
    And I wait for the Canvas scene to be saved
    And I refresh the page
    Then the Canvas should contain a text card with "Durable canvas note"

  Scenario: Move and resize a text card durably
    When I add a Canvas text card containing "Geometry survives"
    And I wait for the Canvas scene to be saved
    And I move and resize the Canvas text card
    And I wait for the Canvas scene to be saved
    And I remember the Canvas text card bounds
    And I refresh the page
    Then the Canvas text card should have the remembered bounds

  Scenario: Delete the only text card durably
    When I add a Canvas text card containing "Delete this note"
    And I wait for the Canvas scene to be saved
    And I delete the Canvas text card
    And I wait for the Canvas scene to be saved
    And I refresh the page
    Then I should see an empty Canvas
    And the Canvas should not contain any cards
