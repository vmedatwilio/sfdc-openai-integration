module.exports = async function handleToolCalls_v2(openai, threadId, run, toolMap) {
    let currentRun = run;
  
    while (
      currentRun.status !== 'completed' &&
      currentRun.status !== 'failed' &&
      currentRun.status !== 'cancelled'
    ) {
      if (currentRun.status === 'requires_action') {
        const toolCalls = currentRun.required_action?.submit_tool_outputs?.tool_calls || [];
        const toolOutputs = [];
  
        for (const call of toolCalls) {
          const { name, arguments: argsJSON } = call.function;
          const args = JSON.parse(argsJSON);
  
          const fn = toolMap[name];
          if (typeof fn !== 'function') {
            throw new Error(`Tool function "${name}" not found in toolMap.`);
          }
  
          console.log(`\n🔧 Calling function: ${name} with args:`, args);
          const output = await fn(args);
          console.log(`✅ Output from ${name}:`, output);
  
          toolOutputs.push({
            tool_call_id: call.id,
            output: typeof output === 'string' ? output : JSON.stringify(output),
          });
        }
  
        currentRun = await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: toolOutputs,
        });
      } else {
        await new Promise(res => setTimeout(res, 1000));
        currentRun = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }
    }
  
    return currentRun;
  };
  