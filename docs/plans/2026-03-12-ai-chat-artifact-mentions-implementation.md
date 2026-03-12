# AI Chat Artifact Mentions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `@`-mention support to `AIChatPanel` so users can attach workspace datasets, files, and database tables as visual chips to their AI messages.

**Architecture:** The `@` character in the textarea triggers a floating `ArtifactMentionPicker` popover. Selections appear as indigo chips in a `ChipStrip` above the input. On send, chips are serialised as a context prefix and forwarded alongside the message to `onSend`. Two new lightweight GraphQL queries are added for files and tables; the dataset query already exists.

**Tech Stack:** React, Apollo Client, TypeScript, Tailwind CSS, `@heroicons/react`, `next-i18next`, Jest + React Testing Library

---

## Task 1: Define shared types

**Files:**
- Create: `src/pipelines/features/CreatePipeline/artifactTypes.ts`

**Step 1: Write the type file**

```ts
export type ArtifactType = "dataset" | "file" | "table";

export type ArtifactMention = {
  id: string;          // unique key — use `${type}:${ref}` for deduplication
  type: ArtifactType;
  label: string;       // display name in chip
  ref: string;         // machine-readable: "dataset:sales-2024", "file:data/out.csv", "table:patients"
};
```

**Step 2: Commit**

```bash
git add src/pipelines/features/CreatePipeline/artifactTypes.ts
git commit -m "feat: add ArtifactMention shared type"
```

---

## Task 2: Add GraphQL queries for Files and Tables

**Files:**
- Modify: `src/workspaces/graphql/queries.graphql` (append at end)

**Step 1: Append the two new queries**

```graphql
query ArtifactFiles($workspaceSlug: String!, $query: String) {
  workspace(slug: $workspaceSlug) {
    bucket {
      objects(page: 1, prefix: "", perPage: 50, query: $query) {
        items {
          key
          name
          path
          type
          size
        }
      }
    }
  }
}

query ArtifactTables($workspaceSlug: String!) {
  workspace(slug: $workspaceSlug) {
    database {
      tables(page: 1, perPage: 100) {
        items {
          name
          count
        }
      }
    }
  }
}
```

**Step 2: Run codegen to generate typed hooks**

```bash
cd frontend && npm run codegen
```

Expected: `src/workspaces/graphql/queries.generated.tsx` now exports `useArtifactFilesQuery` and `useArtifactTablesQuery`.

**Step 3: Commit**

```bash
git add src/workspaces/graphql/queries.graphql src/workspaces/graphql/queries.generated.tsx
git commit -m "feat: add ArtifactFiles and ArtifactTables GraphQL queries"
```

---

## Task 3: Build `ArtifactChip` component (TDD)

**Files:**
- Create: `src/pipelines/features/CreatePipeline/ArtifactChip.tsx`
- Test: `src/pipelines/features/CreatePipeline/__tests__/ArtifactChip.test.tsx`

**Step 1: Write failing tests**

```tsx
// src/pipelines/features/CreatePipeline/__tests__/ArtifactChip.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import ArtifactChip from "../ArtifactChip";

const dataset = { id: "dataset:sales", type: "dataset" as const, label: "Sales 2024", ref: "dataset:sales-2024" };
const file    = { id: "file:data/out.csv", type: "file" as const, label: "data/out.csv", ref: "file:data/out.csv" };
const table   = { id: "table:patients", type: "table" as const, label: "patients", ref: "table:patients" };

it("renders the label", () => {
  render(<TestApp><ArtifactChip mention={dataset} onRemove={jest.fn()} /></TestApp>);
  expect(screen.getByText("Sales 2024")).toBeInTheDocument();
});

it("calls onRemove when × is clicked", async () => {
  const onRemove = jest.fn();
  render(<TestApp><ArtifactChip mention={dataset} onRemove={onRemove} /></TestApp>);
  await userEvent.click(screen.getByRole("button", { name: /remove/i }));
  expect(onRemove).toHaveBeenCalledWith(dataset.id);
});

it("renders different icons for dataset, file, table", () => {
  const { rerender } = render(<TestApp><ArtifactChip mention={dataset} onRemove={jest.fn()} /></TestApp>);
  expect(document.querySelector("[data-type='dataset']")).toBeInTheDocument();
  rerender(<TestApp><ArtifactChip mention={file} onRemove={jest.fn()} /></TestApp>);
  expect(document.querySelector("[data-type='file']")).toBeInTheDocument();
  rerender(<TestApp><ArtifactChip mention={table} onRemove={jest.fn()} /></TestApp>);
  expect(document.querySelector("[data-type='table']")).toBeInTheDocument();
});
```

