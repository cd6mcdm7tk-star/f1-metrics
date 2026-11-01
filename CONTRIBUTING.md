# Contributing

Thanks for wanting to help. There are three ways in, from the quickest to the most involved.

## A number looks wrong

Open an issue with the link to what you were looking at: the link button at the top right of the Telemetry page copies one that opens the same comparison. Say what you expected and where it comes from (the official timing, a broadcast graphic, another tool). The [Methodology](https://metrikdelta.com/methodology) page explains how every number is computed and where the data has limits, so some surprises are known ones.

## An idea

Open an issue describing what you'd like to see and why. A screenshot or a sketch helps.

## Code

1. Get it running: see [Running it locally](README.md#running-it-locally). The backend needs no database or account to start.
2. Keep a pull request to one change, and say in it what it changes for someone using the site.
3. Run the checks before pushing. They run again on every pull request:

   ```bash
   cd frontend && npm test && npm run lint && npx tsc -b
   cd backend && pytest
   cd video && npm test && npm run typecheck
   ```

How the code is written:

- English everywhere: code, comments, commit messages.
- Comments say why, in a line or two; what changed and when belongs in the commit message.
- A calculation comes with a test, with numbers you can check by hand.
- No `console.log` or `print` left in, no emoji in the interface or the logs.
- Strict TypeScript, zero lint errors.

Data: only sources whose terms allow what the site does with them (FastF1, OpenF1, Jolpica today). Nothing taken from Formula 1's own products, broadcasts or apps.

By opening a pull request, you agree that your contribution is published under the project's license, the [GNU AGPL-3.0](LICENSE).
