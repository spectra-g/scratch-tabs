@sharing
Feature: Tab Sharing

  Background:
    Given I am on the homepage

  Scenario: Open share modal from context menu
    When I click the icon for "New tab"
    And I type "Hello from shared tab" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    And the share modal should show the tab title "Scratch 1"

  Scenario: Share modal displays URL for small content
    When I click the icon for "New tab"
    And I type "Small content" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    And the shareable URL input should be visible
    And the shareable URL input should contain "#/s/v1/"

  Scenario: Copy share URL and verify clipboard
    When I click the icon for "New tab"
    And I type "Content to share" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    When I click the "Copy" button in the share modal
    Then the clipboard should contain "#/s/v1/"

  Scenario: Close share modal
    When I click the icon for "New tab"
    And I type "Test content" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    When I close the share modal
    Then the share modal should not be visible

    @sharing-bug
  Scenario: Open shared tab from link in new browser instance
    When I click the icon for "New tab"
    And I type "This is shared content from the original tab" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    When I copy the share URL from the modal
    And I open the share URL in a new browser instance
    Then the new browser instance should have a tab with content "This is shared content from the original tab"

  Scenario: Shared tab appears in correct browser tab when app already open
    When I click the icon for "New tab"
    And I type "Content for multi-tab share test" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    When I copy the share URL from the modal
    And I close the share modal
    And I open the share URL in a new browser tab
    Then the new browser tab should show the shared content
    And the new browser tab should have a tab with content "Content for multi-tab share test"

  Scenario: Share JSON content
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "name": "Test",
        "value": 123
      }
      """
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    When I copy the share URL from the modal
    And I open the share URL in a new browser instance
    Then the new browser instance should have a tab with JSON content
    And the new browser instance tab content should contain "Test"
    And the new browser instance tab content should contain "123"

  Scenario: Share modal shows correct tab title
    When I click the icon for "New tab"
    And I type "Test" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Rename" from the context menu
    And I type "My Custom Tab" in the rename input
    And I press Enter to confirm rename
    And I right-click the "My Custom Tab" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    And the share modal should show the tab title "My Custom Tab"

  Scenario: Cannot share a tablet
    When I click the icon for "New tablet"
    And I select "Calculator" from the tablet selector
    And I right-click the "Calculator" tab
    Then the context menu should not show "Share" option
