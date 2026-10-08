# Build & Deployment Plan

## Android
Open this project in Android Studio and build an APK/AAB.

## Windows
The production target is a Windows desktop client using the same web frontend and cloud API. It can be packaged with a desktop wrapper after the cloud backend is connected.

## Web
Deploy the web frontend over HTTPS and connect it to the same backend.

## Important
This repository is a packaged Android wrapper around the current local-first prototype. The documents in `docs/` define the production cloud/multi-device requirements. A production release must add a real backend, database, server-side authentication/authorization, secure password hashing, device enrollment, and cloud synchronization before being used for real customer accounts or financial data.
