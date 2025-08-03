@please-fix
Feature: Json content processing

  Background:
    Given I am on the homepage

  Scenario: Clean and format stringified json
    When I set clipboard content to ""{\"name\":\"John Doe\",\"age\":30,\"isStudent\":false,\"courses\":[{\"id\":1,\"name\":\"History\"},{\"id\":2,\"name\":\"Math\"}]}""
    And I click the icon for "New tab with contents from clipboard"
    Then the "Welcome to Scratch Tabs" tab should exist and not be active
    And the "Scratch 1" tab should be active
    And the active editor content should be:
      """
{
  "name": "John Doe",
  "age": 30,
  "isStudent": false,
  "courses": [
    { "id": 1, "name": "History" },
    { "id": 2, "name": "Math" }
  ]
}
      """
    And the status bar language should be "JSON"
    And the status bar should show a green validation tick