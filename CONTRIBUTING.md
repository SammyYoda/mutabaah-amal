# Contributing

Thanks for your interest in improving Mutaba'ah Amal.

## Setup

Requires Node.js >= 20.

```bash
npm install
npm run create-admin   # creates data/mutabaah.db and the first admin
npm run dev            # web: http://localhost:3000   API: http://localhost:3101
```

## Tests

```bash
npm test               # unit + integration (vitest)
npm run test:e2e       # Playwright smoke test
```

The first E2E run needs a browser: `npx playwright install chromium`. The E2E uses ports 3000, 3101 and 3199 and throw-away databases under `data/`.

## Pull requests

- Keep changes focused; one concern per PR.
- Add or update tests for behaviour changes, and make sure `npm test` passes.
- Update `README.md` or `docs/ARCHITECTURE.md` if you change configuration, the API or the data model.
- Never commit `.env`, databases or anything under `data/`.
- Describe what changed and why in the PR description.

## Language

The user interface and its error messages are in Malay only. Keep new UI text in Malay, consistent with the existing wording. Code, comments, documentation and commit messages are in English. Translating the UI is a welcome but larger discussion; please open an issue first.

## Security issues

Do not open public issues for vulnerabilities; see `SECURITY.md`.

## License

By contributing you agree that your contributions are licensed under the MIT License.
