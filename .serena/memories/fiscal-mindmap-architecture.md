# Fiscal Mindmap Architecture

## Overview
The fiscal rule engine has been refactored from separate `fiscalRules` (individual rules) to a **single navigable mind map** (`fiscalMindmap` table) that stores the entire decision tree as a graph.

## Data Model
- **Table**: `fiscalMindmap` (singleton) — stores `nodes[]`, `edges[]`, `updatedAt`
- **Node types**: `startNode`, `groupNode`, `conditionNode`, `taskNode`, `nothingNode`
- **Edge handles**: Condition nodes have `oui` (left) and `non` (right) source handles

## Backend Files
- `convex/fiscalMindmap.ts` — CRUD (get, save, preview)
- `convex/fiscalMindmapEngine.ts` — BFS graph traversal engine
- `convex/seedFiscalMindmap.ts` — Seeds initial decision tree (~100 nodes)
- `convex/fiscalEngine.ts` — Still used for `evaluateCondition()` and `calculateDate()`

## Frontend Files (components/fiscal-rules/)
- `mindmap-canvas.tsx` — Main React Flow canvas with toolbar, legend, preview panel
- `mindmap-start-node.tsx` — Root node (primary color)
- `mindmap-group-node.tsx` — Category groups (IR, IS, TVA, CFE, CVAE, TAXES) with color coding
- `mindmap-condition-node.tsx` — Conditions with OUI/NON handles
- `mindmap-task-node.tsx` — Fiscal tasks with badges
- `mindmap-nothing-node.tsx` — Dead ends

## Priority Chain in runs.ts
`mindmap → fiscalRules → legacy generateFiscalTasks()`

## Seed
Run `seedFiscalMindmap.seedMindmap` from Convex dashboard to initialize the decision tree.

## Old files still present (backward compatible)
- `convex/fiscalRules.ts` — Old CRUD (still functional as fallback)
- `convex/seedFiscalRules.ts` — Old seed data
- Old React Flow nodes (rule-node, condition-node, branch-node, task-node) — could be cleaned up
- Old editors (condition-editor, task-editor, date-formula-editor, rule-flow-canvas, etc.) — could be cleaned up
