# Pipeline Creation Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the pipeline creation modal with a dedicated `/pipelines/new` page that supports four creation paths: Create with AI, Create (manual code editor), From Template, and From Notebook.

**Architecture:** A new Next.js page at `/workspaces/[workspaceSlug]/pipelines/new` manages all creation flows via local component state. The page renders a `SelectionScreen` first, then transitions to one of four creation panels depending on the user's choice. "Create" and "Create with AI" share a `CodeCreationPanel` (editor + AI chat sidebar); "From Template" and "From Notebook" trigger immediate pipeline creation and redirect. The `AIChatPanel` is built as a standalone reusable component from the start so it can later be added to the pipeline edit page.

**Tech Stack:** Next.js 15, TypeScript, Apollo Client, Tailwind CSS, `useCreatePipelineMutation`, `useUploadPipelineMutation`, `useCreatePipelineFromTemplateVersionMutation`, existing `FilesEditor` and `PipelineTemplates` components.

---

## Task 1: Create the `/pipelines/new` page

**Files:**
- Create: `frontend/src/pages/workspaces/[workspaceSlug]/pipelines/new.tsx`

This page:
- Requires auth
- Prefetches workspace data (same pattern as `index.tsx`)
- Renders a `SelectionScreen` component (built in Task 2)
- Passes `workspace` prop down

**Step 1: Write the failing test**

Create `frontend/src/pages/workspaces/[workspaceSlug]/pipelines/__tests__/new.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { TestApp } from "core/helpers/testutils";
import NewPipelinePage from "../new";

const WORKSPACE = {
  slug: "test-workspace",
  name: "Test Workspace",
  permissions: { update: true },
};

it("renders the selection screen", () => {
  render(
    <TestApp>
      <NewPipelinePage workspace={WORKSPACE as any} />
    </TestApp>,
  );
  expect(
    screen.getByText("How do you want to create your pipeline?"),
  ).toBeInTheDocument();
});

it("does not render when workspace is missing", () => {
  const { container } = render(
    <TestApp>
      <NewPipelinePage workspace={null as any} />
    </TestApp>,
  );
  expect(container).toBeEmptyDOMElement();
});
```

**Step 2: Run the test to verify it fails**

```bash
cd frontend && npm test -- --testPathPattern="pipelines/__tests__/new"
```

Expected: FAIL — `NewPipelinePage` does not exist yet.

**Step 3: Write the page**

```tsx
import Page from "core/components/Page";
import { createGetServerSideProps } from "core/helpers/page";
import { NextPageWithLayout } from "core/helpers/types";
import WorkspaceLayout from "workspaces/layouts/WorkspaceLayout";
import { WorkspacePipelinesPageDocument } from "workspaces/graphql/queries.generated";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";
import { useTranslation } from "next-i18next";
import SelectionScreen from "pipelines/features/CreatePipeline/SelectionScreen";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
};

const NewPipelinePage: NextPageWithLayout = ({ workspace }: Props) => {
  const { t } = useTranslation();

  if (!workspace) return null;

  return (
    <Page title={t("Create Pipeline")}>
      <WorkspaceLayout workspace={workspace}>
        <SelectionScreen workspace={workspace} />
      </WorkspaceLayout>
    </Page>
  );
};

NewPipelinePage.getLayout = (page) => page;

export const getServerSideProps = createGetServerSideProps({
  requireAuth: true,
  async getServerSideProps(ctx, client) {
    const workspaceSlug = ctx.params?.workspaceSlug as string;
    await WorkspaceLayout.prefetch(ctx, client);
    const { data } = await client.query({
      query: WorkspacePipelinesPageDocument,
      variables: { workspaceSlug, page: 1, perPage: 1, search: "", functionalType: null },
    });
    if (!data.workspace) return { notFound: true };
    return { props: { workspace: data.workspace } };
  },
});

export default NewPipelinePage;
```

