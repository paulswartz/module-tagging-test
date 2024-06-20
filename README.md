# module-tagging-test
Test repo to experiment with automatic tagging workflows

## How it works

A [GitHub Action](.github/workflows/tag-updated-version.yml) runs on pushes to the `main` branch. This runs (a compiled version of) the [tag-updated-versions](.github/scripts/tag-updated-versions/index.ts) script.

This script looks at all the top-level modules, and for each one:
- finds the latest tag (by semantic versioning)
- looks at the commits between the last tag and the current SHA which modified the module
- parses the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary)
  - if there are breaking changes (! suffix or BREAKING CHANGES note), then it's a major version update
  - if there are `feat` or `feature` commits, then it's a minor version update
  - if there are `fix` commits, then it's a patch version update
- if an update is needed, the version is bumped appropriately, and a new release is created

## Development

``` sh
$ cd .github/scripts/tag-updated-versions
$ npm ci
$ npm run dev  # run locally
$ npm run build  # needed before committing

```
