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

  Scenario: Password Generator tablet loads and generates passwords
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Password Generator" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Password Generator" tab should exist on the page
    And I should see the password generator interface
    And I should see a generated password
    When I click the regenerate password button
    Then I should see a different generated password

  Scenario: Lorem Ipsum Generator tablet loads and generates text
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Lorem Ipsum Generator" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Lorem Ipsum Generator" tab should exist on the page
    And I should see the lorem ipsum generator interface
    And I should see generated lorem ipsum text

  Scenario: Cron Expression Builder tablet loads and parses expressions
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Cron Expression Builder" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Cron Expression Builder" tab should exist on the page
    And I should see the cron builder interface
    And I should see next execution times

  Scenario: Word Count tablet loads and counts text
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Word Count" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Word Count" tab should exist on the page
    And I should see the word count interface
    When I type "Hello world this is a test" into the word count input
    Then the word count should show "6" words

  Scenario: URL Parser tablet loads and parses URLs
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "URL Parser" from the tablet selector
    And I wait for the tablet to be ready
    Then the "URL Parser" tab should exist on the page
    And I should see the URL parser interface
    When I type "https://example.com:8080/path?query=value#hash" into the URL input
    Then the URL parser should show host "example.com"
    And the URL parser should show port "8080"

  Scenario: Checksum tablet loads and calculates hashes
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Checksum" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Checksum" tab should exist on the page
    And I should see the checksum interface
    When I type "test" into the checksum text input
    Then I should see a calculated hash

  Scenario: Colour Palette tablet loads and generates colors
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Colour Palette" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Colour Palette" tab should exist on the page
    And I should see the colour palette interface
    And I should see color swatches

  Scenario: Converter tablet loads with conversion sections
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Converter" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Converter" tab should exist on the page
    And I should see the converter interface
    And I should see converter section buttons

  Scenario: Date & Time tablet loads and shows current time
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Date & Time" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Date & Time" tab should exist on the page
    And I should see the date time interface
    And I should see current time display

  Scenario: Emoji as Data tablet loads and displays emojis
    When I click the icon for "New tab"
    And I click the icon for "New tablet"
    And I select "Emoji as Data" from the tablet selector
    And I wait for the tablet to be ready
    Then the "Emoji as Data" tab should exist on the page
    And I should see the emoji picker interface
    And I should see emoji grid
