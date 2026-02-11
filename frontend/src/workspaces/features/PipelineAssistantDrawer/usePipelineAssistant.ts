import { useCallback, useRef, useState } from "react";

export type MessageRole = "user" | "assistant";

export interface AssistantMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface PipelineContext {
  pipelineName?: string;
  pipelineCode?: string;
  currentFileName?: string;
  currentFileContent?: string;
}

interface UsePipelineAssistantOptions {
  context?: PipelineContext;
}

/**
 * Mock AI service for the pipeline assistant.
 * Replace the `generateMockResponse` function with a real API call
 * to your AI backend when ready.
 */
function generateMockResponse(
  userMessage: string,
  context?: PipelineContext,
): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("help") || lower.includes("what can you do")) {
    return `I can help you with your OpenHEXA pipeline${context?.pipelineName ? ` "${context.pipelineName}"` : ""}. Here are some things I can assist with:

- **Writing pipeline code** — I can suggest Python code patterns for OpenHEXA pipelines
- **Configuration** — Help setting up parameters, connections, and scheduling
- **Troubleshooting** — Debug run errors and common issues
- **Best practices** — Guidance on structuring your pipeline for maintainability

What would you like help with?`;
  }

  if (lower.includes("parameter") || lower.includes("config")) {
    return `To add parameters to your OpenHEXA pipeline, use the \`@parameter\` decorator in your pipeline code:

\`\`\`python
from openhexa.sdk import current_run, pipeline, parameter

@parameter("country", type=str, help="Country ISO code")
@parameter("year", type=int, default=2024, help="Year to process")
@pipeline("my-pipeline", name="My Pipeline")
def my_pipeline(country: str, year: int):
    current_run.log_info(f"Processing {country} for {year}")
\`\`\`

Parameters will appear in the Run dialog so users can configure them before execution.`;
  }

  if (lower.includes("error") || lower.includes("fail") || lower.includes("debug")) {
    return `Here are some common troubleshooting steps for OpenHEXA pipeline errors:

1. **Check the run logs** — Go to the Runs tab and inspect the output for the failed run
2. **Verify connections** — Ensure all database/API connections referenced in the code are configured in the workspace
3. **Check dependencies** — Make sure all required Python packages are listed in your \`requirements.txt\`
4. **Memory issues** — If processing large datasets, consider chunking your data or increasing the pipeline timeout

Would you like me to help debug a specific error?`;
  }

  if (lower.includes("schedule") || lower.includes("cron")) {
    return `You can set up scheduling for your pipeline from the **Scheduling and Notifications** tab. OpenHEXA supports cron expressions for flexible scheduling.

Common examples:
- \`0 6 * * *\` — Every day at 6:00 AM
- \`0 0 * * 1\` — Every Monday at midnight
- \`0 */6 * * *\` — Every 6 hours

You can also configure email notifications to alert recipients when a run completes or fails.`;
  }

  if (lower.includes("connection") || lower.includes("database") || lower.includes("dhis2")) {
    return `To use connections in your pipeline, first ensure the connection is configured in the workspace. Then access it in your code:

\`\`\`python
from openhexa.sdk import current_run, pipeline, workspace

@pipeline("my-pipeline", name="My Pipeline")
def my_pipeline():
    # Access a PostgreSQL connection
    con = workspace.postgresql_connection("my-db")
    
    # Access a DHIS2 connection
    dhis2 = workspace.dhis2_connection("my-dhis2")
    
    # Access custom (HTTP) connections
    api = workspace.custom_connection("my-api")
    current_run.log_info(f"API URL: {api.url}")
\`\`\`

Make sure the connection identifiers match what's configured in the workspace settings.`;
  }

  if (lower.includes("template") || lower.includes("publish")) {
    return `You can publish your pipeline as a **template** so other workspaces can reuse it. From the pipeline page, click **"Publish as Template"** in the header.

Templates are versioned — when you update the source pipeline, you can publish a new template version. Workspaces using the template can then upgrade to the latest version.

You can also enable **auto-update** on pipelines created from templates so they stay in sync automatically.`;
  }

  return `Thanks for your question about "${userMessage.slice(0, 60)}${userMessage.length > 60 ? "..." : ""}".

I'm a mock assistant for now — connect me to a real AI backend to get intelligent responses. In the meantime, try asking about:
- Pipeline parameters and configuration
- Scheduling and notifications
- Connections and databases
- Troubleshooting errors
- Publishing templates`;
}

let messageIdCounter = 0;
function createId(): string {
  messageIdCounter += 1;
  return `msg-${Date.now()}-${messageIdCounter}`;
}

export function usePipelineAssistant(options?: UsePipelineAssistantOptions) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const contextRef = useRef(options?.context);
  contextRef.current = options?.context;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMsg: AssistantMessage = {
      id: createId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

    const responseText = generateMockResponse(content, contextRef.current);

    const assistantMsg: AssistantMessage = {
      id: createId(),
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
