# Security Rules

1. Master Admin credentials are created during secure deployment and are not hard-coded in the app.
2. Passwords are hashed with a modern password hashing algorithm on the server.
3. Never store passwords in HTML, JavaScript, localStorage, logs, or backups.
4. PIN is device-local and protected by the platform secure storage.
5. Biometric login uses Android BiometricPrompt / Windows Hello; biometric templates never enter the app database.
6. New device enrollment requires primary credentials and creates a device record.
7. Customer cannot reset credentials from a public Forgot Password flow unless the owner explicitly enables a recovery policy.
8. All sensitive operations generate audit log entries.
9. HTTPS/TLS is mandatory for production.
10. Backup exports must be encrypted in production.
