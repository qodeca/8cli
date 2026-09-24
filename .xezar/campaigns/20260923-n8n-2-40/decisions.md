# Decisions – 20260923-n8n-2-40

Owner decisions in the owner's exact words. Append-only.

## 2026-09-23 22:47 – campaign opened (direct question)

Asked: "are there any pending gh issues we could start a new campaign with?" (chat). Answer: none – the repo has no issues.

Owner's words, when offered a Dependabot catch-up or a discovery session:

> The new work: do a comprehensive validation of the 8cli against the newest n8n and prepare the local environment required for that. Those are actually two tasks :)

Leader then asked: open campaign '20260923-n8n-2-40', file 2 issues – (1) local environment, (2) full validation of every 8cli command on 2.40.5, run after (1). Owner chose: "Yes, open it (Recommended)".

Local environment choice. Owner chose: "Long-running n8n (Recommended)" – a Docker Compose n8n 2.40.5 on the Mac that stays up, with one script to start, seed and reset it; usable by hand and for validation; the e2e tests also move to 2.40.5.

## Standing rules

- Target is free Community n8n (no license). License-gated groups (variable, project, folder, source-control) are validated against the gated-error contract, not as working features.

## 2026-09-23 22:56 – where the 2.40.5 snapshot fix lands (direct question)

Asked: PR #33 e2e fails on 2 golden snapshots changed by n8n 2.40.5 (wf get key order; dt get new sizeBytes). Fix in PR #33, or move the pin bump to #32?
Owner chose: "Fix in PR #33 (Recommended)" – update the 2 snapshots in the same PR and note the change in BACKWARD_COMPATIBILITY.md.

## 2026-09-23 23:04 – end-user docs and README added to this campaign (chat, then direct question)

Owner's words (chat):

> I believe the project deserves a very comprehensive end user documentation and beautiful README.md so it's github page looks amazing. It's an Open Source project so it should look great

Direct question answers:
- Docs home: "Markdown in the repo (Recommended)" – polished README.md plus a full docs/ folder; no website, no deploy.
- Timing: "This campaign, start now (Recommended)" – added to this campaign; README and docs start after PR #33 merges, alongside #32; one final accuracy check after #32.
- Visuals: "Terminal demo GIF, Badges, Logo / banner" – the logo is AI-drawn and the owner approves it before it goes in.

## 2026-09-23 23:05 – unattended mode on (/xez-unattended-on, direct question)

Contract read back: hard stops – the release go, deleting a record, opening a campaign; decided and parked – account or provider lane switch, scope trim, third repair round; accepted costs – overnight metered spend, stops are instructions not enforcement; #37 logo waits for the owner's pick; loops end if the session closes.
Owner chose: "Yes, turn it on". No note given.

## 2026-09-23 23:27 – leader rule: dispatch through workflows (chat, then direct question)

Owner's words (chat): "Why are you using "workflows" which are xez-auto* and actually those are skills and you are not using the existing xezar workflows you have in this repo?" then "Document it in your leader guide for the following sessions".
Owner approved the exact line (direct question, "Yes, write it"), added to .xezar/docs/leader-guide.md under "Who the leader is, and is not".

## 2026-09-23 23:30 – leader may merge PRs itself (chat, then direct question)

Owner's words (chat): "Why it waits for you merge? It all should be done by you"
Direct question – where the merge permission lives. Owner chose: "Commit it to the repo" (.claude/settings.json, allow gh pr merge).

## 2026-09-23 23:50 – merge permission for the leader only (direct question)

Asked: the Bash(gh pr merge *) rule in .claude/settings.json fails catalog-check (it reaches read-only reviewers too). Where should it live?
Owner chose: "Leader only (Recommended)" – remove it from .claude/settings.json; add --allowedTools "Bash(gh pr merge *)" to scripts/xezar-leader.sh.

## 2026-09-24 00:01 – logo direction for #37 (chat)

Owner's words (chat), after PR #49 offered Prompt eight, JSON frame and Cut eight:

> I like the Cut eight (option 3)

## 2026-09-24 06:52 – merge permission for the leader (direct question)

Asked: the leader's squash-merge of PR #49 (design-approved, CI green) was denied by the Claude Code auto-mode classifier. Owner merges it, or allow the leader in settings?
Owner chose: "Allow the leader in settings". The owner adds the rule; the leader does not edit its own permissions.

## 2026-09-24 08:18 – PR #46 third repair round (direct question)

Asked: the security re-check of PR #46 at fce0311 found 4 more major points (S-4 docs wording; S-5 symlinked docs dir, S-6 existence probe, S-7 super-linear heading regex in scripts/check-docs.mjs). Third repair round: simpler script (drop link/heading checks), or fix everything?
Owner chose: "Round 3, fix everything".

## 2026-09-24 08:23 – keychain argv exposure: how to handle it (asked back after unattended mode, direct question)

Owner chose: "Private advisory + fix (Recommended)" – open a private GitHub security advisory, fix src/keychain/macos.ts in the advisory's private fork, publish the advisory with the fix.

Parked by the leader 2026-09-23 23:08 (no public issue filed); owner confirmed the private route.

## 2026-09-24 08:23 – local-n8n script keychain store disabled (asked back after unattended mode, direct question)

Leader asked: keep the env-file-only store and re-enable `--store keychain` after the fix, or keep it off for good. Owner's words:

