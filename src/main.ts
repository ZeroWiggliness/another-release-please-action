import * as core from '@actions/core'
import {
  GitHubProvider,
  loadConfig
} from '@zerowiggliness/another-release-please'
import { releasePr } from '@zerowiggliness/another-release-please/dist/src/commands/release-pr.js'
import { calculateNext } from '@zerowiggliness/another-release-please/dist/src/commands/calculate-next.js'
import { release } from '@zerowiggliness/another-release-please/dist/src/commands/release.js'
import type { CliArgs } from '@zerowiggliness/another-release-please'

const VALID_COMMANDS = ['release-pr', 'calculate-next', 'release'] as const
type Command = (typeof VALID_COMMANDS)[number]

function outputManifestVersions(prefix: string, versions: unknown[]): void {
  versions.forEach((version, index) => {
    const value =
      typeof version === 'string' ? version : JSON.stringify(version)
    core.setOutput(`${prefix}-${index}`, value)
  })
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const rawCommand = core.getInput('command') || 'release,release-pr'
    const commands = rawCommand.split(',').map((c) => c.trim())

    const invalidCommands = commands.filter(
      (c) => !VALID_COMMANDS.includes(c as Command)
    )
    if (invalidCommands.length > 0) {
      throw new Error(
        `Unknown command(s): ${invalidCommands.map((c) => `"${c}"`).join(', ')}. Valid commands are: ${VALID_COMMANDS.join(', ')}`
      )
    }

    const token = core.getInput('token')
    const repository = core.getInput('repository')
    const provider = core.getInput('provider') || 'github'

    const cliArgs: CliArgs = {
      provider,
      token,
      repository,
      targetBranch: core.getInput('target-branch') || undefined,
      prBranch: core.getInput('pr-branch') || undefined,
      prerelease: core.getInput('prerelease') === 'true',
      dryRun: core.getInput('dry-run') === 'true',
      debug: core.getInput('debug') === 'true',
      versioner: core.getInput('versioner') || undefined,
      versionPrefix: core.getInput('version-prefix') || undefined,
      issueUrlTemplate: core.getInput('issue-url-template') || undefined,
      type: core.getInput('type') || undefined,
      useFileSystem: core.getInput('use-file-system') !== 'false',
      includeChores: core.getInput('include-chores') === 'true',
      updateAllVersions: core.getInput('update-all-versions') === 'true'
    }

    const repositoryUrl = `https://github.com/${repository}`
    const gitHubProvider = new GitHubProvider(repositoryUrl, token)
    const config = await loadConfig(cliArgs, gitHubProvider)

    const writeLocal = core.getInput('write-local') === 'true'
    const prereleaseCalculateNextRaw = core.getInput(
      'prerelease-calculate-next'
    )
    const prereleaseCalculateNext =
      prereleaseCalculateNextRaw !== ''
        ? prereleaseCalculateNextRaw === 'true'
        : core.getInput('prerelease') === 'true'

    let outputCreated = false
    let outputCreatedPr = false
    let outputCurrentVersion = ''
    let outputNextVersion = ''

    for (const command of commands) {
      switch (command as Command) {
        case 'release-pr': {
          const result = await releasePr([], config)
          if (result?.updated || result?.created) outputCreatedPr = true
          if (result?.currentVersion)
            outputCurrentVersion = result.currentVersion
          if (result?.nextVersion) outputNextVersion = result.nextVersion
          if (result?.manifestCurrentVersions)
            outputManifestVersions(
              'manifest-current-version',
              result.manifestCurrentVersions
            )
          if (result?.manifestNextVersions)
            outputManifestVersions(
              'manifest-next-version',
              result.manifestNextVersions
            )
          break
        }
        case 'calculate-next': {
          const calculateNextArgs: string[] = []
          if (writeLocal) calculateNextArgs.push('--write-local')
          if (prereleaseCalculateNext) calculateNextArgs.push('--prerelease')
          const result = await calculateNext(calculateNextArgs, config)
          if (result?.currentVersion)
            outputCurrentVersion = result.currentVersion
          if (result?.nextVersion) outputNextVersion = result.nextVersion
          if (result?.manifestCurrentVersions)
            outputManifestVersions(
              'manifest-current-version',
              result.manifestCurrentVersions
            )
          if (result?.manifestNextVersions)
            outputManifestVersions(
              'manifest-next-version',
              result.manifestNextVersions
            )
          break
        }
        case 'release': {
          const result = await release([], config)
          if (result?.created) outputCreated = true
          if (result?.currentVersion)
            outputCurrentVersion = result.currentVersion
          if (result?.manifestVersions)
            outputManifestVersions(
              'manifest-current-version',
              result.manifestVersions
            )
          break
        }
      }
    }

    core.setOutput('created', String(outputCreated))
    core.setOutput('created-pr', String(outputCreatedPr))
    core.setOutput('current-version', outputCurrentVersion)
    core.setOutput('next-version', outputNextVersion)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
