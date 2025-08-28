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

  Scenario: Rich text toolbar formatting controls
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "This text will be formatted" in the Rich Text editor
    And I select the text "text will be"
    And I click the "Bold" button in the Rich Text toolbar
    Then the selected text should be bold in the Rich Text editor
    When I select the text "will be"
    And I click the "Italic" button in the Rich Text toolbar
    Then the selected text should be italic in the Rich Text editor
    When I select the text "be"
    And I click the "Inline Code" button in the Rich Text toolbar
    Then the selected text should be inline code in the Rich Text editor

  Scenario: Rich text toolbar list and quote controls
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "First item" in the Rich Text editor
    And I click the "Bullet List" button in the Rich Text toolbar
    Then I should see a bullet list in the Rich Text editor
    When I press Enter and type "Second item"
    Then I should see "Second item" as the next bullet point
    When I press Enter and click the "Numbered List" button in the Rich Text toolbar
    And I type "Numbered item"
    Then I should see a numbered list in the Rich Text editor
    When I press Enter twice
    And I click the "Quote" button in the Rich Text toolbar
    And I type "This is a quote"
    Then I should see a blockquote in the Rich Text editor

  Scenario: Rich text toolbar advanced controls
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "Code example:" in the Rich Text editor
    And I click the "Code Block" button in the Rich Text toolbar
    And I type "console.log('Hello World');" in the code block
    Then I should see a code block in the Rich Text editor
    When I click after the code block
    And I click the "Insert Table" button in the Rich Text toolbar
    Then I should see a table with 3 rows and 3 columns in the Rich Text editor
    When I type "Background test" in the Rich Text editor
    And I click the "Background" button in the Rich Text toolbar
    Then the background texture should change