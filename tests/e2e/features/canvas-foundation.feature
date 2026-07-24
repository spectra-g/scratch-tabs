Feature: Canvas foundation

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"

  Scenario: Create and restore an empty Canvas
    When I create a new Canvas
    Then I should see an empty Canvas
    And the Canvas should be saved locally
    When I wait for the state to be saved
    And I refresh the page
    Then I should see the same active empty Canvas

  Scenario: Close an empty Canvas and remove its document
    When I create a new Canvas
    Then I should see an empty Canvas
    When I remember the active Canvas document
    And I click the close button on the "Canvas 1" tab
    And I wait for the state to be saved
    And I refresh the page
    Then the "Canvas 1" tab should not exist on the page
    And the remembered Canvas document should be deleted

  Scenario: A normal text tab still works after opening a Canvas
    When I create a new Canvas
    Then I should see an empty Canvas
    When I click the icon for "New tab"
    And I type "legacy text remains editable" into the editor
    Then the active editor content should contain "legacy text remains editable"

  Scenario: A narrow viewport does not initialize the Canvas renderer
    When I resize to a narrow Canvas viewport
    And I create a new Canvas
    Then I should see the Canvas desktop-only notice

