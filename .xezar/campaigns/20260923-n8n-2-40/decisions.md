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
