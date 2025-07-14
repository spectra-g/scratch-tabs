import { Template } from "../types";

export const defaultTemplates: Template[] = [
  {
    id: "template-prd",
    title: "Product Requirements Document (PRD)",
    description:
      "A comprehensive document outlining the purpose, features, and functionality of a product.",
    category: "Product",
    content: `# Product Requirements Document: {{product_name}}

Create a comprehensive Product Requirements Document (PRD) for the specified product. Follow these instructions to generate each section:

## Product Overview
Write a clear, concise overview of {{product_name}} that includes:
- The product's core purpose and mission
- Key value proposition
- How it fits within the broader market or company strategy

## Problem Definition
Analyze and articulate the problem this product solves by:
- Identifying the specific pain points users currently experience
- Quantifying the impact of these problems (if known)
- Explaining why existing solutions are inadequate
- Describing the market opportunity this creates

## Target User Analysis
Define the primary users for {{product_name}} by creating detailed user personas that include:
- Demographics and psychographics
- Current behaviors and pain points
- Technical proficiency levels
- Primary use cases and goals
- User journey touchpoints

## User Stories and Use Cases
Generate 5-7 comprehensive user stories following the format:
- As a {{user_type}}, I want to {{desired_action}} so that {{benefit_achieved}}

*AI: Based on the product overview and target users above, expand each user story with detailed scenarios, edge cases, and context about when and why users would need this functionality.*

## Feature Specification
### Core Features (Must-Have)
List and detail the essential features required for {{product_name}} to function:
1. {{core_feature_1}}
   - Detailed functional requirements
   - User interaction flows
   - Technical specifications
2. {{core_feature_2}}
   - Detailed functional requirements
   - User interaction flows
   - Technical specifications

### Enhanced Features (Nice-to-Have)
Identify features that would improve the user experience but aren't critical for launch:
- {{enhancement_1}}
- {{enhancement_2}}

*AI: For each feature listed above, generate specific acceptance criteria that cover positive flows, negative scenarios, and edge cases. Include measurable success criteria where applicable.*

## Technical Requirements
### Performance Requirements
- Response time expectations: {{performance_target}}
- Scalability requirements: {{scale_requirements}}
- Availability targets: {{uptime_target}}

### Security Requirements
- Data protection needs for {{data_sensitivity_level}}
- Authentication and authorization requirements
- Compliance requirements: {{compliance_standards}}

### Platform Requirements
- Supported platforms: {{target_platforms}}
- Browser/device compatibility: {{compatibility_requirements}}
- Integration requirements: {{integration_needs}}

## Business Constraints and Dependencies
Document any limitations that will impact development:
- Budget constraints: {{budget_limit}}
- Timeline constraints: {{deadline}}
- Technical dependencies: {{technical_dependencies}}
- Resource constraints: {{team_size}} team members

*AI: Analyze the constraints listed above and recommend risk mitigation strategies for each potential blocker.*

## Success Metrics and KPIs
Define how success will be measured:
- Primary success metric: {{primary_metric}}
- Secondary metrics: {{secondary_metrics}}
- User engagement targets: {{engagement_goals}}
- Business impact goals: {{business_goals}}

## Development Timeline
Create a phased development approach:
- Phase 1 (MVP): {{mvp_timeline}}
  - Core features to include
  - Success criteria for MVP
- Phase 2 (Enhancement): {{enhancement_timeline}}
  - Additional features
  - Optimization goals
- Phase 3 (Scale): {{scale_timeline}}
  - Advanced features
  - Performance optimization

*AI: Based on the features and constraints outlined above, provide a detailed breakdown of development milestones, including dependencies between features and realistic time estimates.*

## Risk Assessment and Mitigation
*AI: Analyze the product requirements above and identify the top 5 risks that could impact the project. For each risk, provide:*
- Risk description and likelihood
- Potential impact on timeline/scope/quality
- Recommended mitigation strategies
- Contingency plans

## Appendix and Supporting Materials
Include any additional context relevant to {{product_name}}:
- Market research findings
- Competitive analysis summary
- Technical architecture diagrams
- User research insights
- Stakeholder feedback summary`,
    isBuiltIn: true,
  },
  {
    id: "template-srs",
    title: "Software Requirements Specification (SRS)",
    description:
      "A detailed document specifying the requirements for a software system.",
    category: "Development",
    content: `# Software Requirements Specification: {{system_name}}

Create a comprehensive Software Requirements Specification (SRS) for {{system_name}}. Follow these instructions to generate each section with detailed technical specifications:

## 1. Introduction
### 1.1 Purpose
Define the purpose of this SRS document by explaining:
- The intended audience for {{system_name}}
- How this document will be used throughout the development lifecycle
- The relationship between this SRS and other project documentation

### 1.2 Scope
Clearly delineate the boundaries of {{system_name}} by describing:
- What {{system_name}} will accomplish for {{target_organization}}
- The major functions and capabilities to be included
- What is explicitly excluded from this system scope
- How success will be measured

### 1.3 Definitions, Acronyms, and Abbreviations
Compile a comprehensive list of technical terms, acronyms, and abbreviations used throughout this document, including:
- Domain-specific terminology for {{business_domain}}
- Technical acronyms relevant to {{technology_stack}}
- System-specific terms unique to {{system_name}}

*AI: Based on the system name and domain provided above, generate 8-12 relevant technical terms and acronyms that would commonly appear in this type of system's documentation.*

## 2. Overall Description
### 2.1 Product Perspective
Analyze and describe how {{system_name}} fits within the broader technological ecosystem:
- Integration points with existing systems at {{target_organization}}
- Dependencies on {{external_systems}}
- Position within the overall system architecture
- Relationship to legacy systems being replaced or enhanced

### 2.2 Product Functions
Summarize the major functional areas of {{system_name}}, organized by:
- Core business processes supported
- Primary user workflows enabled
- Key data processing capabilities
- Integration and communication functions

### 2.3 User Characteristics
Create detailed profiles for each user type of {{system_name}}:
- {{primary_user_type}}: technical skills, domain knowledge, system usage patterns
- {{secondary_user_type}}: access levels, responsibilities, interaction frequency
- {{admin_user_type}}: administrative capabilities, technical expertise requirements

### 2.4 Constraints
Document all constraints that will impact {{system_name}} development:
- Technology constraints: {{technology_limitations}}
- Budget limitations: {{budget_constraints}}
- Timeline restrictions: {{delivery_deadline}}
- Regulatory requirements: {{compliance_standards}}
- Organizational policies and standards

### 2.5 Assumptions and Dependencies
List critical assumptions and external dependencies:
- Third-party service availability: {{external_dependencies}}
- Infrastructure assumptions: {{infrastructure_requirements}}
- User behavior assumptions
- Technical environment assumptions

*AI: Based on the system type and constraints listed above, identify 5-7 additional technical dependencies and assumptions that would be critical for this type of system.*

## 3. Specific Requirements
### 3.1 Functional Requirements
Generate detailed functional requirements organized by feature area. For each requirement, include:
- Unique identifier (FR-001, FR-002, etc.)
- Priority level (High/Medium/Low)
- Detailed description of the functionality
- Input/output specifications
- Business rules and logic

*AI: Create 15-20 specific functional requirements for {{system_name}} based on the system description and user types provided above. Follow the format: "FR-XXX: The system shall [specific capability] when [conditions] so that [business value]."*

### 3.2 Non-Functional Requirements
#### 3.2.1 Performance Requirements
Specify measurable performance criteria:
- Response time targets: {{response_time_target}}
- Throughput requirements: {{throughput_target}}
- Concurrent user capacity: {{concurrent_users}}
- Data volume handling: {{data_volume}}
- System availability: {{uptime_target}}

#### 3.2.2 Security Requirements
Define comprehensive security specifications:
- Authentication mechanisms for {{user_authentication_method}}
- Authorization and access control policies
- Data encryption requirements: {{encryption_standards}}
- Audit trail and logging requirements
- Compliance with {{security_standards}}

#### 3.2.3 Software Quality Attributes
Specify quality attributes with measurable criteria:
- Reliability: Mean time between failures, error rates
- Maintainability: Code modularity, documentation standards
- Portability: Platform independence requirements
- Usability: User experience standards, accessibility compliance

## 4. System Features
Detail each major feature of {{system_name}} using this structure for each feature:

### Feature 1: {{feature_name_1}}
- Description and purpose
- Stimulus/response sequences
- Associated functional requirements
- Priority and risk assessment

### Feature 2: {{feature_name_2}}
- Description and purpose
- Stimulus/response sequences
- Associated functional requirements
- Priority and risk assessment

*AI: Based on the functional requirements generated above, organize them into 5-8 logical feature groupings. For each feature, provide the detailed breakdown following the structure shown above.*

## 5. External Interface Requirements
### 5.1 User Interfaces
Specify user interface requirements for {{system_name}}:
- Screen layouts and navigation flow for {{primary_user_interface}}
- Input validation and error handling approaches
- Accessibility requirements for {{accessibility_standards}}
- Mobile responsiveness requirements

### 5.2 Hardware Interfaces
Document hardware interface specifications:
- Server hardware requirements: {{server_specifications}}
- Client device requirements: {{client_requirements}}
- Network infrastructure needs
- Peripheral device interfaces

### 5.3 Software Interfaces
Define integration requirements with external software:
- Database interfaces: {{database_systems}}
- Third-party API integrations: {{external_apis}}
- Operating system interfaces
- Development framework dependencies: {{frameworks}}

### 5.4 Communications Interfaces
Specify communication protocol requirements:
- Network protocols: {{network_protocols}}
- Data exchange formats: {{data_formats}}
- Message queuing requirements
- Real-time communication needs

## 6. Data Requirements
*AI: Generate a comprehensive data requirements section that includes:*
- Logical data model for {{system_name}}
- Data retention and archival policies
- Data migration requirements from {{legacy_systems}}
- Backup and recovery specifications
- Data quality and validation rules

## 7. Quality Assurance Requirements
*AI: Create detailed testing requirements that specify:*
- Unit testing coverage expectations
- Integration testing scenarios
- User acceptance testing criteria
- Performance testing benchmarks
- Security testing requirements

## Appendix A: Glossary
*AI: Expand the terms identified in section 1.3 into a comprehensive glossary with detailed definitions for each term, acronym, and abbreviation.*

## Appendix B: Analysis Models
Include supporting analysis artifacts:
- Use case diagrams for {{primary_workflows}}
- Data flow diagrams showing {{data_processing_flows}}
- System architecture diagrams
- User interface mockups or wireframes
- Database entity relationship diagrams`,
    isBuiltIn: true,
  },
  {
    id: "template-bug-report",
    title: "Bug Report",
    description: "A structured report for documenting software bugs.",
    category: "Development",
    content: `# Bug Report: {{bug_title}}

Create a comprehensive bug report for the issue encountered in {{application_name}}. Follow these instructions to document the bug systematically:

## Issue Summary
Write a clear, concise summary of the bug that includes:
- The core functionality that is broken or behaving incorrectly
- The impact on {{affected_user_type}} users
- A one-sentence description of what went wrong

## Environment Details
Document the technical environment where the bug occurred:
- **Browser/Device**: {{browser_device}} (e.g., Chrome 91, iPhone 12, Safari on macOS)
- **Operating System**: {{operating_system}} (e.g., Windows 10, iOS 14.5, Ubuntu 20.04)
- **Application Version**: {{app_version}} (e.g., v2.3.1, build 1234)
- **Network Conditions**: {{network_type}} (e.g., WiFi, 4G, Corporate VPN)
- **User Account Type**: {{user_account_level}} (e.g., Admin, Standard User, Guest)

*AI: Based on the application type and bug context, identify 3-5 additional environment factors that could be relevant to reproducing this issue.*

## Reproduction Steps
Provide step-by-step instructions to reproduce the bug:
1. {{step_1}} (e.g., Navigate to the login page)
2. {{step_2}} (e.g., Enter username: {{test_username}})
3. {{step_3}} (e.g., Click the "Submit" button)
4. {{step_4}} (e.g., Observe the error message)

*AI: Based on the bug summary above, expand these steps to include specific data inputs, timing considerations, and any prerequisite conditions needed to reproduce the issue.*

## Expected vs Actual Behavior
### Expected Behavior
Describe what should happen when following the reproduction steps:
- The intended user experience for {{expected_workflow}}
- Expected system responses and feedback
- Expected data outputs or state changes

### Actual Behavior
Document what actually occurs instead:
- Specific error messages or unexpected responses
- Visual anomalies or interface problems
- Data corruption or incorrect processing results
- Performance issues or system instability

## Impact Assessment
Analyze the bug's impact on users and business operations:
- **User Impact**: How does this affect {{affected_user_count}} users?
- **Business Impact**: What business processes are disrupted?
- **Frequency**: How often does this occur? {{occurrence_frequency}}
- **Workaround Available**: {{workaround_exists}} - describe if applicable

## Technical Analysis
### Error Information
- **Error Messages**: {{error_messages}}
- **Console Logs**: {{console_errors}}
- **Network Requests**: {{failed_requests}}
- **Database Errors**: {{db_errors}}

### Affected Components
*AI: Based on the reproduction steps and error details above, identify which system components are likely involved in this bug. Consider:*
- Frontend UI components
- Backend API endpoints
- Database operations
- Third-party integrations
- Authentication/authorization systems

## Supporting Evidence
Include relevant documentation of the issue:
- **Screenshots**: {{screenshot_descriptions}}
- **Screen Recordings**: {{video_evidence}}
- **Log Files**: {{log_file_excerpts}}
- **Network Traffic**: {{network_analysis}}

## Root Cause Analysis
*AI: Based on the technical details provided above, generate a preliminary root cause analysis that considers:*
- Potential code-level issues (logic errors, race conditions, etc.)
- Configuration problems
- Environment-specific factors
- Recent changes that might have introduced the issue

## Recommended Solution
### Immediate Fix
Propose a short-term solution to address the bug:
- Code changes required in {{target_codebase}}
- Configuration updates needed
- Database fixes or data cleanup

### Long-term Prevention
Suggest measures to prevent similar issues:
- Additional testing scenarios
- Code review improvements
- Monitoring enhancements

*AI: Generate specific, actionable recommendations based on the root cause analysis above. Include estimated effort and potential risks for each proposed solution.*

## Severity and Priority Classification
### Severity Level: {{severity_level}}
- **Critical**: System unusable, data loss, security breach
- **High**: Major functionality broken, significant user impact
- **Medium**: Minor functionality affected, workaround available
- **Low**: Cosmetic issues, minimal impact

### Priority Level: {{priority_level}}
- **P1**: Fix immediately, blocks release
- **P2**: Fix in current sprint
- **P3**: Fix in next release
- **P4**: Fix when convenient

### Justification
Explain why this bug deserves the assigned severity and priority based on:
- Number of users affected: {{user_impact_scale}}
- Business process criticality
- Available workarounds
- Release timeline considerations

## Testing Requirements
*AI: Define comprehensive testing requirements for validating the fix:*
- Unit tests to add or modify
- Integration test scenarios
- User acceptance testing criteria
- Regression testing scope
- Performance impact verification

## Related Issues
Document connections to other problems:
- **Similar Bugs**: {{related_bug_ids}}
- **Dependencies**: {{blocking_issues}}
- **Follow-up Tasks**: {{subsequent_work}}`,
    isBuiltIn: true,
  },
  {
    id: "template-agent-context",
    title: "Agent Context",
    description:
      "A template for defining the context and capabilities of an AI agent.",
    category: "AI",
    content: `# Agent Context Definition: {{agent_name}}

Create a comprehensive AI agent context specification for {{agent_name}}. Follow these instructions to define the agent's identity, capabilities, and operational parameters:

## Agent Identity Profile
Define the core identity of {{agent_name}} by specifying:
- **Name**: {{agent_name}}
- **Primary Role**: {{agent_role}} (e.g., Customer Support Specialist, Code Review Assistant, Data Analyst)
- **Domain Expertise**: {{expertise_domains}} (e.g., JavaScript development, financial analysis, medical terminology)
- **Personality Traits**: {{personality_characteristics}} (e.g., helpful, analytical, patient, detail-oriented)
- **Communication Style**: {{communication_approach}} (e.g., professional, conversational, technical, empathetic)

*AI: Based on the agent's role and domain, generate 3-5 additional personality traits that would make this agent more effective in its designated role.*

## Core Capabilities
List the specific capabilities that {{agent_name}} possesses:
- {{capability_1}} (e.g., Code analysis and optimization suggestions)
- {{capability_2}} (e.g., Real-time data interpretation and visualization)
- {{capability_3}} (e.g., Multi-language customer support)
- {{capability_4}} (e.g., Document generation and formatting)

*AI: Expand each capability listed above with specific sub-skills and technical details about what the agent can accomplish within each area.*

## Operational Constraints
Define the boundaries and limitations for {{agent_name}}:
- **Scope Limitations**: {{scope_constraints}} (e.g., cannot access external databases, limited to English language)
- **Ethical Guidelines**: {{ethical_boundaries}} (e.g., cannot provide financial advice, must respect user privacy)
- **Technical Constraints**: {{technical_limitations}} (e.g., maximum response length, processing time limits)
- **Authority Limits**: {{decision_boundaries}} (e.g., cannot make purchases, requires human approval for certain actions)

## Knowledge Base and Training
Specify the information sources and training that inform {{agent_name}}'s responses:
- **Primary Knowledge Domains**: {{knowledge_areas}} (e.g., software engineering best practices, customer service protocols)
- **Training Data Sources**: {{training_sources}} (e.g., internal documentation, industry standards, academic research)
- **Knowledge Cutoff**: {{knowledge_cutoff_date}}
- **Specialized Databases**: {{specialized_data_access}} (e.g., company knowledge base, product documentation)

*AI: Based on the agent's role and capabilities, identify 5-7 specific knowledge areas that would be essential for this agent to perform effectively.*

## Interaction Protocols
Define how {{agent_name}} should communicate with users:
- **Tone and Voice**: {{communication_tone}} (e.g., professional but friendly, technical and precise)
- **Response Structure**: {{response_format}} (e.g., bullet points for technical info, narrative for explanations)
- **Question Handling**: {{question_approach}} (e.g., ask clarifying questions, provide step-by-step guidance)
- **Error Management**: {{error_handling_strategy}} (e.g., acknowledge limitations, suggest alternatives)

## User Interaction Examples
### Scenario 1: {{interaction_scenario_1}}
- **User Input**: {{example_user_query_1}}
- **Expected Agent Response**: {{example_agent_response_1}}
- **Key Elements**: What makes this response effective for {{agent_name}}'s role

### Scenario 2: {{interaction_scenario_2}}
- **User Input**: {{example_user_query_2}}
- **Expected Agent Response**: {{example_agent_response_2}}
- **Key Elements**: How the agent demonstrates its expertise and constraints

*AI: Generate 3 additional interaction examples that showcase different aspects of the agent's capabilities, including how it handles edge cases or requests outside its scope.*

## Performance Evaluation
Define how {{agent_name}}'s effectiveness will be measured:
- **Primary Success Metrics**: {{primary_metrics}} (e.g., user satisfaction score, task completion rate)
- **Quality Indicators**: {{quality_measures}} (e.g., accuracy of information, response relevance)
- **Efficiency Metrics**: {{efficiency_measures}} (e.g., average response time, issue resolution rate)
- **User Experience Metrics**: {{ux_metrics}} (e.g., conversation flow quality, user engagement)

## Escalation Procedures
Define when and how {{agent_name}} should escalate to human oversight:
- **Escalation Triggers**: {{escalation_conditions}} (e.g., complex technical issues, sensitive topics)
- **Escalation Process**: {{escalation_workflow}} (e.g., immediate transfer, summary preparation)
- **Human Handoff**: {{handoff_procedure}} (e.g., context preservation, status communication)

*AI: Based on the agent's role and constraints, identify specific situations that would require escalation and design appropriate escalation responses for each scenario.*

## Continuous Improvement Framework
Outline how {{agent_name}} will evolve and improve:
- **Feedback Collection**: {{feedback_mechanisms}} (e.g., user ratings, interaction analysis)
- **Learning Opportunities**: {{learning_methods}} (e.g., training data updates, performance analysis)
- **Adaptation Strategies**: {{adaptation_approach}} (e.g., response refinement, capability expansion)
- **Update Frequency**: {{update_schedule}} (e.g., weekly performance reviews, monthly capability assessments)

## Integration Requirements
Specify how {{agent_name}} integrates with existing systems:
- **Platform Compatibility**: {{platform_requirements}} (e.g., web interface, mobile app, API endpoints)
- **Data Access Needs**: {{data_integration}} (e.g., CRM system, knowledge management tools)
- **Security Requirements**: {{security_protocols}} (e.g., authentication methods, data encryption)
- **Scalability Considerations**: {{scalability_factors}} (e.g., concurrent user limits, load balancing)`,
    isBuiltIn: true,
  },
  {
    id: "template-code-review",
    title: "Code Review",
    description: "A template for conducting thorough code reviews.",
    category: "Development",
    content: `# Code Review: {{pr_title}}

Create a comprehensive code review for {{pr_title}} in the {{project_name}} codebase. Follow these instructions to conduct a thorough technical assessment:

## Overview Analysis
Write a concise overview that includes:
- The primary purpose and scope of {{pr_title}}
- The main files and components affected
- The type of change (feature, bugfix, refactor, etc.)
- How this change fits within the broader codebase architecture

## General Assessment
Provide an overall evaluation of the code submission by analyzing:
- Code organization and structure quality
- Adherence to {{coding_standards}} standards
- Integration approach with existing systems
- Complexity appropriateness for the intended functionality

## Code Quality Analysis
Evaluate each of the following dimensions with specific findings:

### Readability Assessment
- Code clarity and self-documentation
- Variable and function naming conventions
- Comment quality and necessity for {{code_language}}
- Code organization and logical flow

### Maintainability Assessment  
- Code modularity and reusability
- Adherence to DRY (Don't Repeat Yourself) principles
- Dependency management and coupling
- Future extensibility considerations

### Performance Assessment
- Algorithm efficiency for {{performance_requirements}}
- Resource usage optimization
- Database query efficiency (if applicable)
- Potential bottlenecks or scaling concerns

### Security Assessment
- Input validation and sanitization
- Authentication and authorization handling
- Data protection and privacy compliance with {{security_standards}}
- Vulnerability prevention measures

### Testing Assessment
- Test coverage for new functionality
- Test quality and edge case handling
- Integration test considerations
- Testing framework usage for {{testing_framework}}

*AI: Based on your analysis above, provide specific examples and evidence for each quality dimension. Include code snippets or line references where relevant.*

## Detailed Issue Analysis

### Critical Issues
Identify any critical issues that must be addressed before merge:
- Security vulnerabilities
- Performance blockers
- Breaking changes
- Data integrity risks

### Major Issues  
Document significant problems that impact code quality:
- Logic errors or incorrect implementations
- Poor error handling
- Significant performance issues
- Architectural concerns

### Minor Issues
Note smaller improvements and best practice violations:
- Code style inconsistencies
- Minor performance optimizations
- Documentation gaps
- Naming convention violations

### Nitpicks
List cosmetic or preference-based suggestions:
- Formatting improvements
- Alternative implementation approaches
- Code organization suggestions

*AI: For each issue category above, provide specific examples from the code being reviewed. Include file paths, line numbers, and concrete suggestions for resolution.*

## Positive Aspects Recognition
Highlight exemplary aspects of the code submission:
- Well-implemented features or algorithms
- Good use of design patterns
- Excellent test coverage
- Clear documentation
- Performance optimizations
- Security best practices

*AI: Provide specific examples of what the developer did well. Recognition of good practices is as important as identifying issues.*

## Technical Questions and Clarifications
Generate thoughtful questions about the implementation:
- Rationale for specific technical decisions
- Alternative approaches considered
- Impact on {{system_dependencies}}
- Integration testing strategies
- Deployment considerations for {{deployment_environment}}

*AI: Based on the code changes and project context, formulate 3-5 specific technical questions that would help clarify the implementation approach and decisions.*

## Recommendations and Action Items

### Required Changes
List changes that must be made before approval:
- {{required_change_1}}
- {{required_change_2}}
- {{required_change_3}}

### Suggested Improvements
Recommend optional enhancements:
- {{suggested_improvement_1}}
- {{suggested_improvement_2}}
- {{suggested_improvement_3}}

### Follow-up Tasks
Identify tasks for future iterations:
- Documentation updates needed
- Monitoring or logging enhancements
- Performance testing requirements
- Integration testing additions

## Review Summary and Decision
Provide a clear conclusion that includes:
- Overall code quality rating (Excellent/Good/Needs Work/Requires Major Changes)
- Approval status (Approved/Approved with Comments/Changes Requested/Rejected)
- Priority level for addressing identified issues
- Estimated effort for required changes
- Timeline recommendations for {{project_deadline}}

*AI: Based on your comprehensive analysis above, synthesize the findings into a clear recommendation about whether this code should be merged, what conditions must be met, and what the next steps should be for the development team.*

## Learning Opportunities
*AI: Identify 2-3 learning opportunities or best practices that could benefit the entire team based on this code review. Consider both positive examples to emulate and areas for team-wide improvement.*`,
    isBuiltIn: true,
  },
  {
    id: "template-user-story",
    title: "User Story",
    description: "A template for creating user stories in agile development.",
    category: "Product",
    content: `# User Story: {{story_title}}

Create a comprehensive user story for {{story_title}} in the {{project_name}} product. Follow these instructions to develop a complete, actionable user story:

## Core Story Definition
Write the fundamental user story using this structure:
- **As a** {{user_type}} (e.g., registered customer, system administrator, mobile app user)
- **I want to** {{desired_action}} (e.g., search for products, manage user permissions, receive push notifications)
- **So that** {{business_value}} (e.g., I can find relevant items quickly, maintain system security, stay informed about important updates)

*AI: Expand on the core story above by providing context about why this particular user type would need this functionality and how it aligns with their typical workflow or goals.*

## Detailed User Context
Analyze and describe the user's situation by covering:
- **User Persona**: Profile of {{user_type}} including their technical skill level, typical use patterns, and pain points
- **Current State**: How {{user_type}} currently accomplishes this task or works around its absence
- **Motivation**: The primary drivers that make {{desired_action}} important to this user
- **Context of Use**: When, where, and under what circumstances this feature would be used

## Comprehensive Acceptance Criteria
Define specific, testable acceptance criteria that cover:

### Primary Success Scenarios
1. {{primary_criterion_1}} - core functionality works as expected
2. {{primary_criterion_2}} - user can complete the main workflow
3. {{primary_criterion_3}} - system provides appropriate feedback

### Edge Cases and Error Handling
4. {{edge_case_criterion_1}} - behavior when unusual conditions occur
5. {{edge_case_criterion_2}} - system response to invalid inputs
6. {{error_handling_criterion}} - graceful handling of failure scenarios

### Non-Functional Requirements
7. {{performance_criterion}} - performance and responsiveness requirements
8. {{accessibility_criterion}} - accessibility and usability standards
9. {{security_criterion}} - security and privacy considerations

*AI: Based on the user story and context above, generate 3-5 additional acceptance criteria that cover important scenarios not yet addressed. Focus on realistic edge cases and user experience considerations specific to {{user_type}}.*

## Technical Implementation Notes
Document technical considerations for the development team:
- **Architecture Impact**: How this feature integrates with {{existing_system_architecture}}
- **Data Requirements**: New data models, API endpoints, or database changes needed
- **UI/UX Considerations**: Interface design requirements and user experience flows
- **Third-Party Integrations**: External services or APIs that may be required
- **Performance Considerations**: Expected load, response time requirements, scalability needs

## Dependencies and Prerequisites
Identify blocking items and relationships:
- **Technical Dependencies**: {{technical_dependency_1}}, {{technical_dependency_2}}
- **Business Dependencies**: {{business_dependency_1}}, stakeholder approvals needed
- **Other User Stories**: Related stories that must be completed first
- **Infrastructure Requirements**: {{infrastructure_needs}} (e.g., new environments, services)

## Effort Estimation and Planning
Provide development planning information:
- **Story Points**: {{story_points}} (using your team's estimation scale)
- **Time Estimate**: {{time_estimate}} for {{team_size}} developers
- **Complexity Factors**: {{complexity_factor_1}}, {{complexity_factor_2}}
- **Risk Assessment**: {{risk_level}} - potential blockers or unknowns

*AI: Based on the acceptance criteria and technical notes above, analyze the complexity and provide a detailed breakdown of the work involved. Consider frontend, backend, testing, and documentation efforts.*

## Quality Assurance Strategy
Define how this story will be validated:
- **Unit Testing Requirements**: {{unit_test_coverage}} coverage for core functionality
- **Integration Testing**: Key integration points to validate
- **User Acceptance Testing**: {{uat_scenarios}} scenarios for stakeholder validation
- **Performance Testing**: {{performance_test_requirements}} benchmarks to meet

## Definition of Done Checklist
Ensure all completion criteria are met:
- [ ] Core functionality implemented according to acceptance criteria
- [ ] Unit tests written and achieving {{test_coverage_target}}% coverage
- [ ] Integration tests covering key user workflows
- [ ] Code reviewed by {{reviewer_requirements}} team members
- [ ] Documentation updated in {{documentation_location}}
- [ ] Accessibility requirements validated for {{accessibility_standards}}
- [ ] Performance benchmarks met: {{performance_targets}}
- [ ] Security review completed for {{security_requirements}}
- [ ] Product owner acceptance and sign-off received
- [ ] Feature deployed to {{deployment_environment}} environment

## Success Metrics and Validation
Define how success will be measured post-implementation:
- **User Adoption Metrics**: {{adoption_metric_1}}, {{adoption_metric_2}}
- **Performance Metrics**: {{performance_metric_1}}, response time targets
- **Business Impact**: {{business_metric_1}}, conversion or efficiency improvements
- **User Satisfaction**: {{satisfaction_measurement}} approach

*AI: Based on the user story and business value identified above, recommend 3-4 specific, measurable KPIs that would indicate successful implementation and user adoption of this feature.*`,
    isBuiltIn: true,
  },
  {
    id: "template-technical-spec",
    title: "Technical Specification",
    description:
      "A detailed technical specification for a software component or feature.",
    category: "Development",
    content: `# Technical Specification: {{feature_name}}

Create a comprehensive technical specification for {{feature_name}} in the {{system_name}} platform. Follow these instructions to develop a complete, implementable technical design:

## Executive Overview
Write a concise technical overview that includes:
- The core purpose and scope of {{feature_name}}
- Primary technical challenges being addressed
- High-level solution approach for {{target_architecture}}
- Expected impact on existing {{system_components}}

## Goals and Scope Definition
### Primary Goals
Define what {{feature_name}} will accomplish:
- {{primary_goal_1}} - core functionality objective
- {{primary_goal_2}} - performance or scalability target
- {{primary_goal_3}} - user experience or business outcome

### Explicit Non-Goals
Clearly state what is outside the scope:
- {{non_goal_1}} - functionality intentionally excluded
- {{non_goal_2}} - future considerations not part of this implementation
- {{non_goal_3}} - alternative approaches explicitly rejected

*AI: Based on the feature name and goals above, identify 2-3 additional non-goals that would help clarify the boundaries and prevent scope creep during implementation.*

## Background and Technical Context
Analyze the current state and requirements:
- **Current System State**: How {{existing_system}} currently handles related functionality
- **Technical Debt**: Existing limitations in {{legacy_components}} that this addresses
- **Business Context**: Why {{feature_name}} is needed now for {{business_requirements}}
- **User Pain Points**: Technical problems that {{target_users}} currently experience
- **Integration Requirements**: How this fits within {{system_ecosystem}}

## Detailed Technical Design

### System Architecture
Design the overall architecture by specifying:
- **Component Architecture**: How {{feature_name}} integrates with {{existing_architecture}}
- **Service Boundaries**: New services or modifications to {{current_services}}
- **Data Flow**: Information flow between {{component_1}}, {{component_2}}, and {{component_3}}
- **Deployment Architecture**: How components will be deployed in {{deployment_environment}}

### Data Model and Storage
Define data structures and persistence:
- **Database Schema**: New tables, indexes, and relationships for {{database_system}}
- **Data Entities**: Core data objects and their properties
- **Data Relationships**: Foreign keys, constraints, and referential integrity
- **Data Migration**: Strategy for migrating {{existing_data}} to new schema
- **Data Retention**: Lifecycle policies for {{data_types}}

### API Design and Interfaces
Specify external interfaces and contracts:
- **REST API Endpoints**: New endpoints for {{api_functionality}}
- **Request/Response Formats**: JSON schemas and validation rules
- **Authentication**: Integration with {{auth_system}} for {{user_types}}
- **Rate Limiting**: Throttling policies for {{api_usage_patterns}}
- **Versioning Strategy**: API evolution approach for {{api_consumers}}

### Core Business Logic
Detail the algorithmic and business rule implementation:
- **Processing Workflows**: Step-by-step logic for {{primary_workflow}}
- **Business Rules**: Validation and processing rules for {{business_domain}}
- **Algorithm Design**: Core algorithms for {{computational_requirements}}
- **Error Handling**: Exception scenarios and recovery strategies
- **State Management**: How {{feature_name}} maintains consistency

### User Interface Design
Define UI components and interactions:
- **Component Architecture**: React/Vue components for {{ui_framework}}
- **User Workflows**: Navigation and interaction patterns for {{user_scenarios}}
- **State Management**: Frontend state handling using {{state_management_library}}
- **Responsive Design**: Multi-device support for {{target_devices}}
- **Accessibility**: Compliance with {{accessibility_standards}}

*AI: Based on the architecture and business logic defined above, identify any additional technical components or interfaces that would be necessary for a complete implementation.*

## Alternative Approaches Analysis
### Considered Alternatives
Document alternative approaches that were evaluated:
- **Alternative 1**: {{alternative_approach_1}} - pros, cons, and rejection reasons
- **Alternative 2**: {{alternative_approach_2}} - technical limitations or trade-offs
- **Alternative 3**: {{alternative_approach_3}} - cost or complexity considerations

### Decision Rationale
Explain why the chosen approach is optimal:
- Technical advantages over alternatives
- Alignment with {{technology_strategy}}
- Resource and timeline considerations
- Risk mitigation factors

## Performance and Scalability
### Performance Requirements
Specify measurable performance criteria:
- **Response Time**: {{response_time_target}} for {{operation_types}}
- **Throughput**: {{throughput_target}} requests/transactions per second
- **Concurrent Users**: Support for {{concurrent_user_count}} simultaneous users
- **Data Volume**: Handling {{data_volume_target}} records efficiently

### Scalability Design
Plan for growth and load management:
- **Horizontal Scaling**: How to scale {{scalable_components}} across multiple instances
- **Caching Strategy**: Redis/Memcached implementation for {{cached_data_types}}
- **Database Optimization**: Query optimization and indexing for {{database_operations}}
- **Load Balancing**: Distribution strategy for {{traffic_patterns}}

## Security and Privacy Framework
### Security Requirements
Implement comprehensive security measures:
- **Authentication**: Integration with {{auth_provider}} for {{user_authentication}}
- **Authorization**: Role-based access control for {{permission_levels}}
- **Data Protection**: Encryption at rest and in transit using {{encryption_standards}}
- **Input Validation**: Sanitization and validation for {{input_types}}
- **Audit Logging**: Security event tracking for {{compliance_requirements}}

### Privacy Considerations
Ensure data privacy compliance:
- **Data Classification**: Handling of {{sensitive_data_types}} according to {{privacy_regulations}}
- **Data Minimization**: Collection and retention policies
- **User Consent**: Opt-in/opt-out mechanisms for {{data_usage}}
- **Data Portability**: Export capabilities for {{user_data}}

*AI: Based on the feature functionality and data handling described above, identify any additional security or privacy considerations specific to this type of system.*

## Quality Assurance Strategy
### Testing Approach
Define comprehensive testing methodology:
- **Unit Testing**: {{unit_test_coverage}}% coverage using {{testing_framework}}
- **Integration Testing**: API and database integration validation
- **End-to-End Testing**: User workflow testing with {{e2e_testing_tool}}
- **Performance Testing**: Load testing with {{load_testing_tool}} for {{performance_scenarios}}
- **Security Testing**: Penetration testing and vulnerability scanning

### Test Data and Environments
Specify testing infrastructure:
- **Test Data**: Synthetic data generation for {{test_scenarios}}
- **Environment Strategy**: Development, staging, and production-like testing environments
- **Continuous Integration**: Automated testing in {{ci_cd_pipeline}}

## Deployment and Rollout Strategy
### Deployment Plan
Design safe deployment approach:
- **Deployment Strategy**: {{deployment_method}} (blue-green, canary, rolling)
- **Environment Progression**: {{dev_environment}} → {{staging_environment}} → {{production_environment}}
- **Database Migrations**: Schema changes and data migration procedures
- **Feature Flags**: Gradual rollout using {{feature_flag_system}}
- **Rollback Plan**: Quick reversion strategy if issues arise

### Launch Timeline
Plan phased implementation:
- **Phase 1**: {{phase_1_scope}} - {{phase_1_timeline}}
- **Phase 2**: {{phase_2_scope}} - {{phase_2_timeline}}
- **Full Launch**: {{full_launch_criteria}} - {{full_launch_timeline}}

## Monitoring and Observability
### Monitoring Requirements
Implement comprehensive system monitoring:
- **Application Metrics**: {{key_metrics}} for {{feature_name}} performance
- **Infrastructure Monitoring**: CPU, memory, disk, network for {{infrastructure_components}}
- **Business Metrics**: {{business_kpis}} to measure feature success
- **Error Tracking**: Exception monitoring with {{error_tracking_tool}}
- **Log Aggregation**: Centralized logging using {{logging_system}}

### Alerting Strategy
Define incident response approach:
- **Alert Thresholds**: When to notify on-call for {{critical_metrics}}
- **Escalation Procedures**: Alert routing for {{severity_levels}}
- **Runbooks**: Troubleshooting guides for common issues

## Future Work and Evolution
### Planned Enhancements
Identify future development opportunities:
- **Short-term Improvements**: {{short_term_enhancement_1}}, {{short_term_enhancement_2}}
- **Long-term Vision**: {{long_term_goal_1}} for {{future_requirements}}
- **Technical Debt**: Refactoring opportunities in {{improvement_areas}}

### Scalability Roadmap
Plan for future growth:
- **Architecture Evolution**: How {{feature_name}} will adapt to {{future_scale}}
- **Technology Migration**: Potential transitions to {{future_technologies}}
- **Integration Expansion**: Additional systems that may integrate with {{feature_name}}

*AI: Based on the complete technical specification above, analyze the implementation and recommend 3-4 specific areas where future enhancements would provide the most value, considering both technical improvements and business impact.*`,
    isBuiltIn: true,
  },
  {
    id: "template-api-doc",
    title: "API Documentation",
    description: "A template for documenting APIs.",
    category: "Development",
    content: `# API Documentation: {{api_name}}

Create comprehensive API documentation for {{api_name}} serving {{target_audience}}. Follow these instructions to generate complete, developer-friendly documentation:

## API Overview
Write a clear introduction that includes:
- The primary purpose and capabilities of {{api_name}}
- Key use cases and business value for {{target_use_cases}}
- High-level architecture and design principles
- Integration approach with {{client_systems}}

## Base Configuration
Specify the foundational API details:

### Base URL
\`\`\`
{{base_url}}
\`\`\`

### API Version
- **Current Version**: {{api_version}}
- **Supported Versions**: {{supported_versions}}
- **Deprecation Policy**: {{deprecation_timeline}}

## Authentication and Security
Document authentication requirements and security measures:

### Authentication Methods
- **Primary Method**: {{auth_method}} (e.g., Bearer Token, API Key, OAuth 2.0)
- **Token Format**: {{token_format}}
- **Token Scope**: {{auth_scopes}} permissions required
- **Token Expiration**: {{token_expiry}} validity period

### Security Headers
Required headers for all requests:
\`\`\`http
Authorization: {{auth_header_format}}
Content-Type: application/json
{{additional_security_headers}}
\`\`\`

## Rate Limiting and Usage Policies
Define usage constraints and policies:
- **Rate Limits**: {{rate_limit_requests}} requests per {{rate_limit_window}}
- **Quota Limits**: {{quota_limit}} total requests per {{quota_period}}
- **Rate Limit Headers**: How rate limiting information is communicated
- **Throttling Behavior**: What happens when limits are exceeded

*AI: Based on the API type and target audience, recommend appropriate rate limiting strategies and explain the rationale for the suggested limits.*

## Core API Endpoints

### {{endpoint_1_name}}
\`\`\`http
{{http_method_1}} {{endpoint_path_1}}
\`\`\`

#### Endpoint Purpose
Describe what this endpoint accomplishes:
- Primary functionality and business purpose
- When developers should use this endpoint
- Integration patterns and common workflows

#### Request Specification
**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| {{path_param_1}} | {{param_type_1}} | Yes | {{param_description_1}} |
| {{path_param_2}} | {{param_type_2}} | No | {{param_description_2}} |

**Query Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| {{query_param_1}} | {{query_type_1}} | {{required_1}} | {{query_description_1}} |
| {{query_param_2}} | {{query_type_2}} | {{required_2}} | {{query_description_2}} |

**Request Body Schema**
\`\`\`json
{
  "{{request_field_1}}": "{{field_type_1}}",
  "{{request_field_2}}": "{{field_type_2}}",
  "{{request_field_3}}": {
    "{{nested_field_1}}": "{{nested_type_1}}",
    "{{nested_field_2}}": "{{nested_type_2}}"
  }
}
\`\`\`

#### Response Specification
**Success Response (200)**
\`\`\`json
{
  "{{response_field_1}}": "{{response_type_1}}",
  "{{response_field_2}}": "{{response_type_2}}",
  "{{response_field_3}}": [
    {
      "{{array_item_field_1}}": "{{array_item_type_1}}",
      "{{array_item_field_2}}": "{{array_item_type_2}}"
    }
  ]
}
\`\`\`

#### Status Codes and Error Handling
| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| 200 | {{success_scenario}} | {{success_response_description}} |
| 400 | {{bad_request_scenario}} | \`{"error": "{{error_message_400}}", "code": "{{error_code_400}}"}\` |
| 401 | {{unauthorized_scenario}} | \`{"error": "{{error_message_401}}", "code": "{{error_code_401}}"}\` |
| 404 | {{not_found_scenario}} | \`{"error": "{{error_message_404}}", "code": "{{error_code_404}}"}\` |
| 429 | {{rate_limit_scenario}} | \`{"error": "{{error_message_429}}", "retry_after": {{retry_seconds}}}\` |
| 500 | {{server_error_scenario}} | \`{"error": "{{error_message_500}}", "code": "{{error_code_500}}"}\` |

#### Working Example
\`\`\`curl
curl -X {{http_method_1}} "{{base_url}}{{endpoint_path_1}}" \\
  -H "Authorization: Bearer {{example_token}}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "{{example_request_field_1}}": "{{example_value_1}}",
    "{{example_request_field_2}}": "{{example_value_2}}"
  }'
\`\`\`

**Expected Response:**
\`\`\`json
{
  "{{example_response_field_1}}": "{{example_response_value_1}}",
  "{{example_response_field_2}}": "{{example_response_value_2}}"
}
\`\`\`

### {{endpoint_2_name}}
\`\`\`http
{{http_method_2}} {{endpoint_path_2}}
\`\`\`

*AI: Follow the same detailed structure as above for {{endpoint_2_name}}, including purpose, parameters, request/response schemas, status codes, and working examples.*

### {{endpoint_3_name}}
\`\`\`http
{{http_method_3}} {{endpoint_path_3}}
\`\`\`

*AI: Provide complete documentation for {{endpoint_3_name}} following the established pattern above.*

*AI: Based on the API name and purpose provided, generate documentation for 2-3 additional endpoints that would commonly be part of this API, following the detailed structure established above.*

## Advanced Features

### Pagination
Document pagination patterns for list endpoints:
- **Pagination Method**: {{pagination_type}} (offset/limit, cursor-based, page-based)
- **Default Page Size**: {{default_page_size}} items
- **Maximum Page Size**: {{max_page_size}} items
- **Pagination Headers**: {{pagination_headers}} included in responses

### Filtering and Sorting
Specify query capabilities:
- **Filter Parameters**: {{filter_options}} available for {{filterable_endpoints}}
- **Sort Parameters**: {{sort_options}} for ordering results
- **Search Capabilities**: {{search_functionality}} for {{searchable_fields}}

### Webhooks (if applicable)
Document webhook functionality:
- **Webhook Events**: {{webhook_events}} available for subscription
- **Webhook Payload**: Format and content of webhook notifications
- **Webhook Security**: {{webhook_security_method}} for verifying authenticity

## Error Handling and Troubleshooting
### Standard Error Format
All API errors follow this consistent format:
\`\`\`json
{
  "error": {
    "code": "{{error_code_format}}",
    "message": "{{human_readable_message}}",
    "details": "{{technical_details}}",
    "timestamp": "{{iso_timestamp}}",
    "request_id": "{{trace_id}}"
  }
}
\`\`\`

### Common Error Scenarios
Document frequent error conditions and resolutions:
- **Invalid Authentication**: {{auth_error_resolution}}
- **Rate Limiting**: {{rate_limit_resolution}}
- **Validation Errors**: {{validation_error_patterns}}
- **Server Errors**: {{server_error_handling}}

*AI: Based on the API functionality described above, identify 3-4 additional common error scenarios that developers would likely encounter and provide specific troubleshooting guidance for each.*

## SDK and Integration Examples
### Language-Specific Examples
Provide code examples for popular programming languages:

**JavaScript/Node.js**
\`\`\`javascript
{{javascript_example_code}}
\`\`\`

**Python**
\`\`\`python
{{python_example_code}}
\`\`\`

**{{additional_language}}**
\`\`\`{{language_syntax}}
{{additional_language_example}}
\`\`\`

### Integration Patterns
Document common integration approaches:
- **Synchronous Processing**: {{sync_pattern_description}}
- **Asynchronous Processing**: {{async_pattern_description}}
- **Batch Operations**: {{batch_operation_support}}

## API Versioning and Evolution
### Versioning Strategy
Explain how API versions are managed:
- **Versioning Method**: {{versioning_approach}} (header, URL path, query parameter)
- **Backward Compatibility**: {{compatibility_policy}}
- **Deprecation Process**: {{deprecation_notification_period}}
- **Migration Guide**: Steps for upgrading between versions

### Recent Changes
Document the API evolution:
**Version {{current_version}}** ({{release_date}})
- {{change_1}} - {{change_description_1}}
- {{change_2}} - {{change_description_2}}
- {{change_3}} - {{change_description_3}}

**Previous Versions**
- Version {{previous_version}}: {{previous_changes_summary}}

*AI: Based on the API design and functionality outlined above, provide a comprehensive migration guide that covers breaking changes, new features, and step-by-step upgrade instructions for developers moving from the previous version to the current version.*

## Performance and Best Practices
### Optimization Guidelines
Recommend best practices for API usage:
- **Request Optimization**: {{optimization_techniques}} for efficient API calls
- **Caching Strategies**: {{caching_recommendations}} for {{cacheable_endpoints}}
- **Batch Processing**: {{batching_capabilities}} for bulk operations
- **Connection Management**: {{connection_pooling}} and keep-alive recommendations

### Monitoring and Debugging
Provide debugging assistance:
- **Request Tracing**: {{tracing_header}} for request correlation
- **Logging**: What information is logged for troubleshooting
- **Health Checks**: {{health_endpoint}} for API status monitoring
- **Metrics**: {{available_metrics}} for performance monitoring

*AI: Analyze the complete API documentation above and provide 5-7 specific performance optimization recommendations tailored to this API's functionality and expected usage patterns.*`,
    isBuiltIn: true,
  },
  {
    id: "template-feature-request",
    title: "Feature Request",
    description: "A template for requesting new features.",
    category: "Product",
    content: `# Feature Request: {{feature_name}}

Create a comprehensive feature request proposal for {{feature_name}} in {{product_name}}. Follow these instructions to develop a complete, actionable feature specification:

## Executive Summary
Write a compelling summary that includes:
- The core purpose and value proposition of {{feature_name}}
- Primary problem being solved for {{target_user_type}}
- High-level solution approach and key benefits
- Strategic alignment with {{product_strategy}} goals

## Problem Analysis and Context
Analyze the current situation by documenting:
- **Current Pain Points**: Specific challenges that {{target_user_type}} faces today
- **User Journey Gaps**: Where the current {{product_workflow}} falls short
- **Business Impact**: How these problems affect {{business_metrics}}
- **Competitive Context**: How {{competitor_products}} address similar needs
- **Market Opportunity**: The potential value of solving this problem

*AI: Based on the feature name and target users, expand on the problem analysis above by identifying 3-4 additional pain points that users likely experience related to this functionality.*

## Detailed Feature Specification
Define the proposed solution comprehensively:

### Core Functionality
Describe what {{feature_name}} will accomplish:
- **Primary Capabilities**: {{core_capability_1}}, {{core_capability_2}}, {{core_capability_3}}
- **User Interactions**: How {{target_user_type}} will interact with this feature
- **Integration Points**: How this connects with {{existing_feature_1}} and {{existing_feature_2}}
- **Data Requirements**: What information needs to be captured, stored, or processed

### User Experience Design
Outline the user experience approach:
- **User Interface**: Key UI components and layout for {{interface_type}}
- **User Flow**: Step-by-step journey from {{entry_point}} to {{completion_goal}}
- **Accessibility**: Support for {{accessibility_standards}} requirements
- **Mobile Experience**: Responsive design considerations for {{mobile_platforms}}

## Comprehensive Use Cases
Document specific scenarios where {{feature_name}} provides value:

### Primary Use Cases
1. **{{use_case_1_title}}**: {{use_case_1_description}}
   - User goal: {{use_case_1_goal}}
   - Current workaround: {{use_case_1_workaround}}
   - Improved experience: {{use_case_1_improvement}}

2. **{{use_case_2_title}}**: {{use_case_2_description}}
   - User goal: {{use_case_2_goal}}
   - Current workaround: {{use_case_2_workaround}}
   - Improved experience: {{use_case_2_improvement}}

3. **{{use_case_3_title}}**: {{use_case_3_description}}
   - User goal: {{use_case_3_goal}}
   - Current workaround: {{use_case_3_workaround}}
   - Improved experience: {{use_case_3_improvement}}

### Edge Cases and Advanced Scenarios
4. **{{edge_case_1}}**: How the feature handles unusual or complex situations
5. **{{edge_case_2}}**: Behavior when integrated with {{advanced_workflow}}

*AI: Based on the feature description and primary use cases above, generate 2-3 additional edge cases or advanced scenarios that would be important to consider for this feature.*

## Technical and Functional Requirements

### Must-Have Requirements (P0)
- {{requirement_p0_1}} - core functionality that must be included
- {{requirement_p0_2}} - essential integration with {{critical_system}}
- {{requirement_p0_3}} - baseline performance standard of {{performance_target}}

### Should-Have Requirements (P1)
- {{requirement_p1_1}} - important enhancement that improves user experience
- {{requirement_p1_2}} - integration with {{secondary_system}}
- {{requirement_p1_3}} - advanced functionality for {{power_users}}

### Could-Have Requirements (P2)
- {{requirement_p2_1}} - nice-to-have feature for future consideration
- {{requirement_p2_2}} - optimization for {{specific_use_case}}

## Alternative Solutions Analysis
### Evaluated Alternatives
Document alternative approaches that were considered:

**Alternative 1: {{alternative_solution_1}}**
- Description: {{alternative_1_description}}
- Pros: {{alternative_1_pros}}
- Cons: {{alternative_1_cons}}
- Rejection Reason: {{alternative_1_rejection}}

**Alternative 2: {{alternative_solution_2}}**
- Description: {{alternative_2_description}}
- Pros: {{alternative_2_pros}}
- Cons: {{alternative_2_cons}}
- Rejection Reason: {{alternative_2_rejection}}

### Decision Rationale
Explain why {{feature_name}} is the optimal solution:
- Technical advantages over alternatives
- Better alignment with {{user_needs}} and {{business_goals}}
- Resource efficiency and implementation feasibility
- Long-term scalability and maintainability

## Impact Assessment and Risk Analysis
### Positive Impact
Analyze the benefits of implementing {{feature_name}}:
- **User Experience**: Improvement in {{user_satisfaction_metrics}}
- **Business Value**: Expected impact on {{business_kpi_1}} and {{business_kpi_2}}
- **Operational Efficiency**: Reduction in {{current_inefficiency}}
- **Competitive Advantage**: How this differentiates {{product_name}} from {{competitors}}

### Potential Risks and Mitigation
Identify and address potential concerns:
- **Technical Risk**: {{technical_risk}} - Mitigation: {{technical_mitigation}}
- **User Adoption Risk**: {{adoption_risk}} - Mitigation: {{adoption_mitigation}}
- **Performance Risk**: {{performance_risk}} - Mitigation: {{performance_mitigation}}
- **Resource Risk**: {{resource_risk}} - Mitigation: {{resource_mitigation}}

### Impact on Existing Features
Document how {{feature_name}} affects current functionality:
- **Modified Features**: {{affected_feature_1}}, {{affected_feature_2}}
- **Deprecated Functionality**: {{deprecated_items}} that will be replaced
- **Migration Requirements**: How existing {{user_data}} will be handled

*AI: Based on the feature specification above, identify 2-3 additional risks that could impact the success of this feature and provide specific mitigation strategies for each.*

## Success Metrics and Validation
### Primary Success Metrics
Define how success will be measured:
- **Adoption Metrics**: {{adoption_target}} users adopting {{feature_name}} within {{adoption_timeframe}}
- **Usage Metrics**: {{usage_frequency}} usage frequency per {{user_segment}}
- **Business Impact**: {{business_impact_target}} improvement in {{key_business_metric}}
- **User Satisfaction**: {{satisfaction_target}} satisfaction score in {{feedback_method}}

### Secondary Metrics
Track additional indicators of success:
- **Performance Metrics**: {{performance_metric_1}}, {{performance_metric_2}}
- **Support Metrics**: Reduction in {{support_ticket_type}} tickets
- **Engagement Metrics**: Improvement in {{engagement_metric}}

### Validation Approach
Plan how to validate the feature's success:
- **A/B Testing**: Compare {{feature_name}} adoption vs. {{control_group}}
- **User Feedback**: Collect feedback through {{feedback_channels}}
- **Analytics**: Monitor {{analytics_events}} using {{analytics_platform}}
- **Success Timeline**: Measure {{short_term_metrics}} after {{short_term_period}}, {{long_term_metrics}} after {{long_term_period}}

## Implementation Considerations
### Development Effort Estimation
Provide rough estimates for planning:
- **Backend Development**: {{backend_effort}} for {{backend_components}}
- **Frontend Development**: {{frontend_effort}} for {{frontend_components}}
- **Testing and QA**: {{testing_effort}} for comprehensive validation
- **Documentation**: {{documentation_effort}} for user and developer docs

### Dependencies and Prerequisites
Identify required foundations:
- **Technical Dependencies**: {{tech_dependency_1}}, {{tech_dependency_2}}
- **Design Dependencies**: {{design_dependency}} from UX team
- **Data Dependencies**: {{data_dependency}} availability
- **Third-party Dependencies**: {{external_dependency}} integration

### Launch Strategy
Outline rollout approach:
- **Beta Testing**: {{beta_testing_plan}} with {{beta_user_count}} users
- **Phased Rollout**: {{rollout_phase_1}} → {{rollout_phase_2}} → {{full_release}}
- **Feature Flags**: Gradual enablement using {{feature_flag_system}}
- **Communication Plan**: User notification via {{communication_channels}}

## Supporting Materials and Context
Document additional relevant information:
- **User Research**: {{research_findings}} from {{research_method}}
- **Design Mockups**: {{design_asset_location}} showing {{key_interfaces}}
- **Technical Specifications**: {{tech_spec_reference}} for detailed implementation
- **Competitive Analysis**: {{competitor_analysis}} of similar features
- **User Feedback**: {{user_feedback_source}} requesting this functionality

*AI: Based on the comprehensive feature request above, provide a prioritized implementation roadmap that breaks down the development into logical phases, considering dependencies, risk mitigation, and value delivery to users.*`,
    isBuiltIn: true,
  },
  {
    id: "template-system-prompt",
    title: "System Prompt",
    description: "A template for creating system prompts for LLMs.",
    category: "AI",
    content: `# System Prompt: {{prompt_purpose}}

Create a comprehensive system prompt that defines an AI assistant specialized in {{domain_expertise}} for {{target_application}}. Follow these instructions to develop a complete AI persona and operational framework:

## Core Identity Definition
Establish the AI's foundational identity by specifying:
- **Primary Role**: You are {{ai_role}} (e.g., expert consultant, technical advisor, creative assistant)
- **Domain Specialization**: Specialized in {{expertise_areas}} with deep knowledge of {{specialized_knowledge}}
- **Professional Context**: Operating within {{professional_context}} to serve {{target_users}}
- **Personality Framework**: Embody {{personality_traits}} while maintaining {{communication_approach}}

*AI: Based on the role and domain specified above, expand the identity definition by adding 2-3 additional personality characteristics that would make this AI assistant more effective and trustworthy in its specialized domain.*

## Comprehensive Capabilities Framework
Define the specific abilities and skills the AI possesses:

### Core Competencies
- **{{capability_1}}**: {{capability_1_description}} including {{specific_skills_1}}
- **{{capability_2}}**: {{capability_2_description}} with expertise in {{specific_skills_2}}
- **{{capability_3}}**: {{capability_3_description}} covering {{specific_skills_3}}
- **{{capability_4}}**: {{capability_4_description}} specializing in {{specific_skills_4}}

### Advanced Capabilities
- **Analysis and Reasoning**: Apply {{analytical_methods}} to {{problem_types}}
- **Creative Problem Solving**: Generate {{creative_solutions}} for {{challenge_categories}}
- **Knowledge Synthesis**: Integrate information from {{knowledge_sources}} to provide {{output_types}}
- **Adaptive Communication**: Adjust explanations for {{audience_levels}} from {{beginner_level}} to {{expert_level}}

### Technical Proficiencies
- **Tools and Platforms**: Proficient with {{technical_tools}} and {{software_platforms}}
- **Methodologies**: Experienced in {{methodologies}} and {{frameworks}}
- **Standards and Protocols**: Knowledgeable about {{industry_standards}} and {{best_practices}}

*AI: Based on the domain expertise and role defined above, identify 3-4 additional capabilities that would be essential for this AI assistant to perform effectively in its specialized area.*

## Operational Constraints and Boundaries
Establish clear limitations and ethical guidelines:

### Scope Limitations
- **Domain Boundaries**: Cannot provide advice on {{excluded_domain_1}} or {{excluded_domain_2}}
- **Expertise Limits**: Limited to {{knowledge_cutoff_date}} information and cannot access {{restricted_data}}
- **Decision Authority**: Cannot make {{restricted_decisions}} or provide {{regulated_advice}}
- **Data Access**: No access to {{confidential_systems}} or {{personal_data}}

### Ethical Guidelines
- **Professional Standards**: Adhere to {{professional_ethics}} and {{industry_codes}}
- **Bias Mitigation**: Actively avoid {{bias_types}} and consider {{diversity_factors}}
- **Transparency**: Clearly indicate {{uncertainty_levels}} and {{knowledge_limitations}}
- **Privacy Protection**: Respect {{privacy_standards}} and {{data_protection_requirements}}

### Safety Constraints
- **Risk Assessment**: Always consider {{safety_factors}} when providing {{advice_types}}
- **Disclaimer Requirements**: Include appropriate disclaimers for {{high_risk_areas}}
- **Escalation Triggers**: Recommend human expert consultation for {{complex_scenarios}}

## Communication Style and Interaction Guidelines
Define how the AI should communicate and interact:

### Tone and Voice Characteristics
- **Primary Tone**: {{communication_tone}} (e.g., professional, conversational, authoritative, empathetic)
- **Formality Level**: {{formality_level}} appropriate for {{professional_context}}
- **Enthusiasm Level**: {{enthusiasm_approach}} when discussing {{subject_matter}}
- **Confidence Expression**: {{confidence_style}} while acknowledging {{uncertainty_areas}}

### Response Structure and Format
- **Opening Approach**: Begin responses with {{opening_style}} that {{opening_purpose}}
- **Information Organization**: Structure responses using {{organization_method}} with {{formatting_preferences}}
- **Detail Level**: Provide {{detail_depth}} explanations tailored to {{user_expertise_assumption}}
- **Conclusion Style**: End with {{conclusion_approach}} that {{conclusion_purpose}}

### Question Handling Strategy
- **Clarification Approach**: Ask {{clarification_types}} questions when {{clarification_triggers}}
- **Unknown Information**: Respond to knowledge gaps by {{unknown_response_strategy}}
- **Complex Queries**: Break down {{complex_topics}} into {{breakdown_approach}}
- **Follow-up Guidance**: Suggest {{follow_up_actions}} and {{next_steps}}

*AI: Based on the communication guidelines above, provide 3-4 specific examples of how this AI should phrase responses to demonstrate the defined tone, structure, and interaction style.*

## Specialized Response Formats and Templates
Define standardized response patterns for common scenarios:

### For {{scenario_type_1}} Queries:
Structure responses as follows:
1. {{response_element_1}}: Brief overview of {{content_focus_1}}
2. {{response_element_2}}: Detailed analysis of {{content_focus_2}}
3. {{response_element_3}}: Practical recommendations for {{content_focus_3}}
4. {{response_element_4}}: Next steps or follow-up considerations

### For {{scenario_type_2}} Requests:
Use this template:
- **Context Assessment**: {{context_analysis_approach}}
- **Option Evaluation**: {{evaluation_criteria}} for {{option_types}}
- **Recommendation**: {{recommendation_format}} with {{justification_style}}
- **Implementation Guidance**: {{implementation_details}} and {{success_factors}}

### For {{scenario_type_3}} Discussions:
Follow this pattern:
- **Current State Analysis**: {{current_state_assessment}}
- **Gap Identification**: {{gap_analysis_method}}
- **Solution Framework**: {{solution_approach}} with {{framework_components}}
- **Action Plan**: {{planning_structure}} with {{milestone_definition}}

## Interaction Examples and Demonstrations
Provide concrete examples of appropriate responses:

### Example 1: {{example_scenario_1}}
**User Input**: {{example_user_query_1}}

**AI Response**: {{example_ai_response_1}}

**Key Elements Demonstrated**: {{demonstrated_elements_1}}

### Example 2: {{example_scenario_2}}
**User Input**: {{example_user_query_2}}

**AI Response**: {{example_ai_response_2}}

**Key Elements Demonstrated**: {{demonstrated_elements_2}}

### Example 3: {{example_scenario_3}}
**User Input**: {{example_user_query_3}}

**AI Response**: {{example_ai_response_3}}

**Key Elements Demonstrated**: {{demonstrated_elements_3}}

*AI: Generate 2-3 additional interaction examples that showcase different aspects of the AI's capabilities, communication style, and response format, particularly focusing on edge cases or challenging scenarios.*

## Quality Assurance and Performance Guidelines
Establish standards for response quality and consistency:

### Response Quality Criteria
- **Accuracy Standards**: Verify information against {{accuracy_sources}} and indicate {{confidence_levels}}
- **Completeness Requirements**: Address all aspects of {{query_components}} while staying within {{scope_boundaries}}
- **Relevance Filtering**: Focus on {{relevance_criteria}} and avoid {{irrelevant_content}}
- **Clarity Standards**: Use {{clarity_techniques}} to ensure {{comprehension_levels}}

### Consistency Maintenance
- **Terminology Usage**: Consistently use {{standard_terminology}} and {{defined_concepts}}
- **Approach Alignment**: Maintain {{methodological_consistency}} across similar {{query_types}}
- **Value Alignment**: Ensure responses reflect {{core_values}} and {{ethical_principles}}

### Continuous Improvement Indicators
- **Learning Signals**: Recognize {{learning_opportunities}} from {{feedback_types}}
- **Adaptation Triggers**: Adjust approach based on {{user_preferences}} and {{context_changes}}
- **Performance Metrics**: Monitor {{success_indicators}} and {{quality_measures}}

## Special Instructions and Advanced Directives
Document specific behavioral requirements and advanced capabilities:

### Context Awareness
- **Session Continuity**: Maintain awareness of {{conversation_context}} and {{previous_interactions}}
- **User Adaptation**: Adjust responses based on {{user_signals}} and {{expertise_indicators}}
- **Cultural Sensitivity**: Consider {{cultural_factors}} and {{regional_differences}}

### Advanced Reasoning Requirements
- **Multi-step Analysis**: Break complex problems into {{analytical_steps}} using {{reasoning_frameworks}}
- **Scenario Planning**: Consider {{scenario_variables}} and {{outcome_probabilities}}
- **Risk Assessment**: Evaluate {{risk_factors}} and provide {{mitigation_strategies}}

### Integration and Collaboration
- **Tool Integration**: Leverage {{available_tools}} to enhance {{response_capabilities}}
- **Expert Collaboration**: Recognize when to suggest {{expert_consultation}} for {{complex_domains}}
- **Resource Utilization**: Reference {{authoritative_sources}} and {{best_practice_guides}}

*AI: Based on the complete system prompt definition above, analyze the persona and operational framework to identify any gaps or additional instructions that would improve the AI's effectiveness in its specialized domain.*`,
    isBuiltIn: true,
  },
];
