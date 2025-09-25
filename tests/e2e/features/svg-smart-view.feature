Feature: SVG Smart View
  As a user working with SVG content
  I want to select SVG content from the sample menu and preview it in Smart View
  So that I can visualize SVG content effectively

  Background:
    Given I am on the homepage

  Scenario: SVG content from sample shows Smart View preview
    When I click the icon for "New tab"
    And I right-click the "Scratch 1" tab
    And I select "From sample" from the context menu
    When I select "SVG" from the "From sample" submenu
    Then the status bar language should be "SVG"
    When I click the Smart View button
    Then I should see the SVG Smart View
    And the SVG preview should be visible