**Step 2: Run — expect failure**

```bash
cd frontend && npx jest --testPathPatterns="ArtifactChip" --no-coverage
```

Expected: FAIL — module not found

**Step 3: Implement `ArtifactChip`**

```tsx
// src/pipelines/features/CreatePipeline/ArtifactChip.tsx
import { CircleStackIcon, DocumentIcon, TableCellsIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "next-i18next";
import { ArtifactMention, ArtifactType } from "./artifactTypes";

const ICONS: Record<ArtifactType, React.ElementType> = {
  dataset: CircleStackIcon,
  file: DocumentIcon,
  table: TableCellsIcon,
};

type Props = {
  mention: ArtifactMention;
  onRemove: (id: string) => void;
};

const ArtifactChip = ({ mention, onRemove }: Props) => {
  const { t } = useTranslation();
  const Icon = ICONS[mention.type];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
      <Icon className="h-3 w-3 flex-shrink-0" data-type={mention.type} />
      <span className="max-w-[120px] truncate">{mention.label}</span>
      <button
        type="button"
        aria-label={t("Remove {{label}}", { label: mention.label })}
        onClick={() => onRemove(mention.id)}
        className="ml-0.5 rounded-full text-indigo-400 hover:text-indigo-700"
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </span>
  );
};

export default ArtifactChip;
```

**Step 4: Run — expect pass**

```bash
cd frontend && npx jest --testPathPatterns="ArtifactChip" --no-coverage
```

Expected: PASS — 3 tests

**Step 5: Commit**

```bash
git add src/pipelines/features/CreatePipeline/ArtifactChip.tsx \
        src/pipelines/features/CreatePipeline/__tests__/ArtifactChip.test.tsx
git commit -m "feat: add ArtifactChip component"
```

---

## Task 4: Build `ArtifactMentionPicker` component (TDD)

**Files:**
- Create: `src/pipelines/features/CreatePipeline/ArtifactMentionPicker.tsx`
- Test: `src/pipelines/features/CreatePipeline/__tests__/ArtifactMentionPicker.test.tsx`

**Step 1: Write failing tests**

```tsx
// src/pipelines/features/CreatePipeline/__tests__/ArtifactMentionPicker.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import ArtifactMentionPicker from "../ArtifactMentionPicker";

// Mock all three queries
jest.mock("workspaces/graphql/queries.generated", () => ({
  ...jest.requireActual("workspaces/graphql/queries.generated"),
  useArtifactFilesQuery: () => ({
    data: {
      workspace: { bucket: { objects: { items: [
        { key: "data/output.csv", name: "output.csv", path: "data/output.csv", type: "FILE", size: 1024 },
      ]}}},
    },
    loading: false,
  }),
  useArtifactTablesQuery: () => ({
    data: {
      workspace: { database: { tables: { items: [
        { name: "patients", count: 500 },
      ]}}},
    },
    loading: false,
  }),
}));

jest.mock("datasets/graphql/queries.generated", () => ({
  useDatasetPickerQuery: () => ({
    data: {
      workspace: { datasets: { items: [
        { id: "ds1", dataset: { slug: "sales-2024", name: "Sales 2024" } },
      ]}},
    },
    loading: false,
  }),
}));

const defaultProps = {
  workspaceSlug: "my-ws",
  query: "",
  onSelect: jest.fn(),
  onClose: jest.fn(),
};

it("renders Datasets tab by default and shows dataset results", async () => {
  render(<TestApp><ArtifactMentionPicker {...defaultProps} /></TestApp>);
  expect(screen.getByRole("tab", { name: /datasets/i })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("Sales 2024")).toBeInTheDocument());
});

it("switches to Files tab and shows file results", async () => {
  render(<TestApp><ArtifactMentionPicker {...defaultProps} /></TestApp>);
  await userEvent.click(screen.getByRole("tab", { name: /files/i }));
  await waitFor(() => expect(screen.getByText("output.csv")).toBeInTheDocument());
});

it("switches to Tables tab and shows table results", async () => {
  render(<TestApp><ArtifactMentionPicker {...defaultProps} /></TestApp>);
  await userEvent.click(screen.getByRole("tab", { name: /tables/i }));
  await waitFor(() => expect(screen.getByText("patients")).toBeInTheDocument());
});

it("calls onSelect with ArtifactMention when item is clicked", async () => {
  const onSelect = jest.fn();
  render(<TestApp><ArtifactMentionPicker {...defaultProps} onSelect={onSelect} /></TestApp>);
  await waitFor(() => screen.getByText("Sales 2024"));
  await userEvent.click(screen.getByText("Sales 2024"));
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({ type: "dataset", label: "Sales 2024" })
  );
});

it("calls onClose when Escape is pressed", async () => {
  const onClose = jest.fn();
  render(<TestApp><ArtifactMentionPicker {...defaultProps} onClose={onClose} /></TestApp>);
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalled();
});

it("filters datasets by query prop", async () => {
  render(<TestApp><ArtifactMentionPicker {...defaultProps} query="xyz" /></TestApp>);
  await waitFor(() => expect(screen.queryByText("Sales 2024")).not.toBeInTheDocument());
});
```

