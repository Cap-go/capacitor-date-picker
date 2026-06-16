# AGENTS.md

Guidance for this plugin:

- Use `bun` and `bunx` for development commands in this repository.
- Documentation examples may use `npm` and `npx`.
- Run `bun run verify:web` after TypeScript or README API changes.
- Run native verification when changing `ios/` or `android/`.

## Timeout Policy

- Keep CI, script, and runtime timeouts at 10 minutes or less. Use `timeout-minutes: 10` or lower in GitHub Actions and cap timeout values at `600000` ms, `600` seconds, or `10m` unless explicitly requested.
