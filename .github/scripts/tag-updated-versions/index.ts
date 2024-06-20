import * as fs from 'fs/promises'
import { join, dirname } from 'path'
import { cwd, env } from 'process'
import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import * as semver from 'semver'
import conventionalCommitsParser, { Commit } from 'conventional-commits-parser'
import * as core from '@actions/core'
import * as github from '@actions/github'

const exec = promisify(execCallback)

const headSha = env.GITHUB_SHA ?? 'HEAD'

async function createRelease (moduleName: string, version: string, commits: Commit[]): Promise<null> {
  const tagName = `${moduleName}/${version}`
  const body = commits
    .map((c) => c.header)
    .filter((h) => h != null)
    .map((h) => `* ${h ?? ''}`)
    .join('\n')
  core.info(`Creating release ${tagName}:`)
  core.info(body)
  try {
    const gh = github.getOctokit(env.GITHUB_TOKEN ?? '')
    const [owner, repo] = env.GITHUB_REPOSITORY?.split('/', 2) ?? ['', '']
    await gh.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      name: tagName,
      body,
      draft: false,
      prerelease: false,
      make_latest: 'false',
      target_commitish: headSha
    })
  } catch (error: any) {
    const message: string = error.message ?? 'Unknown error'
    core.setFailed(`Failed to create release for ${tagName}: ${message}`)
  }
  return null
}
function bumpType (commit: Commit): 'major' | 'minor' | 'patch' | null {
  const commitType = commit.type ?? ''
  if (commitType.endsWith('!')) {
    return 'major'
  }
  if (commit.notes.filter((n) => ['BREAKING CHANGE'].includes(n.title)).length > 0) {
    return 'major'
  }
  if (['feat', 'feature'].includes(commitType)) {
    return 'minor'
  }
  if (['fix'].includes(commitType)) {
    return 'patch'
  }
  return null
}

async function gitTags (root: string, moduleName: string): Promise<string[]> {
  const ls = await exec(`git tag -l "${moduleName}/*"`,
    { cwd: root })
  if (ls.stdout === '') {
    return []
  }
  return ls.stdout.trimEnd().split('\n').map((t) => t.slice(moduleName.length + 1))
}

async function commitsSince (root: string, moduleName: string, version: string): Promise<Commit[]> {
  const ls = await exec(`git log -z --no-decorate --pretty=medium ${moduleName}/${version}...${headSha} -- ${moduleName}`,
    { cwd: root })
  if (ls.stdout === '') {
    return []
  }

  return ls.stdout.split('\0').map((c) =>
    conventionalCommitsParser.sync(c.split('\n\n', 2)[1].trim())
  )
}

async function moduleNames (directory: string): Promise<string[]> {
  const directories = []
  for (const file of await fs.readdir(directory)) {
    const fullPath = join(directory, file)
    if (file.startsWith('.')) {
      continue
    }
    const stat = await fs.lstat(fullPath)
    if (stat.isDirectory()) {
      directories.push(file)
    }
  }
  return directories
}

async function rootDirectory (): Promise<string> {
  let directory = cwd()
  while (true) {
    try {
      await fs.lstat(join(directory, '.git'))
      return directory
    } catch (_) {
      directory = await dirname(directory)
    }
  }
}

const root = await rootDirectory()
core.info(`Git root: ${root}`)
for (const moduleName of await moduleNames(root)) {
  core.startGroup(`Looking at ${moduleName}`)

  const tags = await gitTags(root, moduleName)
  if (tags.length === 0) {
    core.info('No tagged version, skipping.')
    continue
  }
  const latest = semver.rsort(tags)[0]
  core.info(`Latest version: ${latest}`)

  const commits = await commitsSince(root, moduleName, latest)
  const bumpTypes = commits.map(bumpType)
  core.debug(JSON.stringify(commits))
  core.debug(JSON.stringify(commits.map(bumpType)))

  let incType: semver.ReleaseType | null = null
  if (bumpTypes.includes('major')) {
    incType = 'major'
  } else if (bumpTypes.includes('minor')) {
    incType = 'minor'
  } else if (bumpTypes.includes('patch')) {
    incType = 'patch'
  }
  let newVersion = null
  if (incType != null) {
    newVersion = semver.inc(latest, incType)
  }
  if (newVersion != null) {
    core.info(`New version for ${moduleName}: ${newVersion}`)
    await createRelease(moduleName, newVersion, commits)
  } else {
    core.info(`Not incrementing version for ${moduleName}`)
  }
  core.endGroup()
}
