# AI Chat Artifact Mentions — Design

**Date:** 2026-03-12
**Status:** Approved

## Overview

Add `@`-mention support to the `AIChatPanel` so users can attach workspace artifacts (datasets, files, database tables) to their AI messages as visual chips, sending structured context alongside the text prompt.

## Artifact Types

- **Datasets** — workspace datasets (name, slug)
- **Files** — workspace bucket objects (path, size)
- **Database tables** — workspace Postgres tables (name, row count)

## Components

### `ArtifactMentionPicker`

Floating popover above the input card, triggered by typing `@` in the textarea.

- Search field (auto-focused on open)
- Three tabs: Datasets · Files · Tables (lazy-loaded per tab, last-used tab remembered)
- Results list: icon + name + secondary info (description / path / row count)
- Keyboard nav: `↑↓` to move, `Enter` or click to select, `Esc` to cancel
- 300ms debounce on search input
- Width matches input card; max-height 280px with internal scroll
- Visual: `bg-white rounded-xl border border-gray-200 shadow-lg`

### `ArtifactChip`

Pill rendered in the chip strip:
`[type-icon] label  ×`

- Dataset: `CircleStackIcon`
- File: `DocumentIcon`
- Table: `TableCellsIcon`
- Style: `bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full px-2 py-0.5 text-xs`
- `×` removes the chip; backspace on empty textarea removes the last chip

### `ChipStrip`

Flex-wrap row between the panel header and input card.
Only rendered when `mentions.length > 0`.

### Modified `AIChatPanel`

- New required prop: `workspaceSlug: string`
- Detects `@` keydown, opens picker, manages `mentions: ArtifactMention[]` state
- `onSend` signature: `(message: string, mentions: ArtifactMention[]) => void`
- After send: clears textarea, chips, and closes picker

## Data Types

```ts
type ArtifactMention = {
  id: string;
  type: "dataset" | "file" | "table";
  label: string;   // display name in chip
  ref: string;     // e.g. "dataset:sales-2024", "file:data/output.csv", "table:patients"
};
```

## GraphQL

| Tab | Hook | Source |
|-----|------|--------|
| Datasets | `useDatasetPickerQuery` (existing) | `datasets/graphql/queries.graphql` |
| Files | `useArtifactFilesQuery` (new) | lightweight BucketExplorer query |
| Tables | `useArtifactTablesQuery` (new) | `workspace.database.tables` |

New queries added to `workspaces/graphql/queries.graphql` (or a new `pipelines/graphql/queries.graphql`), codegen run to produce typed hooks.

## Message Format Sent to AI

Mentions are prepended as a context block:

```
[Context: dataset:sales-2024, table:patients]
Calculate the average age per region
```

Constructed in `code.tsx` `handleAISend`.

## Changes to `code.tsx`

- Forward `workspaceSlug` to `AIChatPanel`
- `handleAISend(message: string, mentions: ArtifactMention[])` — builds context prefix, appends to message before mock AI response

## Interaction Flow

1. Type `@` → picker opens, Datasets tab active
2. Type to filter (300ms debounce)
3. Click or `Enter` → `@` + filter text removed from textarea, chip added
4. Repeat for multiple artifacts
5. Write message, press `Enter` or click Send
6. Chips + textarea cleared; `onSend(message, mentions)` called

## Out of Scope

- Connections (deferred to later)
- Resuming historical mentions when viewing past conversations
- Server-side AI integration (mock responses only for now)
