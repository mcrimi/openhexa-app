# Pipeline Creation Redesign

**Date:** 2026-03-09
**Status:** Approved

## Problem

The current pipeline creation flow uses a modal dialog with three tabs (From Template, From Notebook, From OpenHEXA CLI). This pattern has two core problems:

1. It conflates instantaneous creation (pick a template, done) with generative creation (write code, iterate with AI), giving them equal weight in a cramped modal.
2. There is no intermediate creative step for code-first pipelines — the user goes from "create" directly into an editing experience with no room to write or generate the initial code.

The goal is to introduce a proper creation phase for code-first pipelines while keeping the template/notebook paths fast.

## Solution Overview

Replace the "Create" button → modal pattern with a dedicated full-page creation route:

```
/workspaces/[slug]/pipelines/new
```

This page handles two phases via local component state:

- **Selection phase** — user picks a creation method
- **Creation phase** — user completes the chosen flow

The existing `CreatePipelineDialog` is retired. Its logic is distributed into standalone panels within the new page.

---

## Selection Phase

Full-page centered layout. Headline: "How do you want to create your pipeline?"

Four primary cards in a 2×2 grid:

| Card | Subtitle |
|---|---|
| **Create with AI** | Describe what you want, AI writes the code |
| **Create** | Write your pipeline code in the browser |
| **From Template** | Start from a shared template |
| **From Notebook** | Convert a Jupyter notebook |

"Create with AI" receives visual emphasis (highlighted border or badge) to surface the AI capability.

Below the cards, a secondary text link:
> "Prefer working locally? [Set up the CLI →]"

This opens the existing CLI instructions panel (pip install, workspace config, access token). CLI is informational only — it is not a creation flow.

---

## Creation Phase

### Create with AI

**Step 1 — Prompt screen** (full-page centered):
- Headline: "What do you want to create today?"
- Large textarea
- Hint text: `use @ to reference context, / for template prompts`
- Send button
- On submit → transitions to the editor layout

**Step 2 — Editor + AI panel:**
- Left: file tree + code editor (reuses `PipelineFilesEditor`)
- Right: AI assistant panel — conversation history at top, same text input with `@` / `/` hints at bottom. Panel is toggleable.
- Top bar: pipeline name field (editable inline), "Create Pipeline" button
- "Create Pipeline" fires `createPipeline` mutation with current code state → redirects to pipeline detail page

### Create (manual)

Same editor + AI panel layout as above, but:
- Skips the prompt screen — editor opens immediately
- AI panel is present but secondary (collapsed by default or open but quiet)
- User can invoke the assistant at any point

Both "Create with AI" and "Create" share the same underlying page component. The entry point determines initial state only.

### From Template

- Embeds the existing `PipelineTemplates` browser full-width
- User selects a template → "Use Template" fires `createPipelineFromTemplateVersion` → redirects immediately
- No intermediate code step

### From Notebook

- Simple form: pipeline name + notebook picker (`.ipynb` files) + optional functional type
- "Create Pipeline" fires `createPipeline` with notebook path → redirects immediately
- Mirrors today's notebook tab, without the modal chrome

### CLI Instructions Panel

- Renders existing CLI setup content (pip install command, workspace config command, access token reveal)
- Accessible via the secondary link on the selection screen, not a primary creation path

---

## AI Panel Component

The AI assistant panel is designed as a standalone component from the start so it can be reused in the pipeline edit page later without rework. It is not wired into the edit page in this iteration.

---

## Routing & Navigation

- "Create" button on the pipelines list page navigates to `/workspaces/[slug]/pipelines/new` instead of opening a dialog.
- A "← Back" link in the creation phase returns to the selection phase (local state reset, no navigation).
- On successful pipeline creation all paths redirect to `/workspaces/[slug]/pipelines/[code]`.
- The existing `CreatePipelineDialog` component is removed.

---

## What Is Out of Scope

- AI assistant integration into the pipeline edit page (designed for later reuse)
- Backend changes (no draft/pipeline state needed — creation is deferred until explicit save)
- Any changes to the pipeline detail or edit pages
