@new-feature
Feature: Rich Text Editor

  Background:
    Given I am on the homepage
    When I click the icon for "New tab"

  Scenario: Activate Rich Text editor and verify functionality
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And I should see the date created text with "now" time
    When I type "Hello Rich Text World" in the Rich Text editor
    Then I should see at least one paragraph in the Rich Text editor
    And the Rich Text editor should contain the text "Hello Rich Text World"
    And the Rich Text toggle should show "Rich" text