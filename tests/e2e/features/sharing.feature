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

  Scenario: Trim large JSON content before sharing
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "keep_me": "small",
        "remove_me": "this is a very long string that will take up a lot of space in the URL if we keep it. it needs to be long enough to exceed the 1800 character limit of the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. ADDDING MORE UNIQUE DATA TO BREAK COMPRESSION: ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*() _+ [] {} | ; : , . / < > ? ~ ` RANDOM DATA 1: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 2: 0123456789 0123456789 0123456789 RANDOM DATA 3: !@#$%^&*() !@#$%^&*() !@#$%^&*() RANDOM DATA 4: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 5: 0123456789 0123456789 0123456789 RANDOM DATA 6: !@#$%^&*() !@#$%^&*() !@#$%^&*() RANDOM DATA 7: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 8: 0123456789 0123456789 0123456789 RANDOM DATA 9: !@#$%^&*() !@#$%^&*() !@#$%^&*() RANDOM DATA 10: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 11: 0123456789 0123456789 0123456789 RANDOM DATA 12: !@#$%^&*() !@#$%^&*() !@#$%^&*() RANDOM DATA 13: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 14: 0123456789 0123456789 0123456789"
      }
      """
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    And the JSON trim UI should be visible
    And the JSON key "remove_me" should be "unselected"
    And the JSON key "keep_me" should be "selected"
    And the budget bar should show the max of "1740" characters
    When I copy the share URL from the modal
    And I open the share URL in a new browser instance
    Then the new browser instance should have a tab with JSON content
    And the new browser instance tab content should contain "keep_me"
    And the new browser instance tab content should not contain "this is a very long string"