**Step 2: Run — expect failure**

```bash
cd frontend && npx jest --testPathPatterns="ArtifactMentionPicker" --no-coverage
```

Expected: FAIL — module not found

**Step 3: Implement `ArtifactMentionPicker`**

```tsx
// src/pipelines/features/CreatePipeline/ArtifactMentionPicker.tsx
import { CircleStackIcon, DocumentIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { useArtifactFilesQuery, useArtifactTablesQuery } from "workspaces/graphql/queries.generated";
import { useDatasetPickerQuery } from "datasets/graphql/queries.generated";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "next-i18next";
import { ArtifactMention, ArtifactType } from "./artifactTypes";

type Tab = ArtifactType;

type Props = {
  workspaceSlug: string;
  query: string;          // filter text typed after @
  onSelect: (mention: ArtifactMention) => void;
  onClose: () => void;
};

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "dataset", label: "Datasets", Icon: CircleStackIcon },
  { id: "file",    label: "Files",    Icon: DocumentIcon },
  { id: "table",   label: "Tables",   Icon: TableCellsIcon },
];

const ArtifactMentionPicker = ({ workspaceSlug, query, onSelect, onClose }: Props) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("dataset");
  const [keyboardIdx, setKeyboardIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Datasets — always fetched (query is cheap)
  const { data: dsData, loading: dsLoading } = useDatasetPickerQuery({
    variables: { slug: workspaceSlug },
  });

  // Files — fetched when Files tab first activated
  const [filesActivated, setFilesActivated] = useState(false);
  const { data: filesData, loading: filesLoading } = useArtifactFilesQuery({
    variables: { workspaceSlug, query: query || undefined },
    skip: !filesActivated,
  });

  // Tables — fetched when Tables tab first activated
  const [tablesActivated, setTablesActivated] = useState(false);
  const { data: tablesData, loading: tablesLoading } = useArtifactTablesQuery({
    variables: { workspaceSlug },
    skip: !tablesActivated,
  });

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setKeyboardIdx(0);
    if (tab === "file") setFilesActivated(true);
    if (tab === "table") setTablesActivated(true);
  };

  const lowerQuery = query.toLowerCase();

  const items: ArtifactMention[] = (() => {
    if (activeTab === "dataset") {
      return (dsData?.workspace?.datasets.items ?? [])
        .filter((i) => i.dataset.name.toLowerCase().includes(lowerQuery))
        .map((i) => ({
          id: `dataset:${i.dataset.slug}`,
          type: "dataset" as const,
          label: i.dataset.name,
          ref: `dataset:${i.dataset.slug}`,
        }));
    }
    if (activeTab === "file") {
      return (filesData?.workspace?.bucket?.objects?.items ?? [])
        .filter((i) => i.name.toLowerCase().includes(lowerQuery) || i.path.toLowerCase().includes(lowerQuery))
        .map((i) => ({
          id: `file:${i.key}`,
          type: "file" as const,
          label: i.name,
          ref: `file:${i.path}`,
        }));
    }
    if (activeTab === "table") {
      return (tablesData?.workspace?.database?.tables?.items ?? [])
        .filter((i) => i.name.toLowerCase().includes(lowerQuery))
        .map((i) => ({
          id: `table:${i.name}`,
          type: "table" as const,
          label: i.name,
          ref: `table:${i.name}`,
        }));
    }
    return [];
  })();

  const loading = activeTab === "dataset" ? dsLoading
    : activeTab === "file" ? filesLoading
    : tablesLoading;

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setKeyboardIdx((i) => Math.min(i + 1, items.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setKeyboardIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && items[keyboardIdx]) { e.preventDefault(); onSelect(items[keyboardIdx]); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, keyboardIdx, onClose, onSelect]);

  // Reset keyboard index when items change
  useEffect(() => { setKeyboardIdx(0); }, [items.length]);

  const activeIcon = TABS.find((t) => t.id === activeTab)?.Icon ?? CircleStackIcon;

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border border-gray-200 bg-white shadow-lg"
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => handleTabChange(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === id
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(label)}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="max-h-56 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-3 text-center text-xs text-gray-400">{t("Loading…")}</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-3 text-center text-xs text-gray-400">{t("No results")}</p>
        ) : (
          <ul>
            {items.map((item, idx) => {
              const Icon = TABS.find((t) => t.id === item.type)?.Icon ?? CircleStackIcon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onSelect(item)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs transition-colors ${
                      idx === keyboardIdx ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
                    <span className="truncate font-medium text-gray-700">{item.label}</span>
                    <span className="ml-auto flex-shrink-0 text-[10px] text-gray-400">{item.type}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ArtifactMentionPicker;
```

