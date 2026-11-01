## Thinking Path

> - Paperclip manages AI agents and their work.
> - This fork adds a Simplified Chinese interface for a local operator.
> - The official master branch continues to receive changes.
> - The fork keeps those changes on a separate mirror branch.
> - This pull request proposes a merge into the custom main branch.
> - Review and tests protect the custom work before any deployment.

## Linked Issues or Issue Description

**Problem**

The custom branch needs new upstream fixes and features.

**Proposed solution**

Merge the upstream mirror after checking conflicts and the custom UI tests.

**Alternatives considered**

A force reset would discard custom work. This job never uses a force reset.

## What Changed

- Includes the official changes shown in this pull request.
- Keeps local instance data outside Git.

## Verification

- The sync job starts `Fork - verify custom build` explicitly for this pull request.
- That run checks the prospective merge and its Chinese copy, types, UI tests, and UI build.
- Read its result before merging. A draft pull request is not proof of a passing run.
- Server release checks and a database restore trial remain required before deployment.

## Risks

- Upstream may conflict with translations or add untranslated text.
- Upstream may change server APIs, database migrations, or agent behavior.
- This job does not merge, deploy, or approve work on behalf of the operator.

## Model Used

OpenAI Codex (GPT-6 family) helped author this automation. The exact deployed model ID and context size were not exposed. The scheduled sync itself uses no language model.

## Checklist

- [x] The thinking path and scope are described.
- [x] The model information is stated without an invented identifier.
- [x] This is a private-maintenance change in the owner's fork, not a feature submission to the official repository.
- [x] The issue is described above, with no instance-local task links or data.
- [x] Verification and deployment limits are documented.
- [ ] Review the upstream changes and any merge conflicts.
- [ ] Confirm the custom verification run passes.
- [ ] Complete server and migration checks before deployment.
