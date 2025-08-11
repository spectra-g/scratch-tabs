Feature: Workspace Switching

  Scenario: Create and switch workspaces with tab isolation
    Given I am on the homepage
    When I click the icon for "New tab"
    Then the "Default Workspace" workspace should be visible
    # Add content to a tab in Default Workspace to make it unique
    When I type the following content into the active editor:
      """
      This is content from Default Workspace
      Some unique data that should only exist here
      """
    And I double-click on the active tab
    And I type "Default Tab" in the rename input
    And I press Enter to confirm rename
    Then the "Default Tab" tab should exist on the page
    # Switch to new workspace
    When I click the workspace switcher
    And I click the "New workspace" button
    And I type "New Workspace" into the workspace name input
    And I click the "Create" button
    Then the "New Workspace" workspace should be visible
    And the "Default Workspace" workspace should not be visible
    # Verify that tabs from Default Workspace don't appear in New Workspace
    And the "Default Tab" tab should not exist on the page
    # Verify we start with new tabs in the new workspace
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      This is content from New Workspace
      Different data that should only exist in this workspace
      """
    And I double-click on the active tab
    And I type "New Workspace Tab" in the rename input
    And I press Enter to confirm rename
    Then the "New Workspace Tab" tab should exist on the page
    # Switch back to Default Workspace to verify isolation
    When I click the workspace switcher
    And I click on workspace "Default Workspace"
    Then the "Default Workspace" workspace should be visible
    And the "Default Tab" tab should exist on the page
    And the "New Workspace Tab" tab should not exist on the page
    And the active editor content should contain "This is content from Default Workspace"
