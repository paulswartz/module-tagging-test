# Ian's module-tagging-test notes

I set out to test how this workflow would work with the [squash merging strategy](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges#squash-and-merge-your-commits). 

## Test #1

PR: https://github.com/paulswartz/module-tagging-test/pull/5

- Two commits (one prefixed `feat:`, the other prefixed `chore:`)
- PR title without semver prefix

Result: 

- Squash commit based on PR title doesn't include semver prefix https://github.com/paulswartz/module-tagging-test/commit/d744b15e1d9249416422a06c4eae2f9331249111
- No release created during GitHub Actions run https://github.com/paulswartz/module-tagging-test/actions/runs/10255634576/job/28372972671

Notes:

When the squash merging strategy is used, the PR title must contain the relevant prefix for the desired version, or else the script will not cut a release.

## Test #2

PR: https://github.com/paulswartz/module-tagging-test/pull/6

- One commit (prefixed `fix:`)
- PR title matching single commit

Result:

- Squash commit includes semver prefix https://github.com/paulswartz/module-tagging-test/commit/e8c569e7401c9701b62dcb37f4d7930f6117990f
- GitHub Actions run created new release https://github.com/paulswartz/module-tagging-test/actions/runs/10255651992/job/28373024418

Notes:

In retrospect, I probably should have made the commit message and the PR title differ slightly so I could tell which one was used in the final commit.

## Test #3

PR: https://github.com/paulswartz/module-tagging-test/pull/7

- One commit with no semver prefix
- PR title with `feat:` semver prefix

Result:

- Squash commit based on single commit message https://github.com/paulswartz/module-tagging-test/commit/fa30650c42d4aa6da641cb88d6a4dc7de4f0fb03
- No release created during GitHub Actions run https://github.com/paulswartz/module-tagging-test/actions/runs/10255680791

Notes:

This one really confused me. I was expecting GitHub to use the PR title as the squashed commit message, but it seems to have used the commit message for the single commit instead. I'm assuming this was because there was only a single commit in the PR, so there was nothing to squash, hence the single commit went directly into the default branch.

## Test #4

PR: https://github.com/paulswartz/module-tagging-test/pull/8

- Created by clicking the "Revert" button in the previous PR
- Two commits (one "Revert" commit with no prefix, the other prefixed `feat:`)
- PR title prefixed `fix:`

Result:

- Squash commit includes PR title https://github.com/paulswartz/module-tagging-test/commit/eb4d1b3feede1e5dc0dadf1e1f4f13c35c2db425
- GitHub Actions run created new _patch_ release https://github.com/paulswartz/module-tagging-test/actions/runs/10255728319

Notes:

This PR yielded a _patch_ release even though one of the commits included the `feat:` prefix, which should have resulted in a _minor_ release. This happened because I used the "squash and merge" strategy and the GitHub Actions run only saw the single squashed commit, which used the PR title that contained the `fix:` prefix.