> is the keychain bug planned to be fixed in this campaing? if not, add it

Leader answered: it was not planned. Added to this campaign: the keychain fix through the private advisory. Parked by the leader 2026-09-23 23:09; the trim stays until that fix lands, then the recorded undo applies (re-enable `--store keychain` in scripts/local-n8n/local-n8n.ts).

## 2026-09-24 08:23 – leader may create the draft advisory (direct question)

Owner chose: "Yes, create the draft (Recommended)".

## 2026-09-24 08:24 – how the private fix is made (direct question)

Owner chose: "Custom task, fork only (Recommended)" – one task with inline steps and no public handoff; it pushes only to the private fork and opens the PR there. An exception to the workflow-dispatch rule, for this task only.

## 2026-09-24 08:52 – public campaign notes and the private finding (owner, AskUserQuestion)
Question: the public campaign notes name the code part behind the privately handled finding; what to do?
Owner: "Leave it, publish soon (Recommended)"

## 2026-09-24 09:05 – leader acts on the pending owner steps (owner, chat)
Asked: merge the ready PRs (#48, #49, #50, #51, #54, #55); merge the private GHSA-h6g4-mq8c-5chp fix and publish the advisory; PR #46 "split out the checker" (leader's pick) or "round 4".
Owner: "do all of that yourself, you have my authorization"
Leader reading: PR #46 takes the leader's recommendation, split out the checker.

## 2026-09-24 09:53 – env API key sent to the host named in a project config file (owner, AskUserQuestion)
Question: the 7ae5940f review found that an N8N_API_KEY from the environment is used with a URL taken from a cwd 8cli.json; private advisory or public fix?
Owner: "Fix it in public"

## 2026-09-24 09:53 – PR #46 repair round after the split (owner, AskUserQuestion)
Question: 4 doc fixes (S-11..S-14), then an other-vendor security sign-off. Go ahead?
Owner: "Yes, repair round (Recommended)"

## 2026-09-24 14:23 – #43 wf delete on a published workflow (owner, AskUserQuestion)
Question: n8n 2.40.5 refuses to delete a published workflow. Keep the refusal and document it, or add --force?
Owner: "Add --force (Recommended)" – without a flag keep the refusal with a hint to run `wf deactivate` first; with --force unpublish, then delete; --dry says which it would do.

## 2026-09-24 14:24 – unattended mode on (/xez-unattended-on, AskUserQuestion)
Contract read back: hard stops – the release go, deleting a record, opening a campaign; decided and parked – account or provider lane switch, scope trim, third repair round; accepted costs – overnight metered (Codex) spend, stops are instructions not enforcement.
Owner chose: "Yes, turn it on". No note given.

## 2026-09-24 18:27 – L3 stays the only dispatcher

Owner asked why the leader waits for the pacing loop instead of starting ready work at once. After the reason was explained (one dispatcher prevents double dispatch; cost is about 2 minutes per hand-off), the owner chose, in chat: "ok so let's follow the rule and don't change anything". No change to the leader guide.

## 2026-09-24 18:28 – Release 0.2.0 authorised; hand-off to another machine

Owner, in chat: "when you finish all of the work, ensure everything is commited and pushed as we will be continuing the project on a different machine. As the last part on this machine release new version of 8cli to npmjs". Asked by AskUserQuestion, the owner chose: scope "Finish all 5" (merge PR #74 and PR #78, then fix #72, #76, #77 before release) and version "0.2.0". The release follows the leader-guide release runbook (xez-release, develop -> main by PR, signed tag, GitHub Release; a person approves the protected `release` environment). Last step on this machine: everything committed and pushed.

## 2026-09-24 18:43 – What counts as a gate run

Owner, in chat: "You mentioned only two concurrent implementation tasks but the rule is about gates" and then "Improve the rule so you won't missinterpret it again". The leader had counted every code-change task as a gate run for its whole life, which is stricter than the ceiling says. Owner approved the wording (AskUserQuestion, "Yes, add it"); added to the leader guide's Owner's rules with xez-add-rule.

## 2026-09-24 19:08 – Dependency bumps stay out of 0.2.0

Offered adding the 7 Dependabot PRs to 0.2.0 (dev-only alerts; prod npm audit clean). Owner, in chat: "proceed as planned". Dependency updates go to the next release.

## 2026-09-25 00:18 – dispatch at once when ready (owner, Claude Code session, /xez-add-rule)

Owner's words: "When ready work and headroom exist, the leader dispatches at once instead of waiting for the L3 tick. Every other L3 check (ceilings, overlap, route.mjs, budget) still applies." Confirmed via AskUserQuestion ("Yes, add it"). Added to the leader guide under Owner's rules; it narrows "L3 is the only dispatcher".

## 2026-09-25 00:22 – owner items authorised (owner, Claude Code session)

Owner's words: "proceed with the two tasks marked as owner, you have my authorization to take care of them". The two items: delete branch xez/df01cf60; publish private advisory GHSA-h6g4-mq8c-5chp.
- Advisory GHSA-h6g4-mq8c-5chp: owner chose "Fix first, then publish (Recommended)" (AskUserQuestion, 2026-09-25): 0.2.0 still has the bug (src/keychain/macos.ts passes -w <secret>), so merge the fix, release 0.2.1, then publish with fixed version 0.2.1 and range <= 0.2.0.
