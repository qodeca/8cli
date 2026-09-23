# Parked

Calls the leader made alone while the owner was away. Empty.

## 2026-09-23 23:08 – no public issue for the keychain argv exposure

- Chose: did NOT file a public GitHub issue for the pre-existing bug where `src/keychain/macos.ts` passes secrets to `security add-generic-password -w <value>` (visible in the process list while it runs). It affects released 8cli versions.
- Why: SECURITY.md says vulnerabilities are not reported through public issues. (The finding is already visible in a PR #33 comment by the security reviewer.)
- Rejected: filing a public issue now; opening a private GitHub security advisory without you (outward-facing, your call).
- Undo / next: in the morning decide – private advisory + fix PR, or treat as low severity and fix in the open.
