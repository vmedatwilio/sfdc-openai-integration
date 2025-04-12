const dotenv = require('dotenv');
const express = require('express');
const jsforce = require('jsforce');
const { OpenAI } = require('openai');
const handleToolCalls_v2 = require('./utils/handleToolCalls_v2');

// Tool functions
const toolMap = require('./tools/toolFunctions_v1');
const toolRegistry = require('./tools/toolRegistry_v1');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


async function runAssistant(userPrompt) {

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, // Read from .env
      });
    
    // Step 2: Create an Assistant (if not created before)
    const assistant = await openai.beta.assistants.create({
        name: "Salesforce AI Assistant",
        instructions: 
        `You are a Salesforce AI assistant. Your task is to query Salesforce data using function calls.
        - When a user requests data (e.g., "Find all CTAs for Edge Communications"), 
          determine the correct Salesforce object and retrieve the relevant records.
        - If the user mentions a **child-parent relationship** (e.g., "Find all bookings of an Experience"),
          first find the **parent record** before querying the child records.
        - Always follow this function call sequence:
          1. Identify the correct object name (IdentifySalesforceObjectByName).
          2. Find the parent object if needed (IdentifyParentObject).
          3. Identify the lookup field between child and parent (GetRelationshipField).
          4. Find the parent record (FindSalesforceRecord).
          5. Query related records using the parent ID (QueryRelatedRecordsByParent).
        - If a query does not need a parent-child relationship, skip steps 2 & 3.
        - Return only the requested fields and avoid redundant API calls.
    `,
        tools:  toolRegistry, // Allows using files
        model: "gpt-4o-mini",
    });
    console.log(`Assistant created with ID: ${assistant.id}`);

  // Step 1: Create thread
  const thread = await openai.beta.threads.create();

  // Step 2: Add user message
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: userPrompt,
  });

  // Step 3: Run Assistant
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id, // Replace with your Assistant ID
  });

  // Step 4: Handle tool calls
  const finalRun = await handleToolCalls_v2(openai, thread.id, run, toolMap);

  // Step 5: Get final assistant response
  const messages = await openai.beta.threads.messages.list(thread.id);
  const response = messages.data.find(m => m.role === 'assistant');

  console.log('\n🧠 Final Assistant Response:\n');
  console.log(response?.content?.[0]?.text?.value || 'No response.');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.post('/initiateChat', async (req, res) => {

    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const accessToken = authHeader.split(" ")[1];
    //sfToken= accessToken;
    const userInput = req.body.userInput;
    //res.json({ status: 'processing', message: 'Summary is being generated' });
    const response = await runAssistant(userInput);
    res.json({ reply: response });
});

/*runAssistant(`find all the bookings of my contact Eva Town`)
  .catch(console.error);*/