**Step 4: Run — expect pass**

```bash
cd frontend && npx jest --testPathPatterns="ArtifactMentionPicker" --no-coverage
```

Expected: PASS — 6 tests

**Step 5: Commit**

```bash
git add src/pipelines/features/CreatePipeline/ArtifactMentionPicker.tsx \
        src/pipelines/features/CreatePipeline/__tests__/ArtifactMentionPicker.test.tsx
git commit -m "feat: add ArtifactMentionPicker component"
```

---

## Task 5: Wire `@` detection and chips into `AIChatPanel`

**Files:**
- Modify: `src/pipelines/features/CreatePipeline/AIChatPanel.tsx`
- Modify: `src/pipelines/features/CreatePipeline/__tests__/AIChatPanel.test.tsx`

**Step 1: Write new failing tests first**

Add to the existing test file:

```tsx
// Add these mocks at top of AIChatPanel.test.tsx
jest.mock("../ArtifactMentionPicker", () => ({
  __esModule: true,
  default: ({ onSelect, onClose }: any) => (
    <>
      <button onClick={() => onSelect({ id: "dataset:sales", type: "dataset", label: "Sales 2024", ref: "dataset:sales-2024" })}>
        Pick Sales 2024
      </button>
      <button onClick={onClose}>Close picker</button>
    </>
  ),
}));
```

Then add test cases:

```tsx
it("opens picker when @ is typed", async () => {
  const user = userEvent.setup();
  render(<TestApp><AIChatPanel {...defaultProps} workspaceSlug="ws" /></TestApp>);
  await user.type(screen.getByRole("textbox"), "@");
  expect(screen.getByText("Pick Sales 2024")).toBeInTheDocument();
});

it("adds a chip when artifact is selected and removes @ from input", async () => {
  const user = userEvent.setup();
  render(<TestApp><AIChatPanel {...defaultProps} workspaceSlug="ws" /></TestApp>);
  await user.type(screen.getByRole("textbox"), "@");
  await user.click(screen.getByText("Pick Sales 2024"));
  expect(screen.getByText("Sales 2024")).toBeInTheDocument(); // chip
  expect(screen.getByRole("textbox")).toHaveValue(""); // @ removed
});

it("removes a chip when × is clicked", async () => {
  const user = userEvent.setup();
  render(<TestApp><AIChatPanel {...defaultProps} workspaceSlug="ws" /></TestApp>);
  await user.type(screen.getByRole("textbox"), "@");
  await user.click(screen.getByText("Pick Sales 2024"));
  await user.click(screen.getByRole("button", { name: /remove/i }));
  expect(screen.queryByText("Sales 2024")).not.toBeInTheDocument();
});

it("sends message with mentions and clears chips", async () => {
  const user = userEvent.setup();
  const onSend = jest.fn();
  render(<TestApp><AIChatPanel {...defaultProps} onSend={onSend} workspaceSlug="ws" /></TestApp>);
  await user.type(screen.getByRole("textbox"), "@");
  await user.click(screen.getByText("Pick Sales 2024"));
  await user.type(screen.getByRole("textbox"), "analyze this");
  await user.click(screen.getByRole("button", { name: /send/i }));
  expect(onSend).toHaveBeenCalledWith(
    "analyze this",
    [expect.objectContaining({ type: "dataset", label: "Sales 2024" })]
  );
  expect(screen.queryByText("Sales 2024")).not.toBeInTheDocument(); // chip cleared
});
```

