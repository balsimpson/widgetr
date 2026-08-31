#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const EXPECTED_REPOSITORY = Object.freeze({
  root: '/Users/balsimpson/Documents/Projects/Widgetr',
  origin: 'https://github.com/balsimpson/widgetr.git',
  packageName: 'widgetr',
})

function readGitValue(args) {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  }
  catch (error) {
    const stderr = error?.stderr?.toString().trim()
    const detail = stderr ? `\nGit reported: ${stderr}` : ''

    throw new Error(
      `Unable to identify a Git repository from ${process.cwd()}.${detail}`,
    )
  }
}

function readPackageName(repositoryRoot) {
  const packagePath = join(repositoryRoot, 'package.json')

  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
    return packageJson.name
  }
  catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : ''
    throw new Error(`Unable to read ${packagePath}.${detail}`)
  }
}

function formatMismatch(label, expected, actual) {
  return `- ${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
}

function main() {
  let repositoryRoot
  let origin
  let packageName

  try {
    repositoryRoot = readGitValue(['rev-parse', '--show-toplevel'])
    origin = readGitValue(['remote', 'get-url', 'origin'])
    packageName = readPackageName(repositoryRoot)
  }
  catch (error) {
    console.error('Widgetr repository check failed.')
    console.error(error instanceof Error ? error.message : error)
    console.error(`Expected repository: ${EXPECTED_REPOSITORY.root}`)
    process.exitCode = 1
    return
  }

  const mismatches = [
    repositoryRoot === EXPECTED_REPOSITORY.root
      ? null
      : formatMismatch('Git root', EXPECTED_REPOSITORY.root, repositoryRoot),
    origin === EXPECTED_REPOSITORY.origin
      ? null
      : formatMismatch('origin', EXPECTED_REPOSITORY.origin, origin),
    packageName === EXPECTED_REPOSITORY.packageName
      ? null
      : formatMismatch('package name', EXPECTED_REPOSITORY.packageName, packageName),
  ].filter(Boolean)

  if (mismatches.length > 0) {
    console.error('Widgetr repository check failed:')
    console.error(mismatches.join('\n'))
    console.error('Stop. Do not edit, stage, commit, push, deploy, or create submission state from this checkout.')
    process.exitCode = 1
    return
  }

  console.log(`Widgetr repository verified: ${repositoryRoot}`)
  console.log(`origin: ${origin}`)
  console.log(`package: ${packageName}`)
}

main()
