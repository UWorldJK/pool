# Staff engineer standards

* [DISCOVERED] Code style: 2 space indent, double quotes, semicolons, `@/*` import alias, no comments that restate code; comments explain why.
* [DISCOVERED] Tests run with `node --test` and native TypeScript type stripping; `npm run check` = lint + typecheck + test + build.
* [DISCOVERED] No secrets in `NEXT_PUBLIC_` variables; public key only in session code.
* SQL: lowercase keywords, fully qualified names inside `security definer` functions, `set search_path = ''`.
* Every user visible string follows the anti AI writing rules (no em dashes, plain verbs).
* Server only modules import `server-only`.

## Features
* [core-ride-loop](core-ride-loop.md)
