@tablets
Feature: Tablets Smoke Tests
  As a user
  I want to verify that all tablets load and work correctly
  So that I can use them for various utilities

  Background:
    Given I am on the homepage

  Scenario: Calculator tablet loads successfully
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Calculator" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Calculator" tab should exist on the page
    And I should see a calculator interface
    And I should see calculator mode selector
    And I should see number buttons in calculator

  Scenario: UUID Generator tablet loads and generates UUIDs
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "UUID Generator" from the tablet selector
    And I wait for the tablet to be ready
    Then the "UUID Generator" tab should exist on the page
    # Verify UUID generator UI is loaded
    Then I should see the UUID generator interface
    # Generate a UUID
    When I click the generate UUID button
    Then I should see at least one generated UUID in the list

  Scenario: Base64 tablet loads and encodes text
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    When I click on Base64 tool card in selector
    And I wait for the page to stabilize
    Then I should see the Base64 encoder interface
    When I type "Hello World" into the Base64 input
    Then the Base64 output should contain "SGVsbG8gV29ybGQ="
