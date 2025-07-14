import { Snippet } from "../types";

export const defaultSnippets: Snippet[] = [
  {
    id: "snippet-ux-checklist",
    title: "Developer-grade UX Checklist",
    category: "UX",
    content: `## UX Checklist
- [ ] Responsive design works on all target devices
- [ ] Keyboard navigation is fully supported
- [ ] All interactive elements have appropriate hover/focus states
- [ ] Error states are clearly communicated
- [ ] Loading states are indicated
- [ ] Empty states are handled gracefully
- [ ] Form validation provides clear feedback
- [ ] Color contrast meets WCAG AA standards
- [ ] Critical actions have confirmation steps
- [ ] Success messages confirm completed actions

---

*AI, please review the following interface/design against the checklist above and identify any missing items or areas for improvement.*

{{interface_to_review}}`,
    isBuiltIn: true,
  },
  {
    id: "snippet-code-review-criteria",
    title: "Code Review Criteria",
    category: "Development",
    content: `## Code Review Criteria
1. **Correctness**: Does the code correctly implement the requirements?
2. **Maintainability**: Is the code easy to understand and modify?
3. **Performance**: Are there any performance concerns?
4. **Security**: Are there any security vulnerabilities?
5. **Testing**: Is the code adequately tested?
6. **Documentation**: Is the code well-documented?
7. **Error Handling**: Are errors handled appropriately?
8. **Edge Cases**: Are edge cases considered?
9. **Consistency**: Does the code follow project conventions?
10. **Reusability**: Could any parts be made more reusable?

---

*AI, please review the following code against the criteria above and provide detailed feedback for each applicable area.*

{{code_to_review}}`,
    isBuiltIn: true,
  },
  {
    id: "snippet-persona-template",
    title: "User Persona Template",
    category: "Product",
    content: `## User Persona: {{persona_name}}

### Demographics
- **Age**: {{age}} <!-- e.g., 28-35 years old -->
- **Occupation**: {{occupation}} <!-- e.g., Marketing Manager, Software Developer -->
- **Location**: {{location}} <!-- e.g., Urban, Suburban, specific city -->
- **Education**: {{education_level}} <!-- e.g., Bachelor's degree, High school, PhD -->

### Goals
- {{primary_goal}} <!-- Main objective this persona wants to achieve -->
- {{secondary_goal}} <!-- Important but not primary goal -->
- {{tertiary_goal}} <!-- Nice-to-have goal -->

### Pain Points
- {{pain_point_1}} <!-- Biggest frustration or challenge -->
- {{pain_point_2}} <!-- Second major pain point -->
- {{pain_point_3}} <!-- Third significant challenge -->

### Behaviors
- {{behavior_1}} <!-- Key behavioral pattern -->
- {{behavior_2}} <!-- Important habit or tendency -->
- {{behavior_3}} <!-- Notable behavioral trait -->

### Technology Comfort
{{tech_comfort_level}} <!-- Describe their relationship with technology: novice, intermediate, expert -->

### Quote
"{{persona_quote}}" <!-- A quote that captures their attitude, motivation, or key need -->`,
    isBuiltIn: true,
  },
  {
    id: "snippet-api-endpoint",
    title: "API Endpoint Documentation",
    category: "Development",
    content: `You are a senior API developer and technical writer. Your task is to generate comprehensive API endpoint documentation based on the provided code or description.

{{api_code_or_description}}

Please create detailed API documentation following this exact format:

### Endpoint: \`[HTTP Method] [Path]\`

**Description**: [Brief description of what this endpoint does]

**Authentication Required**: [Yes/No]

**Request Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| [param1]  | [type] | [Yes/No] | [Description] |
| [param2]  | [type] | [Yes/No] | [Description] |

**Request Body**:
\`\`\`json
{
  "property1": "value1",
  "property2": "value2"
}
\`\`\`

**Response**:
\`\`\`json
{
  "property1": "value1",
  "property2": "value2"
}
\`\`\`

**Status Codes**:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error

**Example**:
\`\`\`curl
curl -X [METHOD] "[BASE_URL][ENDPOINT]" \\
  -H "Authorization: Bearer [TOKEN]" \\
  -H "Content-Type: application/json" \\
  -d '{
    "property1": "value1",
    "property2": "value2"
  }'
\`\`\``,
    isBuiltIn: true,
  },
  {
    id: "snippet-test-cases",
    title: "Test Cases Template",
    category: "Development",
    content: `## Test Cases for {{feature_name}}

### Test Case 1: {{test_case_1_name}}
- **Description**: {{test_case_1_description}} <!-- Brief description of what this test validates -->
- **Preconditions**: {{test_case_1_preconditions}} <!-- Any setup or conditions needed before testing -->
- **Steps**:
  1. {{test_step_1_1}} <!-- First action to perform -->
  2. {{test_step_1_2}} <!-- Second action to perform -->
  3. {{test_step_1_3}} <!-- Third action to perform -->
- **Expected Result**: {{test_case_1_expected}} <!-- What should happen if the test passes -->
- **Actual Result**: {{test_case_1_actual}} <!-- What actually happened during testing -->
- **Status**: {{test_case_1_status}} <!-- Pass/Fail/Blocked/Not Executed -->
- **Notes**: {{test_case_1_notes}} <!-- Any additional observations or issues -->

### Test Case 2: {{test_case_2_name}}
- **Description**: {{test_case_2_description}} <!-- Brief description of what this test validates -->
- **Preconditions**: {{test_case_2_preconditions}} <!-- Any setup or conditions needed before testing -->
- **Steps**:
  1. {{test_step_2_1}} <!-- First action to perform -->
  2. {{test_step_2_2}} <!-- Second action to perform -->
  3. {{test_step_2_3}} <!-- Third action to perform -->
- **Expected Result**: {{test_case_2_expected}} <!-- What should happen if the test passes -->
- **Actual Result**: {{test_case_2_actual}} <!-- What actually happened during testing -->
- **Status**: {{test_case_2_status}} <!-- Pass/Fail/Blocked/Not Executed -->
- **Notes**: {{test_case_2_notes}} <!-- Any additional observations or issues -->`,
    isBuiltIn: true,
  },
  {
    id: "snippet-meeting-agenda",
    title: "Meeting Agenda Template",
    category: "Productivity",
    content: `# Meeting Agenda: {{meeting_title}}

**Date**: {{meeting_date}} <!-- e.g., March 15, 2024 -->
**Time**: {{start_time}} - {{end_time}} <!-- e.g., 2:00 PM - 3:00 PM EST -->
**Location**: {{meeting_location}} <!-- e.g., Conference Room A, Zoom link, etc. -->
**Facilitator**: {{facilitator_name}} <!-- Person leading the meeting -->
**Attendees**: {{attendee_list}} <!-- List of participants -->

## Objectives
- {{objective_1}} <!-- Primary goal for this meeting -->
- {{objective_2}} <!-- Secondary goal -->
- {{objective_3}} <!-- Additional objective if needed -->

## Agenda Items
1. **{{topic_1}}** ({{topic_1_duration}} min)
   - {{topic_1_details}} <!-- Subtopic/Discussion points -->
   - {{topic_1_outcome}} <!-- Expected outcome -->
   - {{topic_1_owner}} <!-- Person responsible -->

2. **{{topic_2}}** ({{topic_2_duration}} min)
   - {{topic_2_details}} <!-- Subtopic/Discussion points -->
   - {{topic_2_outcome}} <!-- Expected outcome -->
   - {{topic_2_owner}} <!-- Person responsible -->

3. **{{topic_3}}** ({{topic_3_duration}} min)
   - {{topic_3_details}} <!-- Subtopic/Discussion points -->
   - {{topic_3_outcome}} <!-- Expected outcome -->
   - {{topic_3_owner}} <!-- Person responsible -->

## Pre-work/Reading
- {{prework_item_1}} <!-- Materials to review before meeting -->
- {{prework_item_2}} <!-- Additional preparation required -->

## Action Items from Previous Meeting
- {{previous_action_1}} - {{previous_action_1_owner}} - {{previous_action_1_status}} <!-- Status: Complete/In Progress/Blocked -->
- {{previous_action_2}} - {{previous_action_2_owner}} - {{previous_action_2_status}} <!-- Status: Complete/In Progress/Blocked -->

## Next Steps
- {{next_steps}} <!-- To be filled during/after the meeting -->`,
    isBuiltIn: true,
  },
  {
    id: "snippet-ai-constraints",
    title: "AI Constraints",
    category: "AI",
    content: `## AI Constraints

1. **Knowledge Cutoff**: Your knowledge has a cutoff date of [date]. Do not pretend to know information beyond this date.

2. **Factuality**: If you're unsure about a fact, acknowledge your uncertainty rather than making up information.

3. **Harmful Content**: Do not generate content that could be harmful, illegal, unethical, or deceptive.

4. **Privacy**: Do not ask for or store personal identifying information.

5. **Bias**: Strive to avoid biased, discriminatory, or stereotypical responses.

6. **Scope**: Stay within your defined capabilities and don't claim to have abilities you don't possess.

7. **Citations**: When providing factual information, cite sources when possible.

8. **Transparency**: Be transparent about being an AI assistant.

---

*AI, please review the following AI system prompt or behavior against the constraints above and identify any potential violations or areas of concern.*

{{ai_prompt_to_review}}`,
    isBuiltIn: true,
  },
  {
    id: "snippet-persona-traits",
    title: "AI Persona Traits",
    category: "AI",
    content: `## AI Persona Traits

### Personality Dimensions
- **Formality**: {{formality_level}} <!-- Formal/Neutral/Casual -->
- **Friendliness**: {{friendliness_level}} <!-- Professional/Friendly/Warm -->
- **Verbosity**: {{verbosity_level}} <!-- Concise/Balanced/Detailed -->
- **Creativity**: {{creativity_level}} <!-- Practical/Balanced/Creative -->
- **Humor**: {{humor_level}} <!-- Serious/Occasional humor/Playful -->
- **Empathy**: {{empathy_level}} <!-- Neutral/Empathetic/Very empathetic -->

### Voice Characteristics
- **Tone**: {{voice_tone}} <!-- Authoritative/Collaborative/Supportive -->
- **Pacing**: {{response_pacing}} <!-- Direct/Methodical/Exploratory -->
- **Vocabulary**: {{vocabulary_complexity}} <!-- Simple/Moderate/Advanced -->
- **Structure**: {{response_structure}} <!-- Linear/Flexible/Conversational -->`,
    isBuiltIn: true,
  },
];
