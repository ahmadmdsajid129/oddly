# Oddly Internal Admin Portal (`apps/admin`)

> Internal administrative portal for question authoring, bulk batch imports, panel testing, editorial approval, and content moderation.

This application is formally implemented and configured in **Stage 11**.

---

## Capabilities (Stage 11 Scope)

- Google SSO with role-based access control (Writer, Approver, Admin) and email allowlist.
- Polymorphic Question Editor supporting all 5 question types with real-time phone-sized preview.
- Bulk JSON batch importer supporting `seed/oddly_batch_001_first_14_days.json`.
- Automated entropy scoring and skewed-option warnings.
- Two-person editorial approval workflow and D-2 lock enforcement.
- Operational control center: live question pull, window extensions, report moderation queue, and immutable audit logs.
