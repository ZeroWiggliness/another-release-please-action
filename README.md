# Another Release Please Action

![Linter](https://github.com/ZeroWiggliness/another-release-please-action/actions/workflows/linter.yml/badge.svg)
![CI](https://github.com/ZeroWiggliness/another-release-please-action/actions/workflows/ci.yml/badge.svg)
![Check dist/](https://github.com/ZeroWiggliness/another-release-please-action/actions/workflows/check-dist.yml/badge.svg)
![CodeQL](https://github.com/ZeroWiggliness/another-release-please-action/actions/workflows/codeql-analysis.yml/badge.svg)
![Coverage](./badges/coverage.svg)

A GitHub Action that wraps
[`@zerowiggliness/another-release-please`](https://github.com/ZeroWiggliness/another-release-please)
to automate release pull requests, version calculation, and releases directly
from your GitHub Actions workflows.

## Permissions

For the default GITHUB_TOKEN the following CI/CD you need the following. It
recommened to make your own token though as the default GITHUB_TOKEN will not
trigger other workflows. Only a PAT will.

permissions: 
  contents: write
  pull-requests: write

Also your repository settings need to have "Allow GitHub Actions to create and approve pull requests" set to true.

IMPORTANT: Known issue, if you see a fast forward error the first time you intialize the repository this is often because of lack of permissions. You usually need to delete the (by default arp--main--main branch and then rerun).

## Commands

The `command` input accepts a comma-separated list of the following commands,
executed in the order specified.

### `release-pr`

Creates or updates a release pull request for your repository.

### `calculate-next`

Calculates the next version based on commits since the last release. Use the
`write-local` input to write updated version files to the local filesystem
instead of committing them to the branch.

### `release`

Creates a GitHub release from an existing release pull request that has been
merged.

## Usage

### Default (create a release PR, then publish)

The default command runs `release` followed by `release-pr` — it creates a
GitHub release if a release PR was merged, then opens a new release PR for the
next version.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ZeroWiggliness/another-release-please-action@v1
```

### Full release cycle in a single step

Run `release-pr` first to open the pull request, then `release` once it is
merged:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ZeroWiggliness/another-release-please-action@v1
    with:
      command: release-pr,release
```

### Create a release PR only

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ZeroWiggliness/another-release-please-action@v1
    with:
      command: release-pr
```

### Publish a release only

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ZeroWiggliness/another-release-please-action@v1
    with:
      command: release
```

### Calculate the next version

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ZeroWiggliness/another-release-please-action@v1
    with:
      command: calculate-next
```

## Inputs

| Input                       | Required | Default                    | Description                                                                                                     |
| --------------------------- | -------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Input                       | Required | Default                    | Description                                                                                                     |
| ----------------------      | -------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `command`                   | No       | `release,release-pr`       | Comma-separated list of commands to run in order: `release-pr`, `calculate-next`, or `release`                  |
| `provider`                  | No       | `github`                   | Version control provider to use                                                                                 |
| `token`                     | No       | `${{ github.token }}`      | GitHub token used to interact with the repository                                                               |
| `repository`                | No       | `${{ github.repository }}` | Repository in `owner/repository` format                                                                         |
| `target-branch`             | No       | _(repository default)_     | Target branch for the release PR                                                                                |
| `pr-branch`                 | No       | _(none)_                   | Destination branch for the pull request. Defaults to `target-branch` when not set                               |
| `prerelease`                | No       | `false`                    | Calculate a prerelease version                                                                                  |
| `prerelease-calculate-next` | No       | _(value of `prerelease`)_  | (`calculate-next` only) Calculate a prerelease version. Defaults to `prerelease` when not set                   |
| `dry-run`                   | No       | `false`                    | Run without making any changes                                                                                  |
| `debug`                     | No       | `false`                    | Enable detailed debug logging                                                                                   |
| `versioner`                 | No       | _(none)_                   | Versioning strategy to use                                                                                      |
| `version-prefix`            | No       | `v`                        | Prefix for version tags (e.g. `v` produces `v1.2.3`)                                                            |
| `issue-url-template`        | No       | _(none)_                   | URL template for ticket references. Use `{id}` as the placeholder (e.g. `https://jira.example.com/browse/{id}`) |
| `type`                      | No       | _(none)_                   | Override the manifest type for every package                                                                    |
| `use-file-system`           | No       | `true`                     | Use the local filesystem to scan and read files instead of provider APIs                                        |
| `include-chores`            | No       | `false`                    | Include `chore:` commits when determining release eligibility                                                   |
| `update-all-versions`       | No       | `false`                    | Bump every package in the manifest even when no changed files were found                                        |
| `write-local`               | No       | `false`                    | (`calculate-next` only) Write updated version files to the local filesystem instead of committing them          |

## Outputs

| Output                     | Description                                                                                                                                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `created`                  | `'true'` if the `release` command created a release, `'false'` otherwise                                                                                                                                                                                                                |
| `created-pr`               | `'true'` if the `release-pr` command created a pull request, `'false'` otherwise                                                                                                                                                                                                        |
| `current-version`          | The current version at the time of the last version-aware command                                                                                                                                                                                                                       |
| `next-version`             | The next version calculated by the last version-aware command                                                                                                                                                                                                                           |
| `manifest-current-version` | JSON array of current versions collected from each version-aware command, in execution order (e.g. `["v1.0.0"]`). Empty (`[]`) when no version info is returned. Each entry is also available as an individual output: `manifest-current-version-0`, `manifest-current-version-1`, etc. |
| `manifest-next-version`    | JSON array of next versions collected from each version-aware command, in execution order (e.g. `["v1.1.0"]`). Empty (`[]`) when no version info is returned. Each entry is also available as an individual output: `manifest-next-version-0`, `manifest-next-version-1`, etc.          |

Example — reading outputs in a subsequent step:

```yaml
steps:
  - uses: actions/checkout@v4
  - id: arp
    uses: ZeroWiggliness/another-release-please-action@v1
  - if: steps.arp.outputs.created == 'true'
    run: echo "Released ${{ steps.arp.outputs.current-version }}"
  - name: Show all collected versions
    run: |
      echo "Current versions: ${{ steps.arp.outputs.manifest-current-version }}"
      echo "Next versions:    ${{ steps.arp.outputs.manifest-next-version }}"
      echo "Current version 0: ${{ steps.arp.outputs.manifest-current-version-0 }}"
      echo "Next version 0:    ${{ steps.arp.outputs.manifest-next-version-0 }}"
```

## Initializing the Manifest

Before using this action for the first time you need to generate an
`.arp.config.json` manifest. The `init-manifest` command is not exposed through
this action — run it directly instead.

**Using Docker (no local install required):**

```bash
docker run --rm ghcr.io/zerowiggliness/another-release-please:latest \
  --provider github \
  --repository https://github.com/<owner>/<repository> \
  --token "$GITHUB_TOKEN" \
  init-manifest > .arp.config.json
```

**Using yarn (local dev):**

```bash
yarn another-release-please \
  --provider github \
  --repository https://github.com/<owner>/<repository> \
  --token "$GITHUB_TOKEN" \
  init-manifest > .arp.config.json
```

Commit the generated `.arp.config.json` to your repository before running the
action.

## Prerequisites

### Token permissions

The default `GITHUB_TOKEN` is used unless you provide a custom `token`. The
token must have:

- `contents: write` — to create tags and releases
- `pull-requests: write` — to create or update release pull requests

Example workflow-level permissions:

```yaml
permissions:
  contents: write
  pull-requests: write
```

### Node.js version

This action requires Node.js 24 or later.

## Contributing

Install dependencies:

```bash
yarn install
```

Run tests:

```bash
yarn test
```

Build the action (required after any changes to `src/`):

```bash
yarn bundle
```

> [!IMPORTANT]
>
> The `dist/` folder contains generated JavaScript and must be committed
> alongside any source changes. The
> [`check-dist.yml`](./.github/workflows/check-dist.yml) workflow will fail if
> `dist/` is out of sync with `src/`.
