# Prompt Brief: Friez n Burgz Training Content Generator

**Goal:** Transform raw staff handbook text into structured, interactive training courses for the Friez n Burgz application.

**Context:** Friez n Burgz is a premium burger chain. We want staff training to be engaging, interactive, and mobile-friendly. We are moving away from long text documents to "Courses" composed of bite-sized "Modules".

**Input Data:**
*(Paste your raw handbook text here, e.g., the Allergen Procedure, Customer Scripts, etc.)*

**Required Output Format:**
Please analyze the input text and generate a JSON object following this specific schema. Break the content down into logical "Courses" (e.g., "Allergen Safety", "Customer Service"). Within each course, create "Modules" of different types to keep it engaging.

**Module Types:**
1.  `lesson`: Standard markdown text for reading. Keep it short.
2.  `flashcards`: A set of front/back cards for memorizing terms or facts.
3.  `scenario`: A branching interaction where the user chooses a response.
4.  `quiz`: A multiple-choice assessment.

**JSON Schema:**

```json
{
  "courses": [
    {
      "id": "course_id_snake_case",
      "title": "Course Title",
      "description": "Brief description of what the staff member will learn.",
      "icon": "ShieldAlert", // Lucide icon name
      "modules": [
        {
          "id": "module_1",
          "type": "lesson", // or 'flashcards', 'scenario', 'quiz'
          "title": "Module Title",
          "content": "# Markdown Content Here" // Only for 'lesson' type
        },
        {
          "id": "module_2",
          "type": "flashcards",
          "title": "Key Terms",
          "cards": [
            { "front": "Cross-Contamination", "back": "The transfer of bacteria or allergens..." }
          ]
        },
        {
          "id": "module_3",
          "type": "scenario",
          "title": "The Gluten Inquiry",
          "initialState": "start",
          "states": {
            "start": {
              "text": "A customer approaches and says: 'I have a severe gluten allergy. What can I eat?'",
              "options": [
                { "text": "Recommend the Chicken Burgz immediately.", "next": "wrong_recommendation" },
                { "text": "Acknowledge, Listen, and Check the Matrix.", "next": "check_matrix" }
              ]
            },
            "wrong_recommendation": {
              "text": "Incorrect. You must never guess. The Chicken Burgz coating contains gluten.",
              "isTerminal": true,
              "success": false
            },
            "check_matrix": {
              "text": "Correct! You check the matrix and see the Beef Patty is GF, but the bun is not.",
              "options": [
                { "text": "Offer the burger without a bun or with a GF bun.", "next": "offer_options" }
              ]
            },
            "offer_options": {
              "text": "Great job. You've offered safe alternatives.",
              "isTerminal": true,
              "success": true
            }
          }
        },
        {
          "id": "module_4",
          "type": "quiz",
          "title": "Knowledge Check",
          "questions": [
            {
              "question": "What is the first step in the Allergen Procedure?",
              "options": ["Guess", "Ask & Listen", "Check Matrix"],
              "answer": "Ask & Listen"
            }
          ]
        }
      ]
    }
  ]
}
```

**Instructions for ChatGPT:**
1.  Read the raw handbook text provided.
2.  Structure it into the JSON format above.
3.  Be creative! Turn dry procedures into `scenarios` where possible.
4.  Create `flashcards` for important definitions.
5.  Ensure the JSON is valid and ready to be used in the application.
