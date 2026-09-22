<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Documents

Where committed documents live. **A folder appears when its first document does**, so on day
one some of these paths do not exist yet.

| Path                 | What lands there                                                           | Who it is for                                              |
| -------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `docs/designs/`      | One folder per designed feature, and this index's sibling `README.md`      | Anyone changing a command, flag, help text or output shape |
| `docs/architecture/` | Decision records, architecture pages, structure diagrams                   | Anyone changing how the CLI is cut                         |
| `docs/spikes/`       | The findings page of a spike; never its prototype code                     | Whoever has to decide after the spike                      |
| `docs/runbooks/`     | What to do when something breaks, how a release is rolled back             | Maintainers on call                                        |
| `docs/deprecations/` | What goes, its replacement, the dates                                      | Users of 8cli and maintainers                              |
| `docs/performance/`  | How a number was measured, and the baselines                               | Anyone claiming 8cli got faster or slower                  |
| `docs/migrations/`   | One page per config, keychain or format move, with a `reversibility:` line | Users upgrading, and the rollback guard                    |
