# Pipeline Creation Redesign v2

**Date:** 2026-03-09
**Status:** Approved

## Context

Iteration on the initial pipeline creation redesign (v1). The full-page `/pipelines/new` route exists but feedback identified five issues:

1. Cards on a full page lose spatial context — user can't see the pipeline list behind them
2. Back buttons use raw `<button>` text links instead of the Button component
3. "Create with AI" prompt screen has no back button
4. No way to hide/show the AI assistant or start a fresh conversation
5. Version selector missing — saving should be explicit and intentional

**Alternative kept in reserve:** Option B (large centered sheet, 80–90% screen, translucent backdrop). Try if drawer feels wrong after implementation.

---

## Selection Screen

Replace the full-page route with a **right-side drawer** (~480px wide). The pipeline list remains visible behind it.

### Drawer structure

- Header: "New Pipeline" title + ✕ close button
- Body: 4 selection cards (2×2 grid) + CLI secondary link below (unchanged from v1)

### Panel transitions inside the drawer

**From Template / From Notebook:**
- Drawer content swaps to that panel
- ✕ is replaced by a back `<Button>` (ghost/secondary variant) in the header
- Clicking back returns to the selection cards

**Create / Create with AI:**
- Drawer expands to full-screen to give the code editor enough room
- Prompt screen (AI path only) appears first, with a back `<Button>` top-left returning to selection
- Editor phase also has a back `<Button>` top-left; if code has been modified, show a "Discard changes?" confirmation before returning

---

## Code Creation Panel — Top Bar

Left to right:

| Element | Notes |
|---|---|
| Back `<Button>` (ghost, ← icon) | Returns to selection; discard guard if code modified |
| Pipeline name input (flex-1) | Unchanged |
| Inline error message | Appears if name is empty on submit |
| AI toggle button (sparkles icon) | Shows/hides the AI panel |
| "Create Pipeline" primary button | Creates pipeline record + version 1 simultaneously |

The "Create Pipeline" label is kept (not "Save as Version 1") — the versioning detail is internal.

---

## AI Panel

Fixed-width right column (w-72). Toggled by the sparkles button in the top bar.

- **Hidden:** editor takes full width
- **Toggle animation:** simple CSS transition (slide in/out)

### Panel internals

- **Header:** "AI Assistant" label (left) + "New conversation" button — ghost, small — (right)
  - "New conversation" clears message history and resets to empty chat
- **Message history:** scrollable
- **Input area:** unchanged from v1

### AI suggestion card

The AI can send a special message variant — a suggestion card — e.g.:
> *"This looks good! Create your pipeline when you're ready."*

The card includes an inline "Create Pipeline" button that triggers the same action as the top bar button.

---

## Versioning Model

- During creation: no version exists until "Create Pipeline" is clicked
- "Create Pipeline" creates the pipeline record and version 1 in a single action
- This design does not introduce draft/auto-save state on the backend
- Version selector for the *edit* page (selecting/saving subsequent versions) is out of scope for this iteration

---

## What Is Out of Scope

- Version selector on the pipeline edit page (future iteration)
- AI actually generating code (panel is a UI shell)
- Any backend changes
