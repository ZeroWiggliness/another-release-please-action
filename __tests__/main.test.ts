/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as arp from '../__fixtures__/another-release-please.js'
import * as commands from '../__fixtures__/commands.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@zerowiggliness/another-release-please', () => ({
  GitHubProvider: arp.GitHubProvider,
  loadConfig: arp.loadConfig
}))
jest.unstable_mockModule(
  '@zerowiggliness/another-release-please/dist/src/commands/release-pr.js',
  () => ({ releasePr: commands.releasePr })
)
jest.unstable_mockModule(
  '@zerowiggliness/another-release-please/dist/src/commands/calculate-next.js',
  () => ({ calculateNext: commands.calculateNext })
)
jest.unstable_mockModule(
  '@zerowiggliness/another-release-please/dist/src/commands/release.js',
  () => ({ release: commands.release })
)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

const mockConfig = {} as never

describe('main.ts', () => {
  beforeEach(() => {
    core.getInput.mockImplementation((name) => {
      switch (name) {
        case 'command':
          return 'release-pr'
        case 'token':
          return 'ghs_test'
        case 'repository':
          return 'owner/repo'
        default:
          return ''
      }
    })

    arp.loadConfig.mockResolvedValue(mockConfig)
    commands.releasePr.mockResolvedValue(undefined)
    commands.calculateNext.mockResolvedValue(undefined)
    commands.release.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('calls releasePr for a single release-pr command', async () => {
    await run()

    expect(commands.releasePr).toHaveBeenNthCalledWith(1, [], mockConfig)
  })

  it('calls calculateNext for the calculate-next command', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'calculate-next'
      if (name === 'repository') return 'owner/repo'
      return ''
    })

    await run()

    expect(commands.calculateNext).toHaveBeenNthCalledWith(1, [], mockConfig)
  })

  it('passes --write-local arg when write-local input is true', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'calculate-next'
      if (name === 'repository') return 'owner/repo'
      if (name === 'write-local') return 'true'
      return ''
    })

    await run()

    expect(commands.calculateNext).toHaveBeenNthCalledWith(
      1,
      ['--write-local'],
      mockConfig
    )
  })

  it('passes --prerelease to calculate-next when prerelease-calculate-next is true', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'calculate-next'
      if (name === 'repository') return 'owner/repo'
      if (name === 'prerelease-calculate-next') return 'true'
      return ''
    })

    await run()

    expect(commands.calculateNext).toHaveBeenNthCalledWith(
      1,
      ['--prerelease'],
      mockConfig
    )
  })

  it('passes --prerelease to calculate-next when prerelease is true and prerelease-calculate-next is not set', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'calculate-next'
      if (name === 'repository') return 'owner/repo'
      if (name === 'prerelease') return 'true'
      return ''
    })

    await run()

    expect(commands.calculateNext).toHaveBeenNthCalledWith(
      1,
      ['--prerelease'],
      mockConfig
    )
  })

  it('does not pass --prerelease to calculate-next when prerelease-calculate-next overrides prerelease to false', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'calculate-next'
      if (name === 'repository') return 'owner/repo'
      if (name === 'prerelease') return 'true'
      if (name === 'prerelease-calculate-next') return 'false'
      return ''
    })

    await run()

    expect(commands.calculateNext).toHaveBeenNthCalledWith(1, [], mockConfig)
  })

  it('passes both --write-local and --prerelease to calculate-next when both are true', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'calculate-next'
      if (name === 'repository') return 'owner/repo'
      if (name === 'write-local') return 'true'
      if (name === 'prerelease-calculate-next') return 'true'
      return ''
    })

    await run()

    expect(commands.calculateNext).toHaveBeenNthCalledWith(
      1,
      ['--write-local', '--prerelease'],
      mockConfig
    )
  })

  it('calls release for the release command', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release'
      if (name === 'repository') return 'owner/repo'
      return ''
    })

    await run()

    expect(commands.release).toHaveBeenNthCalledWith(1, [], mockConfig)
  })

  it('runs multiple commands in order for a comma-separated list', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr,release'
      if (name === 'repository') return 'owner/repo'
      return ''
    })

    await run()

    expect(commands.releasePr).toHaveBeenNthCalledWith(1, [], mockConfig)
    expect(commands.release).toHaveBeenNthCalledWith(1, [], mockConfig)
  })

  it('runs commands with whitespace-trimmed entries', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return ' release , release-pr '
      if (name === 'repository') return 'owner/repo'
      return ''
    })

    await run()

    expect(commands.release).toHaveBeenNthCalledWith(1, [], mockConfig)
    expect(commands.releasePr).toHaveBeenNthCalledWith(1, [], mockConfig)
  })

  it('sets a failed status for an unknown command in the list', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr,not-a-command'
      if (name === 'repository') return 'owner/repo'
      return ''
    })

    await run()

    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      'Unknown command(s): "not-a-command". Valid commands are: release-pr, calculate-next, release'
    )
    expect(commands.releasePr).not.toHaveBeenCalled()
  })

  it('stops executing and sets failed when a command throws', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr,release'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.releasePr.mockRejectedValueOnce(new Error('provider error'))

    await run()

    expect(core.setFailed).toHaveBeenNthCalledWith(1, 'provider error')
    expect(commands.release).not.toHaveBeenCalled()
  })

  it('constructs GitHubProvider with the repository URL and token', async () => {
    await run()

    expect(arp.GitHubProvider).toHaveBeenNthCalledWith(
      1,
      'https://github.com/owner/repo',
      'ghs_test'
    )
  })

  it('forwards provider input as provider in cliArgs', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr'
      if (name === 'repository') return 'owner/repo'
      if (name === 'provider') return 'gitlab'
      return ''
    })

    await run()

    expect(arp.loadConfig).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ provider: 'gitlab' }),
      expect.anything()
    )
  })

  it('forwards pr-branch input as prBranch in cliArgs', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr'
      if (name === 'repository') return 'owner/repo'
      if (name === 'pr-branch') return 'develop'
      return ''
    })

    await run()

    expect(arp.loadConfig).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ prBranch: 'develop' }),
      expect.anything()
    )
  })

  it('forwards include-chores: true as includeChores in cliArgs', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr'
      if (name === 'repository') return 'owner/repo'
      if (name === 'include-chores') return 'true'
      return ''
    })

    await run()

    expect(arp.loadConfig).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ includeChores: true }),
      expect.anything()
    )
  })

  it('forwards update-all-versions: true as updateAllVersions in cliArgs', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr'
      if (name === 'repository') return 'owner/repo'
      if (name === 'update-all-versions') return 'true'
      return ''
    })

    await run()

    expect(arp.loadConfig).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ updateAllVersions: true }),
      expect.anything()
    )
  })

  it('sets created output to true when release command creates a release', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.release.mockResolvedValueOnce({ tagName: 'v1.2.3', created: true })

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('created', 'true')
  })

  it('sets created output to false when release command does not create a release', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.release.mockResolvedValueOnce({ tagName: '', created: false })

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('created', 'false')
  })

  it('sets created-pr output to true when release-pr command creates a PR', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.releasePr.mockResolvedValueOnce({
      created: true,
      nextVersion: 'v1.2.3',
      sourceBranch: 'release/arp--main--main',
      targetBranch: 'main'
    })

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('created-pr', 'true')
  })

  it('sets created-pr output to false when release-pr command does not create a PR', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.releasePr.mockResolvedValueOnce({
      created: false,
      nextVersion: '',
      sourceBranch: 'release/arp--main--main',
      targetBranch: 'main'
    })

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('created-pr', 'false')
  })

  it('sets current-version and next-version outputs from release command', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.release.mockResolvedValueOnce({
      tagName: 'v1.2.3',
      created: true,
      currentVersion: 'v1.2.3',
      nextVersion: 'v1.3.0'
    })

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('current-version', 'v1.2.3')
    expect(core.setOutput).toHaveBeenCalledWith('next-version', '')
  })

  it('sets current-version and next-version outputs from calculate-next command', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'calculate-next'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.calculateNext.mockResolvedValueOnce({
      targetBranch: 'main',
      currentVersion: 'v1.2.2',
      nextVersion: 'v1.2.3'
    })

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('current-version', 'v1.2.2')
    expect(core.setOutput).toHaveBeenCalledWith('next-version', 'v1.2.3')
  })

  it('sets indexed manifest outputs from release-pr command', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.releasePr.mockResolvedValueOnce({
      created: true,
      manifestCurrentVersions: ['v1.0.0', 'v2.0.0'],
      manifestNextVersions: ['v1.1.0', 'v2.1.0']
    })

    await run()

    // Aggregate output is no longer set; only indexed outputs are emitted
    // Aggregate output is no longer set; only indexed outputs are emitted
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-current-version-0',
      'v1.0.0'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-current-version-1',
      'v2.0.0'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-next-version-0',
      'v1.1.0'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-next-version-1',
      'v2.1.0'
    )
  })

  it('sets indexed manifest outputs from calculate-next command', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'calculate-next'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.calculateNext.mockResolvedValueOnce({
      targetBranch: 'main',
      currentVersion: 'v1.2.2',
      nextVersion: 'v1.2.3',
      manifestCurrentVersions: ['v1.2.2', 'v3.4.5'],
      manifestNextVersions: ['v1.2.3', 'v3.4.6']
    })

    await run()

    // Aggregate output is no longer set; only indexed outputs are emitted
    // Aggregate output is no longer set; only indexed outputs are emitted
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-current-version-0',
      'v1.2.2'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-current-version-1',
      'v3.4.5'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-next-version-0',
      'v1.2.3'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-next-version-1',
      'v3.4.6'
    )
  })

  it('sets indexed manifest-current-version outputs from release command', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.release.mockResolvedValueOnce({
      tagName: 'v1.2.3',
      created: true,
      currentVersion: 'v1.2.3',
      manifestVersions: ['v1.2.3', 'v9.9.9']
    })

    await run()

    // Aggregate output is no longer set; only indexed outputs are emitted
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-current-version-0',
      'v1.2.3'
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'manifest-current-version-1',
      'v9.9.9'
    )
  })

  it('later command version outputs overwrite earlier ones', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'command') return 'release-pr,release'
      if (name === 'repository') return 'owner/repo'
      return ''
    })
    commands.releasePr.mockResolvedValueOnce({
      created: true,
      currentVersion: 'v1.0.0',
      nextVersion: 'v1.1.0',
      sourceBranch: 'release/arp--main--main',
      targetBranch: 'main'
    })
    commands.release.mockResolvedValueOnce({
      tagName: 'v1.1.0',
      created: true,
      currentVersion: 'v1.1.0',
      nextVersion: 'v1.2.0'
    })

    await run()

    expect(core.setOutput).toHaveBeenCalledWith('current-version', 'v1.1.0')
    expect(core.setOutput).toHaveBeenCalledWith('next-version', 'v1.1.0')
  })

  it('sets default outputs when commands return no version info', async () => {
    await run()

    expect(core.setOutput).toHaveBeenCalledWith('created', 'false')
    expect(core.setOutput).toHaveBeenCalledWith('created-pr', 'false')
    expect(core.setOutput).toHaveBeenCalledWith('current-version', '')
    expect(core.setOutput).toHaveBeenCalledWith('next-version', '')
  })

  describe('release-branches', () => {
    it('runs commands when current-branch exactly matches release-branches', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'command') return 'release-pr'
        if (name === 'repository') return 'owner/repo'
        if (name === 'release-branches') return 'master'
        if (name === 'current-branch') return 'master'
        return ''
      })

      await run()

      expect(commands.releasePr).toHaveBeenCalledTimes(1)
    })

    it('sets only created and created-pr to false and runs no commands when branch does not match', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'command') return 'release-pr'
        if (name === 'repository') return 'owner/repo'
        if (name === 'release-branches') return 'master'
        if (name === 'current-branch') return 'feature/my-feature'
        return ''
      })

      await run()

      expect(commands.releasePr).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenCalledWith('created', 'false')
      expect(core.setOutput).toHaveBeenCalledWith('created-pr', 'false')
      expect(core.setOutput).not.toHaveBeenCalledWith(
        'current-version',
        expect.anything()
      )
      expect(core.setOutput).not.toHaveBeenCalledWith(
        'next-version',
        expect.anything()
      )
    })

    it('runs commands when current-branch matches a wildcard glob pattern', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'command') return 'release-pr'
        if (name === 'repository') return 'owner/repo'
        if (name === 'release-branches') return 'release/v*'
        if (name === 'current-branch') return 'release/v1.0'
        return ''
      })

      await run()

      expect(commands.releasePr).toHaveBeenCalledTimes(1)
    })

    it('does not run commands when current-branch does not match the wildcard glob pattern', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'command') return 'release-pr'
        if (name === 'repository') return 'owner/repo'
        if (name === 'release-branches') return 'release/v*'
        if (name === 'current-branch') return 'feature/new-thing'
        return ''
      })

      await run()

      expect(commands.releasePr).not.toHaveBeenCalled()
    })

    it('runs commands when current-branch matches a ** glob pattern', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'command') return 'release-pr'
        if (name === 'repository') return 'owner/repo'
        if (name === 'release-branches') return '**/release'
        if (name === 'current-branch') return 'team/feature/release'
        return ''
      })

      await run()

      expect(commands.releasePr).toHaveBeenCalledTimes(1)
    })

    it('runs commands when current-branch matches any pattern in a comma-separated list', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'command') return 'release-pr'
        if (name === 'repository') return 'owner/repo'
        if (name === 'release-branches') return 'master,release/v*'
        if (name === 'current-branch') return 'release/v2.0'
        return ''
      })

      await run()

      expect(commands.releasePr).toHaveBeenCalledTimes(1)
    })

    it('does not run commands when current-branch matches none of a comma-separated list', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'command') return 'release-pr'
        if (name === 'repository') return 'owner/repo'
        if (name === 'release-branches') return 'master,release/v*'
        if (name === 'current-branch') return 'develop'
        return ''
      })

      await run()

      expect(commands.releasePr).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenCalledWith('created', 'false')
      expect(core.setOutput).toHaveBeenCalledWith('created-pr', 'false')
    })

    it('runs commands when release-branches is empty', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'command') return 'release-pr'
        if (name === 'repository') return 'owner/repo'
        if (name === 'release-branches') return ''
        if (name === 'current-branch') return 'any-branch'
        return ''
      })

      await run()

      expect(commands.releasePr).toHaveBeenCalledTimes(1)
    })

    it('trims whitespace from release-branches patterns', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'command') return 'release-pr'
        if (name === 'repository') return 'owner/repo'
        if (name === 'release-branches') return ' master , release/v* '
        if (name === 'current-branch') return 'master'
        return ''
      })

      await run()

      expect(commands.releasePr).toHaveBeenCalledTimes(1)
    })
  })
})
