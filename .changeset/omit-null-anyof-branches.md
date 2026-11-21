---
"@composio/core": patch
---

Fix `omitNullToolArguments` dropping `null` for an optional parameter declared only in a later `anyOf`/`oneOf` object branch of a strict-mode tool schema.
