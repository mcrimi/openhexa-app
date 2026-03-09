import {
  BookOpenIcon,
  CodeBracketIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";
import CLIInstructionsPanel from "./CLIInstructionsPanel";
import CodeCreationPanel from "./CodeCreationPanel";
import FromNotebookPanel from "./FromNotebookPanel";
import FromTemplatePanel from "./FromTemplatePanel";

type Method = null | "ai" | "manual" | "template" | "notebook" | "cli";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
};

const CARDS = [
  {
    id: "ai" as const,
    title: "Create with AI",
    subtitle: "Describe what you want, AI writes the code",
    Icon: SparklesIcon,
    highlight: true,
  },
  {
    id: "manual" as const,
    title: "Create",
    subtitle: "Write your pipeline code in the browser",
    Icon: CodeBracketIcon,
    highlight: false,
  },
  {
    id: "template" as const,
    title: "From Template",
    subtitle: "Start from a shared template",
    Icon: DocumentDuplicateIcon,
    highlight: false,
  },
  {
    id: "notebook" as const,
    title: "From Notebook",
    subtitle: "Convert a Jupyter notebook",
    Icon: BookOpenIcon,
    highlight: false,
  },
];

const SelectionScreen = ({ workspace }: Props) => {
  const [method, setMethod] = useState<Method>(null);

  if (method === "ai" || method === "manual") {
    return (
      <CodeCreationPanel
        workspace={workspace}
        entryMode={method}
        onBack={() => setMethod(null)}
      />
    );
  }

  if (method === "template") {
    return (
      <FromTemplatePanel workspace={workspace} onBack={() => setMethod(null)} />
    );
  }

  if (method === "notebook") {
    return (
      <FromNotebookPanel workspace={workspace} onBack={() => setMethod(null)} />
    );
  }

  if (method === "cli") {
    return (
      <CLIInstructionsPanel
        workspace={workspace}
        onBack={() => setMethod(null)}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        {CARDS.map(({ id, title, subtitle, Icon, highlight }) => (
          <button
            key={id}
            onClick={() => setMethod(id)}
            className={`flex flex-col items-start gap-3 rounded-xl border-2 p-6 text-left transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              highlight
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <Icon className="h-7 w-7 text-gray-700" />
            <div>
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={() => setMethod("cli")}
        className="text-sm text-blue-600 hover:underline"
      >
        Set up the CLI →
      </button>
    </div>
  );
};

export default SelectionScreen;
