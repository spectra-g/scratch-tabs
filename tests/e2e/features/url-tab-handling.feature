Feature: URL Tab Handling

  Background:
    Given I am on the homepage
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Content for Scratch 1
      This is some test content for the first tab.
      """
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Content for Scratch 2
      This is some test content for the second tab.
      """
    When I click the icon for "New tablet"
    And I select "Calculator" from the tablet selector
    And I wait for the tablet to be ready
    When I click the icon for "New tablet"
    And I select "Password Generator" from the tablet selector
    And I wait for the tablet to be ready
    When I click the "Scratch 2" tab
    Then the "Scratch 2" tab should be active
    And the active editor content should contain "Content for Scratch 2"

  @smoke
  Scenario: Refreshing the page preserves active tab state
    When I refresh the page
    And I wait for the application to load
    Then the "Scratch 2" tab should be active
    And the active editor content should contain "Content for Scratch 2" 