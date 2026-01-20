@pipeline
Feature: Transformations Pipeline
  As a user working with text data
  I want to use the Pipeline feature to chain multiple operations
  So that I can transform content through a series of steps

  Background:
    Given I am on the homepage

  # ========== BASIC PIPELINE OPERATIONS ==========

  @pipeline @core
  Scenario: Open Pipeline modal and verify initial state
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    Then the Pipeline modal should be visible
    And the pipeline should be empty

  @pipeline @core
  Scenario: Use a core text operation - Uppercase
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I wait for the pipeline to execute
    Then the pipeline should have 1 steps
    And the pipeline output should be "HELLO WORLD"
    And the pipeline output should show as modified

  @pipeline @core
  Scenario: Use a core text operation - Trim Lines
    When I click the icon for "New tab"
    And I type "  hello world  " into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Trim Lines" operation
    And I wait for the pipeline to execute
    Then the pipeline output should be "hello world"

  # ========== FORMAT OPERATIONS (JSON) ==========

  @pipeline @format
  Scenario: Use a JSON format operation - Format JSON
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {"name":"John","age":30}
      """
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Format JSON" operation
    And I wait for the pipeline to execute
    Then the pipeline output should contain "name"
    And the pipeline output should show as modified

  @pipeline @format
  Scenario: Use a JSON format operation - Minify JSON
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "name": "John",
        "age": 30
      }
      """
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Minify JSON" operation
    And I wait for the pipeline to execute
    Then the pipeline output should contain "{"
    And the pipeline output should show as modified

  # ========== TABLET OPERATIONS (Base64) ==========

  @pipeline @tablet
  Scenario: Use a tablet operation - Base64 Encode
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Base64 Encode" operation
    And I wait for the pipeline to execute
    Then the pipeline output should be "aGVsbG8="
    And the pipeline output should show as modified

  @pipeline @tablet
  Scenario: Use a tablet operation - Base64 Decode
    When I click the icon for "New tab"
    And I type "aGVsbG8=" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Base64 Decode" operation
    And I wait for the pipeline to execute
    Then the pipeline output should be "hello"

  # ========== APPLY PER LINE ==========

  @pipeline @apply-per-line
  Scenario: Apply operation per line ON - Base64 encode each line separately
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      hello
      world
      """
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Base64 Encode" operation
    And I toggle Apply per line for the current step
    And I wait for the pipeline to execute
    Then the pipeline output should contain "aGVsbG8="
    And the pipeline output should contain "d29ybGQ="

  @pipeline @apply-per-line
  Scenario: Apply operation per line OFF - Base64 encode entire content
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      hello
      world
      """
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Base64 Encode" operation
    And I wait for the pipeline to execute
    Then the pipeline output should contain "aGVsbG8Kd29ybGQ="

  # ========== SAVE AND LOAD PIPELINE ==========

  @pipeline @save-load
  Scenario: Save a pipeline and load it on another tab
    # Create and save a pipeline on first tab
    When I click the icon for "New tab"
    And I type "test content" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Trim Lines" operation
    And I wait for the pipeline to execute
    And I save the pipeline as "My Test Pipeline"
    Then the pipeline name should be displayed as "My Test Pipeline"
    When I close the Pipeline modal

    # Create new tab and load the saved pipeline
    And I click the icon for "New tab"
    And I type "another test" into the editor
    And I right-click the "Scratch 2" tab
    And I select "Pipeline" from the context menu
    And I load the saved pipeline "My Test Pipeline"
    And I wait for the pipeline to execute
    # Verify the loaded pipeline works - output proves both operations loaded
    Then the pipeline output should be "ANOTHER TEST"

  @pipeline @save-load
  Scenario: Saved pipeline persists after page refresh
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I save the pipeline as "Persist Test"
    When I close the Pipeline modal
    And I wait for the state to be saved
    And I refresh the page
    And I wait for the application to load
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    Then the saved pipeline "Persist Test" should exist

  # ========== LONG PIPELINE (MANY STEPS) ==========

  @pipeline @long-pipeline
  Scenario: Create a long pipeline with 10 operations
    When I click the icon for "New tab"
    And I type "hello world test data" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    # Add 10 operations to create a long pipeline
    And I add the "Trim Lines" operation
    And I add the "Uppercase" operation
    And I add the "Lowercase" operation
    And I add the "Title Case" operation
    And I add the "Uppercase" operation
    And I add the "Lowercase" operation
    And I add the "Trim Lines" operation
    And I add the "Uppercase" operation
    And I add the "Lowercase" operation
    And I add the "Trim Lines" operation
    And I wait for the pipeline to execute
    Then the pipeline should have 10 steps
    And the pipeline should show success message

  # ========== CHAINED OPERATIONS ==========

  @pipeline @chained
  Scenario: Chain multiple operations - Trim, Uppercase, Base64 Encode
    When I click the icon for "New tab"
    And I type "  hello world  " into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Trim Lines" operation
    And I add the "Uppercase" operation
    And I add the "Base64 Encode" operation
    And I wait for the pipeline to execute
    Then the pipeline should have 3 steps
    # "HELLO WORLD" in Base64
    And the pipeline output should be "SEVMTE8gV09STEQ="

  @pipeline @chained
  Scenario: Chain core, format, and tablet operations together
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {"message": "hello world"}
      """
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Minify JSON" operation
    And I add the "Base64 Encode" operation
    And I wait for the pipeline to execute
    Then the pipeline should have 2 steps
    And the pipeline output should show as modified

  # ========== ERROR HANDLING ==========

  @pipeline @error
  Scenario: Invalid JSON input for Format JSON operation shows error
    When I click the icon for "New tab"
    And I type "this is not json" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Format JSON" operation
    And I wait for the pipeline to execute
    Then the pipeline should show an error
    And the pipeline footer should show error state

  @pipeline @error
  Scenario: Invalid Base64 input for decode operation shows error
    When I click the icon for "New tab"
    And I type "!!!not-base64!!!" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Base64 Decode" operation
    And I wait for the pipeline to execute
    Then the pipeline should show an error

  @pipeline @error
  Scenario: JavaScript snippet with syntax error shows error in output
    When I click the icon for "New tab"
    And I type "test" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "JavaScript Snippet" operation
    And I set parameter "JavaScript Code" to "return invalid syntax {"
    And I wait for the pipeline to execute
    # JavaScript errors are caught and returned as output, not pipeline errors
    Then the pipeline output should contain "Error in script"

  # ========== STEP MANAGEMENT ==========

  @pipeline @step-management
  Scenario: Disable a step skips its execution
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Base64 Encode" operation
    And I wait for the pipeline to execute
    # Both steps enabled - output is Base64 of "HELLO"
    Then the pipeline output should be "SEVMTE8="
    # Disable the first step
    When I toggle step 1 enabled state
    And I wait for the pipeline to execute
    # Only Base64 encode runs on "hello"
    Then the pipeline output should be "aGVsbG8="

  @pipeline @step-management
  Scenario: Remove a step from the pipeline
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Trim Lines" operation
    And I wait for the pipeline to execute
    Then the pipeline should have 2 steps
    When I remove step 2
    Then the pipeline should have 1 steps

  @pipeline @step-management
  Scenario: Reset pipeline clears all steps
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Trim Lines" operation
    And I add the "Base64 Encode" operation
    Then the pipeline should have 3 steps
    When I reset the pipeline
    Then the pipeline should be empty

  # ========== APPLY CHANGES ==========

  @pipeline @apply
  Scenario: Apply changes updates the editor content
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I wait for the pipeline to execute
    Then the Apply Changes button should be enabled
    When I apply the pipeline changes
    Then the Pipeline modal should not be visible
    And the active editor content should be "HELLO WORLD"

  @pipeline @apply
  Scenario: Apply button is disabled when no changes
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    Then the pipeline should be empty
    And the Apply Changes button should be disabled

  # ========== INPUT MODIFICATION ==========

  @pipeline @input
  Scenario: Modify input in pipeline modal
    When I click the icon for "New tab"
    And I type "original content" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I set the pipeline input to "new content"
    And I wait for the pipeline to execute
    Then the pipeline output should be "NEW CONTENT"

  # ========== SEARCH OPERATIONS ==========

  @pipeline @search
  Scenario: Search for operations filters the list
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I search for operation "base64"
    And I add the "Base64 Encode" operation
    And I wait for the pipeline to execute
    Then the pipeline output should be "aGVsbG8="

  # ========== PARAMETERS ==========

  @pipeline @parameters
  Scenario: Operation with parameters - Keep First N Lines
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      line1
      line2
      line3
      line4
      line5
      """
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Keep First N Lines" operation
    And I set number parameter "Number of lines" to 2
    And I wait for the pipeline to execute
    Then the pipeline output should contain "line1"
    And the pipeline output should contain "line2"

  @pipeline @parameters
  Scenario: Operation with parameters - Add Prefix
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      line1
      line2
      """
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Add Prefix" operation
    And I set parameter "Prefix" to ">> "
    And I toggle Apply per line for the current step
    And I wait for the pipeline to execute
    Then the pipeline output should contain ">> line1"
    And the pipeline output should contain ">> line2"

  @pipeline @parameters
  Scenario: Operation with select parameter - Sort Lines
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      banana
      apple
      cherry
      """
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Sort Lines (A-Z)" operation
    And I wait for the pipeline to execute
    Then the pipeline output should be:
      """
      apple
      banana
      cherry
      """

  # ========== CANCEL ==========

  @pipeline @cancel
  Scenario: Cancel closes the modal without applying changes
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I wait for the pipeline to execute
    When I click Cancel in the Pipeline modal
    Then the Pipeline modal should not be visible
    # Original content unchanged
    And the active editor content should be "hello"

  # ========== EXECUTION STATS ==========

  @pipeline @stats
  Scenario: Execution stats are displayed after running pipeline
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Trim Lines" operation
    And I add the "Base64 Encode" operation
    And I wait for the pipeline to execute
    Then the execution time should be displayed
    And the pipeline should show success message
