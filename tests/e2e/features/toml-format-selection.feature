Feature: TOML format selection
  As a user
  I want to select TOML from the format selector
  So that I can work with TOML content explicitly

  Background:
    Given I am on the scratch tabs application
    And I create a new tab with content "hello world"

  Scenario: Search finds TOML in the format selector
    When I click on the format selector in the status bar
    And I type "TOML" in the format search input
    Then I should see "TOML" in the format results

  Scenario: Selecting TOML updates the status bar label
    When I click on the format selector in the status bar
    And I type "TOML" in the format search input
    And I click on "TOML" in the search results
    Then the format popup should close
    And the tab format should be set to "TOML"

  Scenario: Reopening the selector shows TOML as selected
    When I click on the format selector in the status bar
    And I type "TOML" in the format search input
    And I click on "TOML" in the search results
    And I click on the format selector in the status bar
    Then "TOML" should be marked as the selected format
