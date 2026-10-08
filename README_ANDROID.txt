NANDA Dairy & Agro — Master Android Project

This package is the current master project based on the NANDA Dairy & Agro prototype and the latest requested product requirements.

Included product requirements:
- Android + Windows + Web target architecture
- Master Admin controlled customer account creation
- Automatic unique customer IDs and temporary passwords
- Customer-only access to own data
- Password + device PIN + biometric/Windows Hello target login
- Individual lifetime cow records, daily/session milk, lactation history
- Breeding, AI, pregnancy, calving, calf and pedigree
- Semen/bull company, breed, sexed/conventional, price and stock tracking
- Four milk sales channels: House Shop, Amul, Others, Customer / Direct
- Manual milk rates and automatic sales/profit calculations
- Automatic expense deduction for operating profit
- Customer orders, payments, bills and statements
- Feed/medicine stock and alerts
- Reports and audit/security requirements

CURRENT BUILD STATUS
- The included Android client is a local-first prototype wrapper and is usable for demonstration/testing.
- It is NOT yet a production cloud multi-user system.
- For real Android + Windows + Web synchronization, connect the frontend to a secure backend/cloud database using the specification in docs/.

Demo login in the prototype:
Admin: admin / admin123
Customer: cust001 / 1234

IMPORTANT: Replace demo credentials and do not use them for production.

Build APK:
1. Open this folder in Android Studio.
2. Let Gradle sync.
3. Build > Build APK(s).
4. Debug APK normally appears at app/build/outputs/apk/debug/app-debug.apk

See docs/NANDA_MASTER_SPEC.md, docs/DATABASE_SCHEMA.md and docs/SECURITY.md for the production target.

OFFLINE + ONLINE NOTE
---------------------
This master project is now structured as an offline-first application. Data entry works without Internet and an online/offline indicator is shown. A local pending-change marker is maintained for the future cloud sync service.
A real multi-device cloud backend is intentionally not fabricated in this ZIP; it must be deployed and securely configured before production use across phones/Windows/web.
