Feature: Tab Management

  Scenario: Create a new tab and verify its content
    Given I am on the homepage
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "hello": "world"
      """
    Then the active editor content should be:
      """
      {
            "hello": "world"
      }
      """
    And the tab with title "Scratch 1" should be active 