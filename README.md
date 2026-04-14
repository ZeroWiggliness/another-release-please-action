# Another Release Please Action

![Linter](https://github.com/ZeroWiggliness/another-release-please-action/actions/workflows/linter.yml/badge.svg)
![CI](https://github.com/ZeroWiggliness/another-release-please-action/actions/workflows/ci.yml/badge.svg)
![Check dist/](https://github.com/ZeroWiggliness/another-release-please-action/actions/workflows/check-dist.yml/badge.svg)
![CodeQL](https://github.com/ZeroWiggliness/another-release-please-action/actions/workflows/codeql-analysis.yml/badge.svg)
![Coverage](./badges/coverage.svg)

This action wraps
[`@zerowiggliness/another-release-please`](https://github.com/ZeroWiggliness/another-release-please)
so you can create release pull requests, calculate the next version, and publish
releases from GitHub Actions.

## What It Does

The action supports three commands:

- `release-pr`: create or update the autorelease pull request
- `calculate-next`: calculate the next version and optionally write version
  updates locally
- `release`: publish a GitHub release after the autorelease pull request has
  been merged

The default `command` value is `release,release-pr`, which means:

1. publish the release if a release PR was already merged
2. open or refresh the next release PR

## Prerequisites

### Repository checkout

By default this action uses the local filesystem (`use-file-system: true`), so
your workflow should check out the repository before running the action.

```yaml
- uses: actions/checkout@v4
```

### Token permissions

The default `GITHUB_TOKEN` works for most repositories as long as the workflow
has:

```yaml
permissions:
  contents: write
  pull-requests: write
```

If you need downstream workflows to trigger from tags, releases, or pull request
updates created by this action, use a PAT instead of the default `GITHUB_TOKEN`.

Your repository settings must also allow GitHub Actions to create pull requests.

### First-run note

If the initial setup fails with a fast-forward or branch update error, the most
common cause is insufficient token permissions. In that case, fix the
permissions, delete the generated autorelease branch, and run the workflow
again.

## Quickstart

### 1. Add `.arp.config.json`

Commit a `.arp.config.json` file at the repository root. For a repository like
this one, a good starting point is:

```json
{
  "provider": "github",
  "release": {
    "targetBranch": "master",
    "prerelease": false,
    "includeChores": false
  },
  "version": "v0.0.1",
  "versionPrefix": "v",
  "manifests": [
    {
      "path": ".",
      "type": "node",
      "version": "0.0.1"
    }
  ]
}
```

This example is intentionally shaped like this repository:

- `targetBranch: "master"` matches the branch used in this repo's workflow
- `type: "node"` fits a repository whose versioned source of truth is a
  `package.json`
- top-level `version` keeps the tag form (`v0.0.1`), while the manifest version
  stays unprefixed (`0.0.1`)

Replace those versions with the current released version of your repository
before turning the workflow on if you already have different versions.

### 2. Add a workflow job

This job mirrors how this repository runs the action on pushes to `master`:

```yaml
name: Release

on:
  push:
    branches:
      - master

permissions:
  contents: write
  pull-requests: write

jobs:
  another-release-please:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run another-release-please
        id: arp
        uses: ZeroWiggliness/another-release-please-action@v1
        with:
          command: release,release-pr
          token: ${{ secrets.GITHUB_TOKEN }}
          target-branch: master

      - name: Log outputs
        run: echo '${{ toJSON(steps.arp.outputs) }}'
```

If you want to match this repository's own CI even more closely during local
iteration, the checked-in workflow uses
`ZeroWiggliness/another-release-please-action@master`. For consumers of the
action, use a tagged version such as `@v1`.

## Common Usage

### Default flow

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ZeroWiggliness/another-release-please-action@v1
```

### Create or refresh a release PR only

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

### Calculate the next version only

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ZeroWiggliness/another-release-please-action@v1
    with:
      command: calculate-next
```

### Calculate the next version and write version files locally

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ZeroWiggliness/another-release-please-action@v1
    with:
      command: calculate-next
```

## Inputs

| Input                       | Required | Default                                         | Description                                                                                                                     |
| --------------------------- | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `command`                   | No       | `release,release-pr`                            | Comma-separated list of commands to run in order: `release-pr`, `calculate-next`, `release`                                     |
| `provider`                  | No       | `github`                                        | Version control provider                                                                                                        |
| `token`                     | No       | `${{ github.token }}`                           | GitHub token used to access the repository                                                                                      |
| `repository`                | No       | `${{ github.repository }}`                      | Repository in `owner/repo` format                                                                                               |
| `target-branch`             | No       | `${{ github.event.repository.default_branch }}` | Branch to analyze and use as the release PR target                                                                              |
| `current-branch`            | No       | `${{ github.ref_name }}`                        | Branch the workflow is currently running on. Used with `release-branches` to gate execution                                     |
| `release-branches`          | No       | `${{ github.event.repository.default_branch }}` | Comma-separated glob patterns of branches on which releases are permitted. When unset or empty, the action runs on every branch |
| `pr-branch`                 | No       | _(defaults to `target-branch`)_                 | Pull request destination branch when it differs from the analyzed branch                                                        |
| `prerelease`                | No       | `false`                                         | Enable prerelease version calculation                                                                                           |
| `prerelease-calculate-next` | No       | _(inherits `prerelease`)_                       | `calculate-next` only: override prerelease calculation behavior                                                                 |
| `dry-run`                   | No       | `false`                                         | Run without making provider changes                                                                                             |
| `debug`                     | No       | `false`                                         | Enable detailed debug logging                                                                                                   |
| `versioner`                 | No       | _(none)_                                        | Override the versioning strategy                                                                                                |
| `version-prefix`            | No       | `v`                                             | Prefix used for tags, such as `v1.2.3`                                                                                          |
| `issue-url-template`        | No       | provider-specific default                       | URL template for issue references. Use `{id}` as the placeholder                                                                |
| `type`                      | No       | _(none)_                                        | Override the manifest type for every package                                                                                    |
| `use-file-system`           | No       | `true`                                          | Scan and read files from the local checkout instead of provider APIs                                                            |
| `include-chores`            | No       | `false`                                         | Include `chore:` commits in release eligibility and bump calculation                                                            |
| `update-all-versions`       | No       | `false`                                         | Update every manifest even when no changed files were detected under that manifest path                                         |
| `write-local`               | No       | `false`                                         | `calculate-next` only: write updated version files to the local filesystem instead of committing them                           |

## Outputs

| Output                     | Description                                                            |
| -------------------------- | ---------------------------------------------------------------------- |
| `created`                  | `'true'` if the `release` command created a release                    |
| `created-pr`               | `'true'` if the `release-pr` command created or updated a pull request |
| `current-version`          | Current version from the last version-aware command                    |
| `next-version`             | Next version from the last version-aware command                       |
| `manifest-current-version` | JSON array of current manifest versions collected in execution order   |
| `manifest-next-version`    | JSON array of next manifest versions collected in execution order      |

Each manifest array entry is also exposed as an indexed output, for example
`manifest-current-version-0` and `manifest-next-version-0`.

Example:

```yaml
steps:
  - uses: actions/checkout@v4
  - id: arp
    uses: ZeroWiggliness/another-release-please-action@v1
  - if: steps.arp.outputs.created == 'true'
    run: echo "Released ${{ steps.arp.outputs.current-version }}"
  - name: Show collected versions
    run: |
      echo "Current versions: ${{ steps.arp.outputs.manifest-current-version }}"
      echo "Next versions:    ${{ steps.arp.outputs.manifest-next-version }}"
      echo "Current version 0: ${{ steps.arp.outputs.manifest-current-version-0 }}"
      echo "Next version 0:    ${{ steps.arp.outputs.manifest-next-version-0 }}"
```

## Restricting Releases by Branch

By default the action runs on every branch. Set `release-branches` to a
comma-separated list of [minimatch](https://github.com/isaacs/minimatch) glob
patterns to limit execution to specific branches only.

```yaml
- uses: ZeroWiggliness/another-release-please-action@v1
  with:
    release-branches: master
```

The `current-branch` input identifies the branch the workflow is running on and
is compared against every pattern in `release-branches`. You do not normally
need to set `current-branch` — its default (`${{ github.ref_name }}`) is correct
for standard push-triggered workflows.

If no pattern matches, the action exits successfully (exit 0) without running
any commands. In that case `created` and `created-pr` are set to `'false'` and
no other outputs are produced.

| Pattern             | Matches                                     |
| ------------------- | ------------------------------------------- |
| `master`            | exactly `master`                            |
| `release/v*`        | `release/v1`, `release/v2`, …               |
| `**/release`        | `release`, `team/release`, `team/a/release` |
| `master,release/v*` | `master` and any `release/v…` branch        |

For a multi-branch workflow where only certain branches should produce releases:

```yaml
- uses: ZeroWiggliness/another-release-please-action@v1
  with:
    release-branches: master,release/v*
```

## Bootstrap A Config File

If you want the library to generate a starter `.arp.config.json` for you, use
the upstream CLI directly. The `init-manifest` command is not exposed through
this action.

### Docker

```bash
docker run --rm ghcr.io/zerowiggliness/another-release-please:latest \
  --provider github \
  --repository https://github.com/<owner>/<repository> \
  --token "$GITHUB_TOKEN" \
  init-manifest > .arp.config.json
```

### From A Clone Of `another-release-please`

```bash
node ./dist/bin/arp.js \
  --provider github \
  --repository https://github.com/<owner>/<repository> \
  --token "$GITHUB_TOKEN" \
  init-manifest > .arp.config.json
```

Commit the generated file before enabling the workflow.

## Contributing

Install dependencies:

```bash
yarn install
```

Run tests:

```bash
yarn test
```

Bundle the action after changing files in `src/`:

```bash
yarn bundle
```

> [!IMPORTANT]
>
> The `dist/` folder is generated output and must be committed alongside any
> source changes. The [`check-dist.yml`](./.github/workflows/check-dist.yml)
> workflow fails when `dist/` is out of sync with `src/`.
