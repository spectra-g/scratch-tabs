@xml
Feature: XML Smart View
  Background:
    Given I am on the homepage

  Scenario: Valid XML renders the structure tree and validity badge
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      <catalog>
        <book id="bk101">
          <author>Gambardella, Matthew</author>
          <title>XML Developer Guide</title>
          <price>44.95</price>
        </book>
        <book id="bk102">
          <author>Ralls, Kim</author>
          <title>Midnight Rain</title>
          <price>5.95</price>
        </book>
      </catalog>
      """
    Then the status bar language should be "XML"
    When I click the Smart View button
    Then I should see the XML Smart View
    And the XML Smart View should contain "Valid XML"
    And the XML Smart View should contain "catalog"
    And the XML Smart View should contain "book"

  Scenario: Malformed XML shows invalid state and diagnostics
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      <?xml version="1.0"?>
      <root>
        <unclosed>
      </root>
      """
    Then the status bar language should be "XML"
    When I click the Smart View button
    Then I should see the XML Smart View
    And the XML Smart View should contain "Invalid XML"

  Scenario: Format button pretty-prints the XML in the editor
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      <?xml version="1.0"?><root><item id="1">Alpha</item><item id="2">Beta</item></root>
      """
    Then the status bar language should be "XML"
    When I click the Smart View button
    Then I should see the XML Smart View
    And the XML Smart View should contain "Valid XML"
    When I click the XML toolbar button "Format"
    Then the active editor content should contain "  <item"

  Scenario: XML to JSON conversion opens a background tab
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      <?xml version="1.0"?>
      <person id="42"><name>Ada Lovelace</name></person>
      """
    Then the status bar language should be "XML"
    When I click the Smart View button
    Then I should see the XML Smart View
    And the XML Smart View should contain "Valid XML"
    When I click the XML toolbar button "JSON"
    Then the "Converted XML.json" tab should exist and not be active

  Scenario: XPath workbench is accessible and shows the default expression result
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      <?xml version="1.0"?>
      <inventory>
        <item sku="A1">Widget</item>
        <item sku="B2">Gadget</item>
      </inventory>
      """
    Then the status bar language should be "XML"
    When I click the Smart View button
    Then I should see the XML Smart View
    When I click the XML bottom tab "XPath"
    Then the XML XPath workbench should be visible
    And the XML Smart View should contain "inventory"
