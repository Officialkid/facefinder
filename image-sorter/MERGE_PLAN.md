# ImageSorter + Facefinder Merge Plan

## Decision

`ImageSorter` becomes the product truth.

That means:

- The standalone `image-sorter/frontend` flow is the main user journey.
- The standalone `image-sorter/backend` pipeline is the main backend.
- The root `Facefinder` app is treated as a UX source library, not as the application foundation.

This avoids drifting back into a generic "AI photo finder" concept and keeps the product centered on the real use case:

1. Upload one reference face.
2. Provide a public event album or dataset link.
3. Scan the dataset.
4. Return ranked matching photos for download.

## What To Keep From ImageSorter

These parts already match the real product and should stay authoritative.

### Product flow

- Step-based flow in `image-sorter/frontend/src/app/page.tsx`
- `ReferenceUpload.tsx`
- `DatasetForm.tsx`
- `ProcessingStatus.tsx`
- `ResultsGrid.tsx`
- `StepIndicator.tsx`

### Backend truth

- Upload -> session -> queued job -> processing -> results lifecycle
- FastAPI route layout under `image-sorter/backend/app/routers/`
- Persistent session model in `image-sorter/backend/app/services/session_store.py`
- Worker queue in `image-sorter/backend/app/services/processing_queue.py`
- Dataset retrieval and cleanup services
- Structured status, error, and result schemas

### Product language

- "Reference photo"
- "Dataset URL"
- "AI processing"
- "Your results"
- Privacy-first temporary storage messaging

## What To Import From Facefinder

These are the useful parts of the root app that improve polish without changing product direction.

### Upload UX ideas

From `components/UploadZone.tsx`:

- stronger empty-state visual hierarchy
- clearer upload-complete state
- better drag-and-drop affordance
- more polished preview presentation

How to apply:

- keep `ReferenceUpload.tsx` as the component owner
- import only interaction and presentation ideas, not the whole component structure

### Dataset input UX ideas

From `components/LinkInput.tsx`:

- inline URL validation feedback
- supported-source chips
- stronger label and hint treatment

How to apply:

- keep `DatasetForm.tsx` as the owner
- add validation and source affordances that reflect the backend rules already enforced

### Processing UX ideas

From `components/ProcessingState.tsx`:

- richer phase messaging
- stronger progress card treatment
- better time and scan-count emphasis

How to apply:

- keep the backend-driven status model from `ImageSorter`
- use Facefinder only for presentation patterns, not fake progress logic

### Results UX ideas

From `components/ResultsGrid.tsx`:

- stronger result-card hierarchy
- better confidence badges
- improved toolbar and summary presentation
- more polished hover and detail affordances

How to apply:

- keep ImageSorter result data contract
- redesign the standalone `image-sorter/frontend/src/components/ResultsGrid.tsx` using these patterns

### CTA and header ideas

From `components/CTAButton.tsx` and `components/Header.tsx`:

- stronger "Find Me" CTA treatment
- cleaner sticky header treatment
- clearer readiness states

How to apply:

- keep ImageSorter's app structure
- borrow tone and visual hierarchy only where it reinforces the real workflow

## What Not To Import From Facefinder

These parts should stay out unless a very specific need appears.

- Generic "Find your photos instantly" landing framing if it weakens the reference-photo + dataset workflow
- Fake or UI-only progress behavior that does not map to backend reality
- Placeholder-only result cards with no backend-backed preview semantics
- Generic beta/brand framing that makes the project feel broader than event-photo retrieval
- Any root-app state management that competes with the standalone `ImageSorter` flow

## Backend Priorities From Here

The backend has already moved in the right direction. The next implementation order should be:

1. Result fidelity
   - add richer preview metadata
   - improve ranking detail
   - reduce duplicate or low-value matches
   - expose more useful result explanations to the UI

2. Observability depth
   - replace plain log-only visibility with structured event logs
   - add queue duration, job duration, failure counts, and processing-stage metrics
   - add clearer operational diagnostics around download failures and scan failures

3. Security hardening
   - expand content validation beyond basic file signature checks
   - tighten archive scanning rules further
   - add request size and source constraints where still missing

4. Worker separation
   - move from in-process queue to a separate worker boundary when ready
   - keep the current queue contract so the API does not need to change much

5. Processing tests
   - add deeper route-driven tests around queued -> running -> completed
   - add route-driven tests around queued -> failed
   - add cleanup and recovery tests for restart scenarios

## Frontend Priorities From Here

The frontend merge should happen in this order:

1. Keep the current standalone step flow.
2. Upgrade `ReferenceUpload.tsx` using Facefinder upload-state polish.
3. Upgrade `DatasetForm.tsx` using Facefinder input validation and supported-source affordances.
4. Upgrade `ProcessingStatus.tsx` using Facefinder visual treatment while preserving backend truth.
5. Upgrade `ResultsGrid.tsx` using Facefinder card and badge polish.
6. Add a refined standalone header and CTA language last.

## Implementation Rule

When there is a conflict:

- `ImageSorter` wins on workflow, API contract, backend behavior, and user task.
- `Facefinder` wins only on reusable presentation patterns that make the same workflow feel better.

## Concrete Next Build Steps

If implementation starts immediately, the next sequence should be:

1. Redesign `image-sorter/frontend/src/components/ReferenceUpload.tsx` with Facefinder's upload-state polish.
2. Redesign `image-sorter/frontend/src/components/DatasetForm.tsx` with better validation and supported-source UI.
3. Redesign `image-sorter/frontend/src/components/ResultsGrid.tsx` with stronger result-card hierarchy.
4. Improve backend result metadata so the upgraded results UI has better data to show.
5. Add route-level tests for the fuller processing lifecycle.
