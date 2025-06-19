import { Template } from '../types';

export const defaultTemplates: Template[] = [
  {
    id: 'template-prd',
    title: 'Product Requirements Document (PRD)',
    description: 'A comprehensive document outlining the purpose, features, and functionality of a product.',
    category: 'Product',
    content: `# Product Requirements Document: [Product Name]

## Overview
[Brief description of the product and its purpose]

## Problem Statement
[Describe the problem this product aims to solve]

## Target Users
[Describe the primary users of this product]

## User Stories
- As a [type of user], I want to [action] so that [benefit]
- As a [type of user], I want to [action] so that [benefit]
- As a [type of user], I want to [action] so that [benefit]

## Features and Requirements
### Must-Have Features
1. [Feature 1]
   - [Requirement 1.1]
   - [Requirement 1.2]
2. [Feature 2]
   - [Requirement 2.1]
   - [Requirement 2.2]

### Nice-to-Have Features
1. [Feature 1]
2. [Feature 2]

## Non-Functional Requirements
- Performance: [Requirements]
- Security: [Requirements]
- Usability: [Requirements]
- Reliability: [Requirements]

## Constraints
[List any technical, business, or other constraints]

## Success Metrics
[Define how success will be measured]

## Timeline
[Outline the development timeline and milestones]

## Appendix
[Any additional information, diagrams, or references]`,
    isBuiltIn: true
  },
  {
    id: 'template-srs',
    title: 'Software Requirements Specification (SRS)',
    description: 'A detailed document specifying the requirements for a software system.',
    category: 'Development',
    content: `# Software Requirements Specification

## 1. Introduction
### 1.1 Purpose
[Describe the purpose of this document]

### 1.2 Scope
[Define the scope of the software system]

### 1.3 Definitions, Acronyms, and Abbreviations
[List any terms, acronyms, or abbreviations used in the document]

## 2. Overall Description
### 2.1 Product Perspective
[Describe how the product fits into the larger system or context]

### 2.2 Product Functions
[Summarize the major functions of the software]

### 2.3 User Characteristics
[Describe the users of the system]

### 2.4 Constraints
[List any constraints on the system]

### 2.5 Assumptions and Dependencies
[List any assumptions or dependencies]

## 3. Specific Requirements
### 3.1 Functional Requirements
[List and describe all functional requirements]

### 3.2 Non-Functional Requirements
#### 3.2.1 Performance Requirements
[Specify performance requirements]

#### 3.2.2 Security Requirements
[Specify security requirements]

#### 3.2.3 Software Quality Attributes
[Specify quality attributes like reliability, availability, etc.]

## 4. System Features
[Describe each system feature in detail]

## 5. External Interface Requirements
### 5.1 User Interfaces
[Describe user interface requirements]

### 5.2 Hardware Interfaces
[Describe hardware interface requirements]

### 5.3 Software Interfaces
[Describe software interface requirements]

### 5.4 Communications Interfaces
[Describe communications interface requirements]

## 6. Other Requirements
[Any other requirements not covered above]

## Appendix A: Glossary
[Glossary of terms]

## Appendix B: Analysis Models
[Any analysis models, diagrams, etc.]`,
    isBuiltIn: true
  },
  {
    id: 'template-bug-report',
    title: 'Bug Report',
    description: 'A structured report for documenting software bugs.',
    category: 'Development',
    content: `# Bug Report

## Summary
[Brief description of the bug]

## Environment
- **Browser/Device**: [e.g., Chrome 91, iPhone 12]
- **OS**: [e.g., Windows 10, iOS 14.5]
- **Version/Build**: [e.g., v2.3.1]
- **Other relevant environment details**

## Steps to Reproduce
1. [First Step]
2. [Second Step]
3. [Third Step]
4. [and so on...]

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Reproducibility
[How often can you reproduce the bug? Always, Sometimes, Rarely]

## Screenshots/Videos
[If applicable, add screenshots or videos to help explain the problem]

## Additional Context
[Any other information that might be relevant to the bug]

## Possible Fix
[If you have suggestions on how to fix the bug]

## Severity/Priority
[How severe is this bug and what priority should it have?]`,
    isBuiltIn: true
  },
  {
    id: 'template-agent-context',
    title: 'Agent Context',
    description: 'A template for defining the context and capabilities of an AI agent.',
    category: 'AI',
    content: `# Agent Context: [Agent Name]

## Agent Identity
- **Name**: [Agent Name]
- **Role**: [Agent's primary role]
- **Expertise**: [Areas of expertise]
- **Personality**: [Key personality traits]

## Agent Capabilities
- [Capability 1]
- [Capability 2]
- [Capability 3]

## Constraints
- [Constraint 1]
- [Constraint 2]
- [Constraint 3]

## Knowledge Base
- [Knowledge area 1]
- [Knowledge area 2]
- [Knowledge area 3]

## Interaction Guidelines
- **Tone**: [Formal/Informal/Technical/etc.]
- **Response Style**: [Concise/Detailed/Step-by-step/etc.]
- **Error Handling**: [How the agent should handle errors or unknown queries]

## Example Interactions
### Example 1
- **User**: [Example user query]
- **Agent**: [Example agent response]

### Example 2
- **User**: [Example user query]
- **Agent**: [Example agent response]

## Performance Metrics
- [Metric 1]
- [Metric 2]
- [Metric 3]`,
    isBuiltIn: true
  },
  {
    id: 'template-code-review',
    title: 'Code Review',
    description: 'A template for conducting thorough code reviews.',
    category: 'Development',
    content: `# Code Review: [PR/Commit Title]

## Overview
[Brief description of the code being reviewed]

## General Feedback
[Overall assessment of the code]

## Code Quality
- **Readability**: [Assessment]
- **Maintainability**: [Assessment]
- **Performance**: [Assessment]
- **Security**: [Assessment]
- **Testing**: [Assessment]

## Specific Issues

### Issue 1: [Title]
- **Location**: [File/Line number]
- **Severity**: [Critical/Major/Minor/Nitpick]
- **Description**: [Description of the issue]
- **Suggestion**: [Suggested fix]

### Issue 2: [Title]
- **Location**: [File/Line number]
- **Severity**: [Critical/Major/Minor/Nitpick]
- **Description**: [Description of the issue]
- **Suggestion**: [Suggested fix]

## Positive Aspects
- [Positive aspect 1]
- [Positive aspect 2]
- [Positive aspect 3]

## Questions
- [Question 1]
- [Question 2]

## Summary
[Summary of the review and next steps]`,
    isBuiltIn: true
  },
  {
    id: 'template-user-story',
    title: 'User Story',
    description: 'A template for creating user stories in agile development.',
    category: 'Product',
    content: `# User Story: [Story Title]

## Story
As a [type of user],
I want to [action or feature],
So that [benefit or value].

## Acceptance Criteria
1. [Criterion 1]
2. [Criterion 2]
3. [Criterion 3]

## Technical Notes
[Any technical details or implementation notes]

## Dependencies
[Any dependencies on other stories, features, or systems]

## Effort Estimation
[Story points or time estimate]

## Definition of Done
- [ ] Code implemented
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Acceptance criteria met
- [ ] Product owner approval`,
    isBuiltIn: true
  },
  {
    id: 'template-technical-spec',
    title: 'Technical Specification',
    description: 'A detailed technical specification for a software component or feature.',
    category: 'Development',
    content: `# Technical Specification: [Feature/Component Name]

## Overview
[Brief description of the feature or component]

## Goals and Non-Goals
### Goals
- [Goal 1]
- [Goal 2]

### Non-Goals
- [Non-Goal 1]
- [Non-Goal 2]

## Background and Context
[Relevant background information and context]

## Detailed Design
### Architecture
[Architectural details, diagrams, etc.]

### Data Model
[Data structures, database schema, etc.]

### API Design
[API endpoints, request/response formats, etc.]

### Business Logic
[Core algorithms, business rules, etc.]

### User Interface
[UI components, interactions, etc.]

## Alternative Approaches
[Alternative approaches considered and why they were rejected]

## Performance Considerations
[Performance requirements, optimizations, etc.]

## Security Considerations
[Security requirements, potential vulnerabilities, etc.]

## Privacy Considerations
[Privacy requirements, data handling, etc.]

## Testing Plan
[How the feature will be tested]

## Rollout Plan
[How the feature will be deployed]

## Monitoring and Alerting
[How the feature will be monitored]

## Future Work
[Potential future enhancements or related work]`,
    isBuiltIn: true
  },
  {
    id: 'template-api-doc',
    title: 'API Documentation',
    description: 'A template for documenting APIs.',
    category: 'Development',
    content: `# API Documentation: [API Name]

## Overview
[Brief description of the API]

## Base URL
\`\`\`
[Base URL]
\`\`\`

## Authentication
[Authentication methods and requirements]

## Rate Limiting
[Rate limiting details]

## Endpoints

### [Endpoint 1]
\`\`\`http
[HTTP Method] [Endpoint Path]
\`\`\`

#### Description
[Description of the endpoint]

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| [param1]  | [type] | [Yes/No] | [Description] |
| [param2]  | [type] | [Yes/No] | [Description] |

#### Request Body
\`\`\`json
{
  "property1": "value1",
  "property2": "value2"
}
\`\`\`

#### Response
\`\`\`json
{
  "property1": "value1",
  "property2": "value2"
}
\`\`\`

#### Status Codes
| Status Code | Description |
|-------------|-------------|
| 200 | [Description] |
| 400 | [Description] |
| 401 | [Description] |
| 404 | [Description] |
| 500 | [Description] |

#### Example
\`\`\`curl
curl -X [METHOD] "[BASE_URL][ENDPOINT]" \\
  -H "Authorization: Bearer [TOKEN]" \\
  -H "Content-Type: application/json" \\
  -d '{
    "property1": "value1",
    "property2": "value2"
  }'
\`\`\`

### [Endpoint 2]
[Repeat the structure for each endpoint]

## Error Handling
[How errors are returned and what they mean]

## Versioning
[API versioning information]

## Changelog
[Recent changes to the API]`,
    isBuiltIn: true
  },
  {
    id: 'template-feature-request',
    title: 'Feature Request',
    description: 'A template for requesting new features.',
    category: 'Product',
    content: `# Feature Request: [Feature Name]

## Summary
[Brief description of the requested feature]

## Problem Statement
[What problem does this feature solve?]

## Proposed Solution
[Detailed description of the proposed feature]

## User Benefit
[How will users benefit from this feature?]

## Use Cases
1. [Use case 1]
2. [Use case 2]
3. [Use case 3]

## Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Alternatives Considered
[Alternative solutions considered and why they were rejected]

## Impact
[Potential impact on existing features, performance, etc.]

## Success Metrics
[How will the success of this feature be measured?]

## Additional Context
[Any additional information, screenshots, mockups, etc.]`,
    isBuiltIn: true
  },
  {
    id: 'template-system-prompt',
    title: 'System Prompt',
    description: 'A template for creating system prompts for LLMs.',
    category: 'AI',
    content: `# System Prompt: [Purpose]

You are [role/identity], an AI assistant specialized in [domain/expertise].

## Capabilities
- [Capability 1]
- [Capability 2]
- [Capability 3]

## Constraints
- [Constraint 1]
- [Constraint 2]
- [Constraint 3]

## Interaction Style
- [Tone/style guideline 1]
- [Tone/style guideline 2]
- [Tone/style guideline 3]

## Response Format
[Describe how responses should be formatted]

## Examples
### Example 1
User: [Example user input]
Assistant: [Example assistant response]

### Example 2
User: [Example user input]
Assistant: [Example assistant response]

## Additional Instructions
[Any other instructions or guidelines]`,
    isBuiltIn: true
  }
];