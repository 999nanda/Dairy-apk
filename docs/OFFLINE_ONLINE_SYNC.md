# NANDA Dairy & Agro — Offline + Online Architecture

## Current build behavior
- Offline-first: farm entries continue without Internet.
- Local database: current prototype uses browser/WebView local storage.
- Connection indicator: shows Offline/Online state and pending local change sets.
- Sync button: marks local changes as ready for cloud sync.

## Production cloud sync still required
This project deliberately does **not** invent a cloud server or credentials. For true multi-device synchronization, the next deployment step must connect a secure backend such as a managed PostgreSQL/API service or an equivalent backend.

Required backend capabilities:
1. Secure Master Admin authentication.
2. Customer authentication with admin-created IDs.
3. Role-based access control.
4. Server-side password hashing; never store plain passwords.
5. Per-record ownership/tenant rules so customers can see only their own data.
6. Sync API with record IDs, revision/version, updated_at and deleted_at.
7. Conflict handling for offline edits.
8. Audit log for admin actions.
9. Encrypted transport (HTTPS/TLS).
10. Automated backups.

## Recommended sync model
Local write -> local pending queue -> Internet detected -> authenticated sync -> server acknowledgement -> pending item cleared.

Conflict policy should be defined per module. For simple daily milk entries, immutable append-only records are preferred. For master data such as customer profiles, use version numbers and explicit conflict resolution.

## Device behavior
- Android: offline data remains available in the app.
- Windows/Web: same account can access cloud data when online.
- New device: requires successful account authentication and an initial cloud download.
- Biometrics/PIN are device-local unlock methods; the master cloud account remains the source of identity.