**Step 2: Run — expect failure**

```bash
cd frontend && npx jest --testPathPatterns="AIChatPanel" --no-coverage
```

Expected: FAIL on new tests

**Step 3: Update `AIChatPanel`**

Key changes to `AIChatPanel.tsx`:

1. Add `workspaceSlug: string` to `Props`
2. Change `onSend: (message: string, mentions: ArtifactMention[]) => void`
3. Add `mentions` state: `useState<ArtifactMention[]>([])`
4. Add `pickerOpen`, `pickerQuery`, `atIndex` state
5. Replace `onChange` handler with `@`-detection logic
6. Add `ChipStrip` above the input card
7. Add `ArtifactMentionPicker` positioned above the input card
8. Update `handleSend` to pass mentions and clear them

Replace the input section of `AIChatPanel.tsx` (the `<>` block for the chat view) with:

```tsx
// At top, add imports:
import ArtifactChip from "./ArtifactChip";
import ArtifactMentionPicker from "./ArtifactMentionPicker";
import { ArtifactMention } from "./artifactTypes";

// In Props type, add:
//   workspaceSlug: string;
//   onSend: (message: string, mentions: ArtifactMention[]) => void;

// In component body, add state:
const [mentions, setMentions] = useState<ArtifactMention[]>([]);
const [pickerOpen, setPickerOpen] = useState(false);
const [pickerQuery, setPickerQuery] = useState("");
const atIndexRef = useRef<number>(-1);

// Replace handleSend:
const handleSend = () => {
  const trimmed = input.trim();
  if (!trimmed && mentions.length === 0) return;
  onSend(trimmed, mentions);
  setInput("");
  setMentions([]);
  setPickerOpen(false);
};

// Add handleInputChange (replaces inline onChange):
const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const val = e.target.value;
  const cursorPos = e.target.selectionStart ?? val.length;
  const textUpToCursor = val.slice(0, cursorPos);
  const atIdx = textUpToCursor.lastIndexOf("@");

  if (atIdx !== -1) {
    const afterAt = textUpToCursor.slice(atIdx + 1);
    if (!afterAt.includes(" ")) {
      atIndexRef.current = atIdx;
      setPickerQuery(afterAt);
      setPickerOpen(true);
    } else {
      setPickerOpen(false);
    }
  } else {
    setPickerOpen(false);
  }
  setInput(val);
};

// Add handleSelect:
const handleSelect = (mention: ArtifactMention) => {
  // Remove "@query" from input
  const before = input.slice(0, atIndexRef.current);
  const after = input.slice(atIndexRef.current + 1 + pickerQuery.length);
  setInput(before + after);
  setMentions((prev) => {
    if (prev.some((m) => m.id === mention.id)) return prev; // deduplicate
    return [...prev, mention];
  });
  setPickerOpen(false);
  setPickerQuery("");
};

// Update handleKeyDown — add Backspace to remove last chip:
const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
    return;
  }
  if (e.key === "Backspace" && input === "" && mentions.length > 0) {
    setMentions((prev) => prev.slice(0, -1));
  }
};
```

Replace the input card JSX with:

```tsx
{/* Input area with picker and chip strip */}
<div className="border-t border-gray-100 p-3">
  {/* Artifact mention picker — floats above input */}
  {pickerOpen && (
    <div className="mb-2">
      <ArtifactMentionPicker
        workspaceSlug={workspaceSlug}
        query={pickerQuery}
        onSelect={handleSelect}
        onClose={() => {
          setPickerOpen(false);
          // Remove the @ character that triggered the picker
          setInput((prev) => prev.slice(0, atIndexRef.current) + prev.slice(atIndexRef.current + 1 + pickerQuery.length));
        }}
      />
    </div>
  )}

  {/* Chip strip */}
  {mentions.length > 0 && (
    <div className="mb-2 flex flex-wrap gap-1">
      {mentions.map((m) => (
        <ArtifactChip
          key={m.id}
          mention={m}
          onRemove={(id) => setMentions((prev) => prev.filter((x) => x.id !== id))}
        />
      ))}
    </div>
  )}

  {/* Input card */}
  <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]">
    <textarea
      className="w-full resize-none rounded-xl bg-transparent p-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
      placeholder={t("Ask or describe a change… (type @ to mention an artifact)")}
      value={input}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      rows={3}
    />
    <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
      <span className="text-[10px] text-gray-400">
        {t("@ to attach · Enter to send · Shift+Enter for new line")}
      </span>
      <button
        onClick={handleSend}
        disabled={!input.trim() && mentions.length === 0}
        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <SparklesIcon className="h-3 w-3" />
        {t("Send")}
      </button>
    </div>
  </div>
</div>
```