**Step 4: Run tests**

```bash
cd frontend && npm test -- --testPathPattern="pipelines/__tests__/new"
```

Expected: PASS (once SelectionScreen exists — implement Task 2 first, then come back to verify).

**Step 5: Commit**

```bash
git add frontend/src/pages/workspaces/\[workspaceSlug\]/pipelines/new.tsx
git add frontend/src/pages/workspaces/\[workspaceSlug\]/pipelines/__tests__/new.test.tsx
git commit -m "feat: add /pipelines/new page route"
```

---

## Task 2: Create the SelectionScreen component

**Files:**
- Create: `frontend/src/pipelines/features/CreatePipeline/SelectionScreen.tsx`
- Create: `frontend/src/pipelines/features/CreatePipeline/index.ts`

The selection screen shows 4 method cards and a CLI secondary link. It manages which panel is active via local state, then renders the appropriate creation panel (Tasks 3–8).

**Step 1: Write the failing test**

Create `frontend/src/pipelines/features/CreatePipeline/__tests__/SelectionScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import SelectionScreen from "../SelectionScreen";

const WORKSPACE = {
  slug: "test-workspace",
  name: "Test Workspace",
  permissions: { update: true },
};

it("renders all four creation method cards", () => {
  render(
    <TestApp>
      <SelectionScreen workspace={WORKSPACE as any} />
    </TestApp>,
  );
  expect(screen.getByText("Create with AI")).toBeInTheDocument();
  expect(screen.getByText("Create")).toBeInTheDocument();
  expect(screen.getByText("From Template")).toBeInTheDocument();
  expect(screen.getByText("From Notebook")).toBeInTheDocument();
});

it("renders the CLI secondary link", () => {
  render(
    <TestApp>
      <SelectionScreen workspace={WORKSPACE as any} />
    </TestApp>,
  );
  expect(screen.getByText(/Set up the CLI/i)).toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- --testPathPattern="CreatePipeline/__tests__/SelectionScreen"
```

**Step 3: Implement SelectionScreen**

```tsx
import {
  SparklesIcon,
  CodeBracketIcon,
  DocumentDuplicateIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { useTranslation } from "next-i18next";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";
import CodeCreationPanel from "./CodeCreationPanel";
import FromTemplatePanel from "./FromTemplatePanel";
import FromNotebookPanel from "./FromNotebookPanel";
import CLIInstructionsPanel from "./CLIInstructionsPanel";

type Method = "ai" | "manual" | "template" | "notebook" | "cli" | null;

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
};

const CARDS = [
  {
    id: "ai" as Method,
    title: "Create with AI",
    subtitle: "Describe what you want, AI writes the code",
    Icon: SparklesIcon,
    highlight: true,
  },
  {
    id: "manual" as Method,
    title: "Create",
    subtitle: "Write your pipeline code in the browser",
    Icon: CodeBracketIcon,
    highlight: false,
  },
  {
    id: "template" as Method,
    title: "From Template",
    subtitle: "Start from a shared template",
    Icon: DocumentDuplicateIcon,
    highlight: false,
  },
  {
    id: "notebook" as Method,
    title: "From Notebook",
    subtitle: "Convert a Jupyter notebook",
    Icon: BookOpenIcon,
    highlight: false,
  },
];

const SelectionScreen = ({ workspace }: Props) => {
  const { t } = useTranslation();
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
      <FromTemplatePanel
        workspace={workspace}
        onBack={() => setMethod(null)}
      />
    );
  }

  if (method === "notebook") {
    return (
      <FromNotebookPanel
        workspace={workspace}
        onBack={() => setMethod(null)}
      />
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
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <h1 className="text-2xl font-semibold text-gray-900 mb-10">
        {t("How do you want to create your pipeline?")}
      </h1>
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        {CARDS.map(({ id, title, subtitle, Icon, highlight }) => (
          <button
            key={id}
            onClick={() => setMethod(id)}
            className={`flex flex-col items-start gap-3 rounded-xl border p-6 text-left transition hover:shadow-md ${
              highlight
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <Icon className="h-6 w-6 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">{t(title)}</p>
              <p className="text-sm text-gray-500">{t(subtitle)}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-8 text-sm text-gray-500">
        {t("Prefer working locally?")}{" "}
        <button
          onClick={() => setMethod("cli")}
          className="text-blue-600 underline hover:text-blue-800"
        >
          {t("Set up the CLI")} →
        </button>
      </p>
    </div>
  );
};

