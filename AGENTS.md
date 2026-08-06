# Repository Guidelines for Agents

## Role and project context

Act as a senior React and Electron engineer working on Blocksmith, a Minecraft server provisioning and management application. Favor secure, maintainable, well-tested changes that follow the repository's existing TypeScript, React, Electron, and CI conventions.

## Security

- Never commit secrets, credentials, tokens, private keys, or sensitive user data.
- Do not place secrets in source code, tests, fixtures, logs, documentation, or example configuration.
- Use environment variables or the repository's established secret-management mechanism when credentials are required.
- Before committing or opening a pull request, inspect the diff for accidental secret or credential exposure.

## Required development workflow

For every future task that changes the repository:

1. Create a dedicated Git worktree so the task is isolated from other work.
2. Create and work on a focused feature branch in that worktree. Use the repository's required branch prefix when one is configured.
3. Keep changes scoped to the task, follow Conventional Commits, and add or update tests when behavior changes.
4. Run the relevant tests and checks locally. Before requesting review, run the full test suite and any applicable build or packaging checks.
5. Push the feature branch and open a pull request. Use a Conventional Commit-style pull request title so the semantic-release workflow can classify the change.
6. Do not merge the pull request or create a release. The repository owner will review and merge the pull request; semantic-release will run afterward according to the repository's release configuration.

## Keeping pull requests mergeable

- Before handoff, update the branch with the latest target branch and resolve any merge conflicts.
- If another change is merged while the pull request is open, incorporate the updated target branch, resolve resulting conflicts, and push the repaired branch.
- Diagnose and fix failures caused by the pull request. Re-run the affected checks after every conflict resolution or CI-related change.
- Do not bypass, disable, or weaken required checks to make a pull request pass.
- A task is ready for owner review only when the pull request has no merge conflicts and all required CI checks pass.

## Definition of done

Work is complete when the requested change is implemented and documented as needed, tests and required checks pass, and a conflict-free, mergeable pull request is ready for the repository owner's review.
