# Backward compatibility – what 8cli must not break

8cli is used by scripts and AI agents that parse its output. These are the contracts a change must
keep. Breaking one needs the owner's decision, a `💥` entry in `CHANGELOG.md` and a major or
(before 1.0) minor version.

| Contract                                                                                | Where it is defined                      |
| --------------------------------------------------------------------------------------- | ---------------------------------------- |
| Command names, aliases, flags and arguments                                             | `src/commands/*.ts`, `README.md`         |
| stdout is valid JSON by default; list commands print arrays, get commands print objects | `CLAUDE.md` § AI-first design principles |
| Write commands report `{ "files": [...] }`                                              | same                                     |
| Errors go to stderr as `{ "error", "code" }`; existing `ERR_*` codes keep their meaning | `src/formatters/`                        |
| Exit code 0 on success, 1 on error                                                      | same                                     |
| Config resolution order: CLI flags → env vars → config file → keychain → defaults       | `src/config.ts`                          |
| Env var names: `N8N_URL`, `N8N_API_KEY`, `N8N_EMAIL`, `N8N_PASSWORD`                    | `src/config.ts`                          |
| Config file name and location: `8cli.json` in the working folder or `configs/`          | `src/config.ts`                          |
| Keychain service `8cli`, accounts `{url}/api-key`, `{url}/email`, `{url}/password`      | `src/keychain/`                          |
| Node.js 22+                                                                             | `package.json`                           |

Adding a command, a flag, an optional JSON field or a new error code is compatible. Removing or
renaming one, changing a field's type, or changing what an existing error code means is not.

The e2e golden snapshots in `test/e2e/__snapshots__` are the executable form of the output
contract. Update a snapshot only when the change to the output is intended and stated in the pull
request.