export default SelectionScreen;
```

Create `frontend/src/pipelines/features/CreatePipeline/index.ts`:

```ts
export { default as SelectionScreen } from "./SelectionScreen";
```

**Step 4: Run tests**

```bash
cd frontend && npm test -- --testPathPattern="CreatePipeline/__tests__/SelectionScreen"
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/pipelines/features/CreatePipeline/
git commit -m "feat: add pipeline creation SelectionScreen"
```

---

## Task 3: Create the CLIInstructionsPanel

**Files:**
- Create: `frontend/src/pipelines/features/CreatePipeline/CLIInstructionsPanel.tsx`

Lifted directly from the CLI tab in `CreatePipelineDialog`. Shows pip install instructions, workspace config command, and the access token reveal button.

**Step 1: Implement CLIInstructionsPanel**

No new behaviour — this is purely a lift-and-shift from `CreatePipelineDialog.tsx` lines 165–205.

```tsx
import { gql, useMutation } from "@apollo/client";
import Button from "core/components/Button";
import Field from "core/components/forms/Field";
import Link from "core/components/Link";
import Textarea from "core/components/forms/Textarea";
import { Trans, useTranslation } from "next-i18next";
import { useState } from "react";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
  onBack: () => void;
};

const CLIInstructionsPanel = ({ workspace, onBack }: Props) => {
  const { t } = useTranslation();
  const [token, setToken] = useState<null | string>(null);

  const [generateToken] = useMutation(
    gql`
      mutation GenerateCLIWorkspaceToken($input: GenerateWorkspaceTokenInput!) {
        generateWorkspaceToken(input: $input) {
          token
          success
        }
      }
    `,
    { variables: { input: { slug: workspace.slug } } },
  );

  const onTokenClick = async () => {
    if (!token) {
      const { data } = await generateToken();
      setToken(data?.generateWorkspaceToken?.token ?? null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-12 px-4 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t("Back")}
      </button>
      <h2 className="text-xl font-semibold">{t("Set up the CLI")}</h2>
      <p>
        <Trans>
          In order to create pipelines, you need to setup the{" "}
          <code>openhexa</code> CLI using the{" "}
          <Link
            target="_blank"
            href="https://github.com/BLSQ/openhexa/wiki/Writing-OpenHexa-pipelines"
          >
            guide
          </Link>{" "}
          on Github.
        </Trans>
      </p>
      <p>{t("Configure the workspace in your terminal using the following commands:")}</p>
      <pre className="bg-slate-100 p-3 font-mono text-sm leading-6 rounded">
        <div>
          <span className="select-none text-gray-400">$ </span>pip install openhexa.sdk
          <span className="select-none text-gray-400"> {t("# if not installed")}</span>
        </div>
        <div>
          <span className="select-none text-gray-400">$ </span>
          openhexa workspaces add <b>{workspace.slug}</b>
        </div>
      </pre>
      <Field name="token" label={t("Access Token")} required>
        <div className="flex w-full flex-1 items-center gap-1">
          {token ? (
            <Textarea className="font-mono" value={token} readOnly />
          ) : (
            <Button variant="secondary" onClick={onTokenClick}>
              {t("Show")}
            </Button>
          )}
        </div>
      </Field>
    </div>
  );
};

export default CLIInstructionsPanel;
```

**Step 2: Commit**

```bash
git add frontend/src/pipelines/features/CreatePipeline/CLIInstructionsPanel.tsx
git commit -m "feat: add CLIInstructionsPanel for pipeline creation"
```

---

## Task 4: Create the FromNotebookPanel

**Files:**
- Create: `frontend/src/pipelines/features/CreatePipeline/FromNotebookPanel.tsx`

Lifted from the notebook tab in `CreatePipelineDialog`. Full-page form with name, functional type, notebook picker, and create button.

**Step 1: Write the failing test**

Create `frontend/src/pipelines/features/CreatePipeline/__tests__/FromNotebookPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { TestApp } from "core/helpers/testutils";
import FromNotebookPanel from "../FromNotebookPanel";

const WORKSPACE = { slug: "ws", name: "WS", permissions: { update: true } };

it("renders notebook form fields", () => {
  render(
    <TestApp>
      <FromNotebookPanel workspace={WORKSPACE as any} onBack={jest.fn()} />
    </TestApp>,
  );
  expect(screen.getByLabelText(/Pipeline Name/i)).toBeInTheDocument();
  expect(screen.getByText(/Notebook/i)).toBeInTheDocument();
});

it("shows validation error when submitting without a notebook", async () => {
  const user = userEvent.setup();
  render(
    <TestApp>
      <FromNotebookPanel workspace={WORKSPACE as any} onBack={jest.fn()} />
    </TestApp>,
  );
  await user.type(screen.getByLabelText(/Pipeline Name/i), "My Pipeline");
  await user.click(screen.getByRole("button", { name: /Create Pipeline/i }));
  expect(await screen.findByText(/select a notebook/i)).toBeInTheDocument();
});
```

**Step 2: Run to confirm failure**

```bash
cd frontend && npm test -- --testPathPattern="CreatePipeline/__tests__/FromNotebookPanel"
```

**Step 3: Implement FromNotebookPanel**

```tsx
import Button from "core/components/Button";
import Field from "core/components/forms/Field";
import Select from "core/components/forms/Select";
import useForm from "core/hooks/useForm";
import { BucketObjectType, PipelineFunctionalType } from "graphql/types";
import { Trans, useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { useCreatePipelineMutation } from "workspaces/graphql/mutations.generated";
import { formatPipelineFunctionalType } from "workspaces/helpers/pipelines";
import BucketObjectPicker from "workspaces/features/BucketObjectPicker";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
  onBack: () => void;
};

const FromNotebookPanel = ({ workspace, onBack }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [mutate] = useCreatePipelineMutation();

  const form = useForm<{
    notebookObject: any;
    name: string;
    functionalType: PipelineFunctionalType | null;
  }>({
    onSubmit: async (values) => {
      const { data } = await mutate({
        variables: {
          input: {
            name: values.name,
            notebookPath: values.notebookObject.key,
            workspaceSlug: workspace.slug,
            functionalType: values.functionalType,
          },
        },
      });
      if (data?.createPipeline.success && data.createPipeline.pipeline) {
        await router.push(
          `/workspaces/${encodeURIComponent(workspace.slug)}/pipelines/${encodeURIComponent(data.createPipeline.pipeline.code)}`,
        );
      } else {
        throw new Error(t("An error occurred while creating the pipeline."));
      }
    },
    validate(values) {
      const errors: any = {};
      if (!values.notebookObject) errors.notebookObject = t("You have to select a notebook");
      return errors;
    },
  });

  return (
    <div className="mx-auto max-w-2xl py-12 px-4 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t("Back")}
      </button>
      <h2 className="text-xl font-semibold">{t("Create from Notebook")}</h2>
      <p>
        <Trans>
          Use a Notebook from the workspace file system to be run as a pipeline.
          Keep in mind that Notebooks are not versioned — if a user changes the
          notebook, the pipeline will be updated.
        </Trans>
      </p>
      <div className="grid gap-6">
        <Field
          name="name"
          label={t("Pipeline Name")}
          required
          placeholder={t("My Pipeline")}
          error={form.touched.name && form.errors.name}
          value={form.formData.name}
          onChange={form.handleInputChange}
        />
        <Field
          name="functionalType"
          label={t("Functional Type")}
          help={t("The functional purpose of this pipeline")}
          className="max-w-xs"
        >
          <Select
            options={Object.values(PipelineFunctionalType)}
            value={form.formData.functionalType}
            onChange={(value) => form.setFieldValue("functionalType", value)}
            getOptionLabel={(option) =>
              option ? formatPipelineFunctionalType(option) : t("Not specified")
            }
            displayValue={(option) =>
              option ? formatPipelineFunctionalType(option) : ""
            }
            placeholder={t("Select functional type (optional)")}
            className="max-w-xs"
          />
        </Field>
        <Field
          name="notebookObject"
          label={t("Notebook")}
          required
          error={form.touched.notebookObject && form.errors.notebookObject}
          className="max-w-[230px]"
        >
          <BucketObjectPicker
            onChange={(value) => form.setFieldValue("notebookObject", value)}
            value={form.formData.notebookObject?.key}
            exclude={(item) =>
              item.type === BucketObjectType.File && !item.name.endsWith(".ipynb")
            }
            placeholder={t("Select a Jupyter notebook")}
            workspace={workspace}
          />
        </Field>
        {form.submitError && (
          <p className="text-sm text-red-500">{form.submitError}</p>
        )}
        <div>
          <Button disabled={form.isSubmitting} onClick={form.handleSubmit}>
            {t("Create Pipeline")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FromNotebookPanel;
```

**Step 4: Run tests**

```bash
cd frontend && npm test -- --testPathPattern="CreatePipeline/__tests__/FromNotebookPanel"
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/pipelines/features/CreatePipeline/FromNotebookPanel.tsx
git add frontend/src/pipelines/features/CreatePipeline/__tests__/FromNotebookPanel.test.tsx
git commit -m "feat: add FromNotebookPanel for pipeline creation"
```

---

## Task 5: Create the FromTemplatePanel

**Files:**
- Create: `frontend/src/pipelines/features/CreatePipeline/FromTemplatePanel.tsx`

Thin wrapper over the existing `PipelineTemplates` component. Adds back navigation.

**Step 1: Implement FromTemplatePanel**

```tsx
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "next-i18next";
import PipelineTemplates from "pipelines/features/PipelineTemplates";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
  onBack: () => void;
};

const FromTemplatePanel = ({ workspace, onBack }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-4 pt-4"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t("Back")}
      </button>
      <PipelineTemplates workspace={workspace} showCard={false} />
    </div>
  );
};

export default FromTemplatePanel;
```

**Step 2: Commit**

```bash
git add frontend/src/pipelines/features/CreatePipeline/FromTemplatePanel.tsx
git commit -m "feat: add FromTemplatePanel for pipeline creation"
```

---

## Task 6: Create the AIChatPanel component

**Files:**
- Create: `frontend/src/pipelines/features/CreatePipeline/AIChatPanel.tsx`

A standalone, reusable chat sidebar. For this iteration it is a UI shell only — no real AI backend integration. The component accepts messages and an `onSend` callback so the parent can handle the AI logic later.

**Step 1: Write the failing test**

Create `frontend/src/pipelines/features/CreatePipeline/__tests__/AIChatPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import AIChatPanel from "../AIChatPanel";

it("renders the input and send button", () => {
  render(
    <TestApp>
      <AIChatPanel messages={[]} onSend={jest.fn()} />
    </TestApp>,
  );
  expect(screen.getByPlaceholderText(/use @ to reference/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
});

it("calls onSend with the message text and clears input", async () => {
  const user = userEvent.setup();
  const onSend = jest.fn();
  render(
    <TestApp>
      <AIChatPanel messages={[]} onSend={onSend} />
    </TestApp>,
  );
  await user.type(screen.getByRole("textbox"), "build a pipeline");
  await user.click(screen.getByRole("button", { name: /send/i }));
  expect(onSend).toHaveBeenCalledWith("build a pipeline");
  expect(screen.getByRole("textbox")).toHaveValue("");
});

it("renders existing messages", () => {
  render(
    <TestApp>
      <AIChatPanel
        messages={[
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there" },
        ]}
        onSend={jest.fn()}
      />
    </TestApp>,
  );
  expect(screen.getByText("Hello")).toBeInTheDocument();
  expect(screen.getByText("Hi there")).toBeInTheDocument();
});
```

**Step 2: Run to confirm failure**

```bash
cd frontend && npm test -- --testPathPattern="CreatePipeline/__tests__/AIChatPanel"
```

**Step 3: Implement AIChatPanel**

```tsx
import { useState } from "react";
import { useTranslation } from "next-i18next";
import Button from "core/components/Button";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages: ChatMessage[];
  onSend: (message: string) => void;
};

const AIChatPanel = ({ messages, onSend }: Props) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col border-l border-gray-200">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              msg.role === "user"
                ? "ml-auto bg-gray-100 text-gray-900"
                : "bg-white border border-gray-200 text-gray-700"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 p-3 space-y-2">
        <textarea
          className="w-full resize-none rounded border border-gray-300 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("use @ to reference context, / for template prompts")}
        />
        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={!input.trim()}>
            {t("Send")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
```

**Step 4: Run tests**

```bash
cd frontend && npm test -- --testPathPattern="CreatePipeline/__tests__/AIChatPanel"
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/pipelines/features/CreatePipeline/AIChatPanel.tsx
git add frontend/src/pipelines/features/CreatePipeline/__tests__/AIChatPanel.test.tsx
git commit -m "feat: add reusable AIChatPanel component"
```

---

## Task 7: Create the CodeCreationPanel

**Files:**
- Create: `frontend/src/pipelines/features/CreatePipeline/CodeCreationPanel.tsx`

This is the core of the feature. It handles both "Create" and "Create with AI" entry modes.

- `entryMode === "ai"`: shows the full-screen prompt first; on submit renders the editor+chat layout with the prompt as the first message
- `entryMode === "manual"`: renders the editor+chat layout immediately

On "Create Pipeline":
1. Call `createPipeline` mutation (creates the empty pipeline record)
2. Call `uploadPipeline` mutation with the code as a zip
3. Redirect to the pipeline detail page

The editor starts with a default `pipeline.py` template so the user isn't faced with a blank screen.

**Step 1: Write the failing test**

Create `frontend/src/pipelines/features/CreatePipeline/__tests__/CodeCreationPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import CodeCreationPanel from "../CodeCreationPanel";

const WORKSPACE = { slug: "ws", name: "WS", permissions: { update: true } };

describe("manual mode", () => {
  it("renders the code editor immediately", () => {
    render(
      <TestApp>
        <CodeCreationPanel
          workspace={WORKSPACE as any}
          entryMode="manual"
          onBack={jest.fn()}
        />
      </TestApp>,
    );
    expect(
      screen.getByPlaceholderText(/pipeline name/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Pipeline/i })).toBeInTheDocument();
  });
});

describe("ai mode", () => {
  it("renders the AI prompt screen first", () => {
    render(
      <TestApp>
        <CodeCreationPanel
          workspace={WORKSPACE as any}
          entryMode="ai"
          onBack={jest.fn()}
        />
      </TestApp>,
    );
    expect(
      screen.getByText(/What do you want to create today/i),
    ).toBeInTheDocument();
  });

  it("transitions to the editor after sending the prompt", async () => {
    const user = userEvent.setup();
    render(
      <TestApp>
        <CodeCreationPanel
          workspace={WORKSPACE as any}
          entryMode="ai"
          onBack={jest.fn()}
        />
      </TestApp>,
    );
    await user.type(screen.getByRole("textbox"), "build a pipeline");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(
      screen.getByPlaceholderText(/pipeline name/i),
    ).toBeInTheDocument();
  });
});
```

**Step 2: Run to confirm failure**

```bash
cd frontend && npm test -- --testPathPattern="CreatePipeline/__tests__/CodeCreationPanel"
```

**Step 3: Implement CodeCreationPanel**

```tsx
import { useState } from "react";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Button from "core/components/Button";
import { FilesEditor } from "workspaces/features/FilesEditor";
import { FileType } from "graphql/types";
import {
  useCreatePipelineMutation,
  useUploadPipelineMutation,
} from "workspaces/graphql/mutations.generated";
import AIChatPanel, { ChatMessage } from "./AIChatPanel";
import JSZip from "jszip";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";

const DEFAULT_PIPELINE_CODE = `from openhexa.sdk import current_run, pipeline, workspace


@pipeline("my-pipeline", name="My Pipeline")
def my_pipeline():
    my_task()


@my_pipeline.task
def my_task():
    print("Hello from OpenHEXA!")
`;

const DEFAULT_FILES = [
  {
    id: "pipeline.py",
    path: "pipeline.py",
    name: "pipeline.py",
    type: FileType.File,
    content: DEFAULT_PIPELINE_CODE,
  },
];

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
  entryMode: "ai" | "manual";
  onBack: () => void;
};

const CodeCreationPanel = ({ workspace, entryMode, onBack }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [phase, setPhase] = useState<"prompt" | "editor">(
    entryMode === "ai" ? "prompt" : "editor",
  );
  const [pipelineName, setPipelineName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState(DEFAULT_PIPELINE_CODE);

  const [createPipeline] = useCreatePipelineMutation();
  const [uploadPipeline] = useUploadPipelineMutation();

  const handlePromptSend = (message: string) => {
    setMessages([{ role: "user", content: message }]);
    setPhase("editor");
  };

  const handleAISend = (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
  };

  const handleCreatePipeline = async () => {
    if (!pipelineName.trim()) {
      setError(t("Please enter a pipeline name"));
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const createResult = await createPipeline({
        variables: {
          input: { name: pipelineName.trim(), workspaceSlug: workspace.slug },
        },
      });

      if (!createResult.data?.createPipeline.success || !createResult.data.createPipeline.pipeline) {
        throw new Error(t("Failed to create pipeline"));
      }

      const pipelineCode = createResult.data.createPipeline.pipeline.code;

      const zip = new JSZip();
      zip.file("pipeline.py", currentCode);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(zipBlob);
      });

      await uploadPipeline({
        variables: {
          input: {
            workspaceSlug: workspace.slug,
            pipelineCode,
            zipfile: base64,
          },
        },
      });

      await router.push(
        `/workspaces/${encodeURIComponent(workspace.slug)}/pipelines/${encodeURIComponent(pipelineCode)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("An error occurred"));
    } finally {
      setIsCreating(false);
    }
  };

  if (phase === "prompt") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-4 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("What do you want to create today?")}
        </h1>
        <div className="w-full max-w-xl space-y-2">
          <textarea
            className="w-full resize-none rounded border border-gray-300 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={5}
            placeholder=""
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const val = (e.target as HTMLTextAreaElement).value.trim();
                if (val) handlePromptSend(val);
              }
            }}
          />
          <p className="text-xs text-gray-400">
            {t("use @ to reference context, / for template prompts")}
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                const textarea = document.querySelector("textarea");
                if (textarea?.value.trim()) handlePromptSend(textarea.value.trim());
              }}
            >
              {t("Send")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t("Back")}
        </button>
        <input
          className="flex-1 rounded border border-transparent px-2 py-1 text-sm font-medium text-gray-900 focus:border-gray-300 focus:outline-none"
          placeholder={t("Pipeline name")}
          value={pipelineName}
          onChange={(e) => setPipelineName(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button onClick={handleCreatePipeline} disabled={isCreating}>
          {isCreating ? t("Creating…") : t("Create Pipeline")}
        </Button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <FilesEditor
            name={pipelineName || t("New Pipeline")}
            files={DEFAULT_FILES as any}
            isEditable
            onSave={async (modifications) => {
              const newContent = modifications.get("pipeline.py");
              if (newContent !== undefined) setCurrentCode(newContent);
              return { success: true };
            }}
          />
        </div>
        <div className="w-72 shrink-0">
          <AIChatPanel messages={messages} onSend={handleAISend} />
        </div>
      </div>
    </div>
  );
};

export default CodeCreationPanel;
```

**Step 4: Run tests**

```bash
cd frontend && npm test -- --testPathPattern="CreatePipeline/__tests__/CodeCreationPanel"
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/pipelines/features/CreatePipeline/CodeCreationPanel.tsx
git add frontend/src/pipelines/features/CreatePipeline/__tests__/CodeCreationPanel.test.tsx
git commit -m "feat: add CodeCreationPanel with editor and AI chat"
```

---

## Task 8: Update the pipelines index page

**Files:**
- Modify: `frontend/src/pages/workspaces/[workspaceSlug]/pipelines/index.tsx`

Replace the `useState` + `CreatePipelineDialog` pattern with a `router.push` to the new page.

**Step 1: Modify the page**

Remove:
- `const [isDialogOpen, setDialogOpen] = useState(false);`
- The `<CreatePipelineDialog .../>` at the bottom
- The `CreatePipelineDialog` import
- The `useState` import (if no longer used)

Change the button's `onClick`:

```tsx
// Before
onClick={() => setDialogOpen(true)}

// After
onClick={() => router.push(`/workspaces/${encodeURIComponent(workspace.slug)}/pipelines/new`)}
```

**Step 2: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/src/pages/workspaces/\[workspaceSlug\]/pipelines/index.tsx
git commit -m "feat: navigate to /pipelines/new instead of opening dialog"
```

---

## Task 9: Delete CreatePipelineDialog

**Files:**
- Delete: `frontend/src/workspaces/features/CreatePipelineDialog/CreatePipelineDialog.tsx`
- Delete: `frontend/src/workspaces/features/CreatePipelineDialog/CreatePipelineDialog.generated.tsx`
- Delete: `frontend/src/workspaces/features/CreatePipelineDialog/index.ts`

**Step 1: Verify nothing else imports CreatePipelineDialog**

```bash
cd frontend && grep -r "CreatePipelineDialog" src/ --include="*.ts" --include="*.tsx"
```

Expected: no results (after Task 8 removed the last import).

**Step 2: Delete the files**

```bash
rm -rf frontend/src/workspaces/features/CreatePipelineDialog
```

**Step 3: Verify TypeScript still compiles**

```bash
cd frontend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove CreatePipelineDialog (replaced by /pipelines/new)"
```

---

## Task 10: End-to-end smoke test

**Step 1: Start the dev server and verify manually**

```bash
cd frontend && npm run dev
```

Verify:
1. Navigate to any workspace's pipelines page
2. Click "Create" button → lands on `/pipelines/new` selection screen
3. Click each card → correct panel renders with a Back button
4. Back button returns to selection screen
5. CLI link opens CLI instructions panel
6. "Create with AI" → prompt screen → send message → editor + chat panel
7. "Create" → editor + chat panel immediately (AI panel on the right)

**Step 2: Run the full test suite**

```bash
cd frontend && npm run test:ci
```

Expected: all existing tests pass, new tests pass.

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: pipeline creation smoke test fixes"
```
