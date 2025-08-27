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

  Scenario: Rich Text editors in split view maintain content isolation
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    And I type "Left Side Content" in the Rich Text editor
    When I click the icon for "New tab"
    And I click the Rich Text toggle in the status bar
    And I type "Right Side Content" in the Rich Text editor
    When I split the tab to create a side-by-side view
    Then the left side Rich Text editor should contain "Left Side Content"
    And the right side Rich Text editor should contain "Right Side Content"
    And the left side Rich Text editor should not contain "Right Side Content"
    And the right side Rich Text editor should not contain "Left Side Content"

  Scenario: Toggling between Rich Text and standard text maintains separate content
    Given I am on a plain text editor tab
    When I type "This is plain text content" in the Monaco editor
    Then the Monaco editor should contain "This is plain text content"
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "This is rich text content" in the Rich Text editor
    Then the Rich Text editor should contain the text "This is rich text content"
    When I click the Rich Text toggle in the status bar
    Then I should see the Monaco editor is displayed
    And the Monaco editor should contain "This is plain text content"
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And the Rich Text editor should contain the text "This is rich text content"

  Scenario: Image paste creates rich text tab with proper title and content
    When I set clipboard content to contain an image
    And I click the icon for "New tab with contents from clipboard"
    Then the "Scratch 2" tab should be active
    And I should see the Rich Text editor is displayed
    And the Rich Text editor should contain an image
    And I should see the date created text with "now" time

  Scenario: Plain text to rich text conversion when pasting image
    Given I am on a plain text editor tab
    When I type "This is plain text content" in the Monaco editor
    Then the Monaco editor should contain "This is plain text content"
    When I set clipboard content to contain an image
    And I paste into the editor
    Then I should see the rich text conversion modal with "Convert to Rich Text?" title
    And the modal should contain "It looks like you've pasted an image"
    When I click "Convert to Rich Text" in the modal
    Then the modal should be dismissed
    And I should see the Rich Text editor is displayed
    And the Rich Text editor should contain an image
    And the Rich Text editor should contain the text "This is plain text content"
    And I should see the date created text with "now" time