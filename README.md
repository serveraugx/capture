# Capture

An Angular application for registering students with photo capture. Originally backed by an HTTP API, it now uses an in-memory dummy data service while keeping the same public service API (Observables) so components required minimal change.

## Overview

Key features:

1. Student Registration – enter details and capture a photo via the browser camera.
2. Student List – view and delete students from an in-memory store.
3. Photo Capture – robust camera access with resolution, facing mode, and zoom (where supported).

The backend has been removed. All CRUD operations are handled in `src/app/services/student.ts` using an internal array. This makes it simple to later re-enable a real backend by restoring HttpClient calls without changing component logic.

## Architecture

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Models | `src/app/models` | TypeScript interfaces (`StudentRequest`, `StudentResponse`). |
| Service | `src/app/services/student.ts` | Provides CRUD methods returning `Observable` wrappers around in-memory data. |
| Components | `src/app/components/*` | UI logic: registration form, list view, photo capture. |
| Photo Capture | `photo-capture` component | Browser camera API, emits Base64 image to parent. |

### Data Flow
1. `StudentRegistration` captures form + photo → calls `studentService.registerStudent()`.
2. Service assigns an incremental id, stores a `StudentResponse` object in its internal array, returns it via `of()`.
3. `StudentList` subscribes to `studentService.getAllStudents()` to render data. deletions trigger a refresh.
4. No network calls; all operations are synchronous but still exposed as Observables to preserve flexibility.

### Dummy Data
Initial seed entries are defined in the service (`Alice Johnson`, `Bob Smith`). Modify or replace them in `student.ts` under the `students` array.

## Local Development

```bash
ng serve
```

Open `http://localhost:4200/`. Live reload is enabled.

If you encounter camera permission issues, ensure you are on `localhost` or HTTPS, and allow camera access when prompted.

## Building

```bash
ng build
```

Artifacts output to `dist/`. For production you can later reintroduce a backend; keep the service API identical for an easy swap.

## Testing

Unit tests:
```bash
ng test
```

Current tests only cover service creation. You can extend with component and service behavior tests (e.g. registering updates list length).

## Extending / Re-Enabling Backend

To point back to a real API:
1. Re-add `HttpClient` import and inject it.
2. Replace each method body with corresponding `http.get/post/put/delete` call.
3. Keep return types identical so components remain untouched.

Optionally introduce persistence by syncing the internal array to `localStorage` after each mutation (not implemented yet).

## Photo Capture Component

Located at `src/app/components/photo-capture/`:
- Requests camera permission, enumerates devices, supports switching camera and resolution.
- Emits Base64 JPEG via `photoCaptured` event to parent.
- Zoom applied using track capabilities (`applyConstraints`) when supported.

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No cameras listed | Permissions not granted or none available | Allow permission; verify device has a camera |
| Blank photo | Canvas draw failed before video ready | Wait for video to play before capture |
| Data lost on refresh | In-memory only | Implement localStorage persistence if needed |

## Scripts Reference

Common CLI commands:
```bash
ng generate component component-name
ng generate --help
```

## License

Internal project – no external license specified. Add one if distributing.

## Further Reading

- Angular CLI Docs: https://angular.dev/tools/cli
- MediaDevices API: https://developer.mozilla.org/docs/Web/API/MediaDevices

