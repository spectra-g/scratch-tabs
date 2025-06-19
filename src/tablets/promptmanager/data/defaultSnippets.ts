import { Snippet } from '../types';

export const defaultSnippets: Snippet[] = [
  {
    id: 'snippet-ux-checklist',
    title: 'Developer-grade UX Checklist',
    category: 'UX',
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
- [ ] Success messages confirm completed actions`,
    isBuiltIn: true
  },
  {
    id: 'snippet-code-review-criteria',
    title: 'Code Review Criteria',
    category: 'Development',
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
10. **Reusability**: Could any parts be made more reusable?`,
    isBuiltIn: true
  },
  {
    id: 'snippet-persona-template',
    title: 'User Persona Template',
    category: 'Product',
    content: `## User Persona: [Name]

### Demographics
- **Age**: [Age]
- **Occupation**: [Occupation]
- **Location**: [Location]
- **Education**: [Education Level]

### Goals
- [Primary Goal]
- [Secondary Goal]
- [Tertiary Goal]

### Pain Points
- [Pain Point 1]
- [Pain Point 2]
- [Pain Point 3]

### Behaviors
- [Behavior 1]
- [Behavior 2]
- [Behavior 3]

### Technology Comfort
[Description of technology comfort level]

### Quote
"[A quote that captures their attitude or need]"`,
    isBuiltIn: true
  },
  {
    id: 'snippet-api-endpoint',
    title: 'API Endpoint Documentation',
    category: 'Development',
    content: `### Endpoint: \`[HTTP Method] [Path]\`

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
    isBuiltIn: true
  },
  {
    id: 'snippet-test-cases',
    title: 'Test Cases Template',
    category: 'Development',
    content: `## Test Cases for [Feature]

### Test Case 1: [Test Case Name]
- **Description**: [Brief description of the test case]
- **Preconditions**: [Any preconditions that must be met]
- **Steps**:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Expected Result**: [What should happen if the test passes]
- **Actual Result**: [What actually happened]
- **Status**: [Pass/Fail]
- **Notes**: [Any additional notes]

### Test Case 2: [Test Case Name]
- **Description**: [Brief description of the test case]
- **Preconditions**: [Any preconditions that must be met]
- **Steps**:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Expected Result**: [What should happen if the test passes]
- **Actual Result**: [What actually happened]
- **Status**: [Pass/Fail]
- **Notes**: [Any additional notes]`,
    isBuiltIn: true
  },
  {
    id: 'snippet-meeting-agenda',
    title: 'Meeting Agenda Template',
    category: 'Productivity',
    content: `# Meeting Agenda: [Meeting Title]

**Date**: [Date]
**Time**: [Start Time] - [End Time]
**Location**: [Location/Virtual Link]
**Facilitator**: [Name]
**Attendees**: [List of attendees]

## Objectives
- [Objective 1]
- [Objective 2]
- [Objective 3]

## Agenda Items
1. **[Topic 1]** (XX min)
   - [Subtopic/Discussion points]
   - [Expected outcome]
   - [Owner]

2. **[Topic 2]** (XX min)
   - [Subtopic/Discussion points]
   - [Expected outcome]
   - [Owner]

3. **[Topic 3]** (XX min)
   - [Subtopic/Discussion points]
   - [Expected outcome]
   - [Owner]

## Pre-work/Reading
- [Item 1]
- [Item 2]

## Action Items from Previous Meeting
- [Action Item 1] - [Owner] - [Status]
- [Action Item 2] - [Owner] - [Status]

## Next Steps
- [To be filled during/after the meeting]`,
    isBuiltIn: true
  },
  {
    id: 'snippet-ai-constraints',
    title: 'AI Constraints',
    category: 'AI',
    content: `## AI Constraints

1. **Knowledge Cutoff**: Your knowledge has a cutoff date of [date]. Do not pretend to know information beyond this date.

2. **Factuality**: If you're unsure about a fact, acknowledge your uncertainty rather than making up information.

3. **Harmful Content**: Do not generate content that could be harmful, illegal, unethical, or deceptive.

4. **Privacy**: Do not ask for or store personal identifying information.

5. **Bias**: Strive to avoid biased, discriminatory, or stereotypical responses.

6. **Scope**: Stay within your defined capabilities and don't claim to have abilities you don't possess.

7. **Citations**: When providing factual information, cite sources when possible.

8. **Transparency**: Be transparent about being an AI assistant.`,
    isBuiltIn: true
  },
  {
    id: 'snippet-persona-traits',
    title: 'AI Persona Traits',
    category: 'AI',
    content: `## AI Persona Traits

### Personality Dimensions
- **Formality**: [Formal/Neutral/Casual]
- **Friendliness**: [Professional/Friendly/Warm]
- **Verbosity**: [Concise/Balanced/Detailed]
- **Creativity**: [Practical/Balanced/Creative]
- **Humor**: [Serious/Occasional humor/Playful]
- **Empathy**: [Neutral/Empathetic/Very empathetic]

### Voice Characteristics
- **Tone**: [Authoritative/Collaborative/Supportive]
- **Pacing**: [Direct/Methodical/Exploratory]
- **Vocabulary**: [Simple/Moderate/Advanced]
- **Structure**: [Linear/Flexible/Conversational]`,
    isBuiltIn: true
  }
];