# Documents

Where each kind of committed document lives. **A folder appears when its first document does** –
none is created empty, so on day one most of these paths do not exist yet.

| Path                | What lands there                                                       | Who it is for                                    |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| `docs/designs`      | one folder per designed feature, and the index `README.md`             | whoever builds or reviews a command's surface    |
| `docs/architecture` | decision records, architecture pages, structure diagrams               | maintainers changing how 8cli is built           |
| `docs/spikes`       | the findings page of a spike; never its prototype code                 | whoever decides whether to build the thing       |
| `docs/runbooks`     | what to do when an alert fires, how a deploy is rolled back            | whoever is on the hook when it breaks            |
| `docs/deprecations` | what goes, its replacement, the dates                                  | users and scripts that depend on the old surface |
| `docs/performance`  | how a number was measured, and the baselines                           | whoever claims something got faster or slower    |
| `docs/migrations`   | one page per schema, data or format move, with a `reversibility:` line | whoever runs or rolls back the move              |

Each path is set by a `paths.*` key in `.xezar/pipeline/config.json`; change the key, not this
table, if a folder moves.
