Feature: OpenAPI Smart View
  Background:
    Given I am on the homepage

  Scenario: OpenAPI spec renders endpoint, response, and schema details
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      openapi: 3.1.0
      info:
        title: Acme Orders API
        version: 1.0.0
      servers:
        - url: https://api.acme.test/v1
      paths:
        /orders:
          post:
            operationId: createOrder
            summary: Create order
            requestBody:
              required: true
              content:
                application/json:
                  schema:
                    $ref: "#/components/schemas/CreateOrderRequest"
            responses:
              "201":
                description: Created
                content:
                  application/json:
                    schema:
                      $ref: "#/components/schemas/Order"
              "401":
                description: Unauthorized
                content:
                  application/json:
                    schema:
                      $ref: "#/components/schemas/ErrorResponse"
      components:
        schemas:
          CreateOrderRequest:
            type: object
            required: [sku]
            properties:
              sku:
                type: string
              profile:
                $ref: "#/components/schemas/UserProfile"
          UserProfile:
            type: object
            properties:
              username:
                type: string
          Order:
            type: object
            properties:
              id:
                type: string
          ErrorResponse:
            type: object
            properties:
              message:
                type: string
      """
    Then the status bar should show language "OpenAPI"
    When I click the Smart View button
    Then I should see the OpenAPI Smart View
    And the OpenAPI Smart View should contain "Acme Orders API"
    When I select the OpenAPI endpoint "POST" "/orders"
    Then the OpenAPI endpoint detail should contain "Create order"
    And the OpenAPI endpoint detail should contain "CreateOrderRequest"
    When I select the OpenAPI response "401"
    Then the OpenAPI endpoint detail should contain "Unauthorized"
    And the OpenAPI endpoint detail should contain "ErrorResponse"
    When I open the OpenAPI schema "CreateOrderRequest"
    Then I should see the OpenAPI schema detail for "CreateOrderRequest"
    And the OpenAPI schema example should contain "username"
