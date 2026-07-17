# FaceFinder AI API Notes

The active backend contract lives in `image-sorter/backend`.

Primary endpoints:

- `POST /api/upload/reference`
- `POST /api/process/start`
- `GET /api/results/{session_id}/status`
- `GET /api/results/{session_id}`
- `GET /api/results/{session_id}/download/{relative_path}`
- `DELETE /api/results/{session_id}`

Key behavior now covered by the backend:

- persistent session-backed processing state
- queue-based in-process job handling
- live stage and progress polling
- dataset download and extraction safety checks
- public gallery-provider ingestion for Google Photos, Pixieset, and Pixabay
- richer result metadata for ranked matches

Main backend/frontend contract files:

- `image-sorter/backend/app/models/schemas.py`
- `image-sorter/backend/app/routers/process.py`
- `image-sorter/backend/app/routers/results.py`
- `image-sorter/backend/app/services/dataset_retrieval.py`
- `image-sorter/frontend/src/lib/api.ts`