**Step 4: Run — expect pass**

```bash
cd frontend && npx jest --testPathPatterns="AIChatPanel" --no-coverage
```

Expected: PASS — all tests including 4 new ones

**Step 5: Commit**

```bash
git add src/pipelines/features/CreatePipeline/AIChatPanel.tsx \
        src/pipelines/features/CreatePipeline/__tests__/AIChatPanel.test.tsx
git commit -m "feat: wire @-mention picker and chip strip into AIChatPanel"
```

---

## Task 6: Update `code.tsx` to forward `workspaceSlug` and handle mentions

**Files:**
- Modify: `src/pages/workspaces/[workspaceSlug]/pipelines/[pipelineCode]/code.tsx`

**Step 1: Update `handleAISend` to accept and use mentions**

```tsx
// Change signature:
const handleAISend = (message: string, mentions: ArtifactMention[]) => {
  const contextPrefix = mentions.length > 0
    ? `[Context: ${mentions.map((m) => m.ref).join(", ")}]\n`
    : "";
  const fullMessage = `${contextPrefix}${message}`;

  setAiMessages((prev) => [...prev, { role: "user", content: message }]); // show clean message to user
  setIsAITyping(true);
  setTimeout(() => {
    setAiMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "I've updated the pipeline code based on your request. Review the changes in the editor and save a new version when you're happy.",
      },
    ]);
    setIsAITyping(false);
    setPendingAISave(true);
  }, 1800);
};
```

**Step 2: Add `workspaceSlug` prop to `AIChatPanel`**

```tsx
// Add import at top:
import { ArtifactMention } from "pipelines/features/CreatePipeline/artifactTypes";

// In the AIChatPanel JSX:
<AIChatPanel
  messages={aiMessages}
  onSend={handleAISend}
  onNewConversation={handleNewConversation}
  onClose={closeAI}
  isTyping={isAITyping}
  workspaceSlug={workspaceSlug}   // ← add this
/>
```

**Step 3: Run full test suite**

```bash
cd frontend && npx jest --testPathPatterns="CreatePipeline|pipelines" --no-coverage
```

Expected: PASS — all tests

**Step 4: Commit**

```bash
git add src/pages/workspaces/\[workspaceSlug\]/pipelines/\[pipelineCode\]/code.tsx
git commit -m "feat: forward workspaceSlug and mention context to AIChatPanel"
```

---

## Task 7: Full test run and lint

**Step 1: Run all tests**

```bash
cd frontend && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all suites PASS

**Step 2: Run lint**

```bash
cd frontend && npm run lint
```

Fix any issues before proceeding.

**Step 3: Final commit if any lint fixes**

```bash
git add -p
git commit -m "chore: lint fixes for artifact mentions feature"
```

---

## Summary of all new/modified files

| File | Action |
|------|--------|
| `src/pipelines/features/CreatePipeline/artifactTypes.ts` | Create |
| `src/workspaces/graphql/queries.graphql` | Modify (append 2 queries) |
| `src/workspaces/graphql/queries.generated.tsx` | Modified by codegen |
| `src/pipelines/features/CreatePipeline/ArtifactChip.tsx` | Create |
| `src/pipelines/features/CreatePipeline/ArtifactMentionPicker.tsx` | Create |
| `src/pipelines/features/CreatePipeline/AIChatPanel.tsx` | Modify |
| `src/pages/workspaces/[workspaceSlug]/pipelines/[pipelineCode]/code.tsx` | Modify |
| `src/pipelines/features/CreatePipeline/__tests__/ArtifactChip.test.tsx` | Create |
| `src/pipelines/features/CreatePipeline/__tests__/ArtifactMentionPicker.test.tsx` | Create |
| `src/pipelines/features/CreatePipeline/__tests__/AIChatPanel.test.tsx` | Modify |
