Feature: Format Popup Search Functionality
  As a user
  I want to search and filter formats in the format selection popup
  So that I can quickly find and select the format I need

  Background:
    Given I am on the scratch tabs application
    And I create a new tab with content "hello world"

  Scenario: Open format popup and see search input
    When I click on the format selector in the status bar
    Then I should see the format selection popup
    And I should see a search input with placeholder "Search formats..."
    And the search input should be focused

  Scenario: Search for a specific format
    When I click on the format selector in the status bar
    And I type "json" in the format search input
    Then I should see only formats containing "json" in the results
    And I should not see formats that don't contain "json"

  Scenario: Search with no results
    When I click on the format selector in the status bar
    And I type "nonexistentformat" in the format search input
    Then I should see "No formats found" message
    And I should not see any format options

  Scenario: Clear search shows all formats
    When I click on the format selector in the status bar
    And I type "json" in the format search input
    Then I should see only formats containing "json" in the results
    When I clear the format search input
    Then I should see all available formats

  Scenario: Case insensitive search
    When I click on the format selector in the status bar
    And I type "JSON" in the format search input
    Then I should see only formats containing "json" in the results

  Scenario: Select format from search results
    When I click on the format selector in the status bar
    And I type "json" in the format search input
    And I click on "JSON" in the search results
    Then the format popup should close
    And the tab format should be set to "JSON"