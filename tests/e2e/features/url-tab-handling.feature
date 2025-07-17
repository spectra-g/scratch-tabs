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
    When I wait for 1 second
    When I click the icon for "New tablet"
    And I select "Password Generator" from the tablet selector
    When I click the "Scratch 2" tab
    Then the "Scratch 2" tab should be active
    And the active editor content should contain "Content for Scratch 2"

  Scenario: Refreshing the page lands back on the active tab
    When I refresh the page
    Then the "Scratch 2" tab should be active
    And the active editor content should contain "Content for Scratch 2" 