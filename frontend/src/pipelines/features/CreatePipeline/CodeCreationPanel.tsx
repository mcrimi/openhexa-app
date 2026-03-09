import { KeyboardEvent, useState } from "react";
import { useRouter } from "next/router";
import JSZip from "jszip";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";
import { FilesEditor } from "workspaces/features/FilesEditor";
import { FilesEditor_FileFragment } from "workspaces/features/FilesEditor/FilesEditor.generated";
import { FileType } from "graphql/types";
import AIChatPanel, { ChatMessage } from "./AIChatPanel";
import {
  useCreatePipelineMutation,
  useUploadPipelineMutation,
} from "workspaces/graphql/mutations.generated";

const DEFAULT_PIPELINE_CODE = `from openhexa.sdk import current_run, pipeline, workspace


@pipeline("my-pipeline", name="My Pipeline")
def my_pipeline():
    my_task()


@my_pipeline.task
def my_task():
    print("Hello from OpenHEXA!")
`;

const DEFAULT_FILES: FilesEditor_FileFragment[] = [
  {
    id: "pipeline.py",
    path: "pipeline.py",
    name: "pipeline.py",
    type: FileType.File,
    content: DEFAULT_PIPELINE_CODE,
    parentId: null,
    autoSelect: true,
    language: "python",
    lineCount: null,
  },
];

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
  entryMode: "ai" | "manual";
  onBack: () => void;
};

const CodeCreationPanel = ({ workspace, entryMode, onBack }: Props) => {
  const router = useRouter();
  const [phase, setPhase] = useState<"prompt" | "editor">(
    entryMode === "ai" ? "prompt" : "editor",
  );
  const [promptValue, setPromptValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentCode, setCurrentCode] = useState(DEFAULT_PIPELINE_CODE);
  const [pipelineName, setPipelineName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [createPipeline] = useCreatePipelineMutation();
  const [uploadPipeline] = useUploadPipelineMutation();

  const handlePromptSend = () => {
    const trimmed = promptValue.trim();
    if (!trimmed) return;
    setMessages([{ role: "user", content: trimmed }]);
    setPhase("editor");
  };

  const handlePromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePromptSend();
    }
  };

  const handleAISend = (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
  };

  const handleSave = async (modifiedFiles: Map<string, string>) => {
    const updated = modifiedFiles.get("pipeline.py");
    if (updated !== undefined) {
      setCurrentCode(updated);
    }
    return { success: true };
  };

  const handleCreatePipeline = async () => {
    if (!pipelineName.trim()) {
      setError("Pipeline name is required");
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const createResult = await createPipeline({
        variables: {
          input: {
            name: pipelineName.trim(),
            workspaceSlug: workspace.slug,
          },
        },
      });

      const pipelineCode =
        createResult.data?.createPipeline?.pipeline?.code;

      if (!createResult.data?.createPipeline?.success || !pipelineCode) {
        setError("Failed to create pipeline");
        return;
      }

      const zip = new JSZip();
      zip.file("pipeline.py", currentCode);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(zipBlob);
      });

      const uploadResult = await uploadPipeline({
        variables: {
          input: {
            workspaceSlug: workspace.slug,
            pipelineCode,
            zipfile: base64,
          },
        },
      });

      if (!uploadResult.data?.uploadPipeline?.success) {
        setError("Failed to upload pipeline code");
        return;
      }

      await router.push(
        `/workspaces/${workspace.slug}/pipelines/${pipelineCode}`,
      );
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  if (phase === "prompt") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">
          What do you want to create today?
        </h1>
        <div className="w-full max-w-2xl">
          <textarea
            autoFocus
            className="w-full resize-none rounded-lg border border-gray-300 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={6}
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={handlePromptKeyDown}
          />
          <p className="mt-2 text-xs text-gray-500">
            use @ to reference context, / for template prompts
          </p>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handlePromptSend}
              disabled={!promptValue.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <input
          type="text"
          placeholder="Pipeline name"
          value={pipelineName}
          onChange={(e) => setPipelineName(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {error && <span className="text-sm text-red-600">{error}</span>}
        <button
          onClick={handleCreatePipeline}
          disabled={isCreating}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create Pipeline"}
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden p-4">
          <FilesEditor
            name="pipeline"
            files={DEFAULT_FILES}
            isEditable={true}
            onSave={handleSave}
          />
        </div>
        <div className="w-72 border-l border-gray-200">
          <AIChatPanel messages={messages} onSend={handleAISend} />
        </div>
      </div>
    </div>
  );
};

export default CodeCreationPanel;
