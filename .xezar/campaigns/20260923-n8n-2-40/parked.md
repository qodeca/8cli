# Parked

Calls the leader made alone while the owner was away. Empty.

## 2026-09-23 23:08 – no public issue for the keychain argv exposure

- Chose: did NOT file a public GitHub issue for the pre-existing bug where `src/keychain/macos.ts` passes secrets to `security add-generic-password -w <value>` (visible in the process list while it runs). It affects released 8cli versions.
- Why: SECURITY.md says vulnerabilities are not reported through public issues. (The finding is already visible in a PR #33 comment by the security reviewer.)
- Rejected: filing a public issue now; opening a private GitHub security advisory without you (outward-facing, your call).
- Undo / next: in the morning decide – private advisory + fix PR, or treat as low severity and fix in the open.

## 2026-09-23 23:09 – PR #33: keychain store disabled in the setup script (scope trim)

- Chose: the local-n8n script stops using the macOS keychain for the generated secrets; it stores them only in the protected env file, and `--store keychain` is refused. No src/ change in PR #33.
- Why: the keychain path leaks secrets through the pre-existing backend bug; fixing src/keychain/macos.ts belongs to a separate, security-policy-handled fix (see the parked entry above). Keeps #33 unblocked.
- Rejected: fixing src/keychain/macos.ts inside PR #33 (mixes a product security fix into dev tooling, and makes its disclosure public before you decide).
- Undo: once the backend is fixed, re-enable `--store keychain` in scripts/local-n8n/local-n8n.ts.
