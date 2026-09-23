# `user` – users

Lists n8n users and reads one user. 8cli cannot create, change or delete users.

| Subcommand                | What it does   |
| ------------------------- | -------------- |
| [`user list`](#user-list) | List all users |
| [`user get`](#user-get)   | Print one user |

## user list

```text
8cli user list
```

No options.

```bash
8cli user list
```

```json
[
  {
    "id": "a4e2380e-75bb-4d1d-a147-e0d420b5a5ad",
    "email": "owner@example.com"
  }
]
```

**Output:** an array of `{ id, email, role }`. **`role` is left out when n8n does not send it,
and n8n 2.40.5 does not**, so on 2.40.5 you get `{ id, email }`.

**Errors:** `ERR_USER_LIST`.

## user get

Prints one user. `<id>` can be the user's ID or email address.

```text
8cli user get <id>
```

No options.

```bash
8cli user get a4e2380e-75bb-4d1d-a147-e0d420b5a5ad
```

```json
{
  "id": "a4e2380e-75bb-4d1d-a147-e0d420b5a5ad",
  "email": "owner@example.com",
  "firstName": "Local",
  "lastName": "Owner"
}
```

`8cli user get owner@example.com` returns the same user.

**Output:** `{ id, email, firstName, lastName, role }`; as with `user list`, `role` is missing on
n8n 2.40.5.

**Errors:** `ERR_USER_GET`, for example:

```json
{
  "error": "Could not find user with id: 00000000-0000-0000-0000-000000000000",
  "code": "ERR_USER_GET"
}
```
