Feature: Canvas search indexing and item navigation
  As a developer working across spatial documents
  I want global search to find individual Canvas cards
  So that I can return to matching material in context

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"
    And I create a new Canvas

  Scenario: Find every shipping Canvas card type
    When I create searchable Canvas cards
    Then every Canvas card type should appear in global search

  Scenario: Open an offscreen Canvas item result in context
    When I place a searchable Canvas card offscreen
    And I activate its global search result
    Then the searched Canvas card should be visible, selected, and focused

  Scenario: Remove stale results after card edits and deletion
    When I edit and delete indexed Canvas content
    Then stale Canvas search results should disappear

  Scenario: Search another workspace without reading Canvas assets
    Given another workspace has searchable Canvas metadata
    When I search all workspaces for that Canvas metadata
    Then global search should not read Canvas asset blobs
