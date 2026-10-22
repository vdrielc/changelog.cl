# File Formats

This document pins down the on-disk syntax for the repository files described in
[repository.md](repository.md). All files are UTF-8 plain text and human readable.

## Record syntax (`.cldef` and `.cllst`)

`.cldef` and `.cllst` files share one simple syntax:

```
# Lines starting with '#' are comments.
Key: value
OtherKey: a value that is long can continue
  on the next line by indenting it.
```

Rules:

- A **field** is `Key: value`. Everything after the first `:` (trimmed) is the value.
- A line that **starts with whitespace** continues the previous field's value.
- A **blank line** ends a record. A `.cldef` holds one record; a `.cllst` holds one record per application.
- Keys are matched **case-insensitively** (`clFileURL`, `ClFileUrl` and `CLFILEURL` are the same key).
- Unknown keys are kept and ignored, so new fields can be added without breaking older clients.
- **URLs may be relative.** They are resolved against the URL of the file that contains them,
  so a whole repository can be moved to a new host (or served from disk via `file://`) unchanged.

## `[repo_name].cldef`

One record. Field meanings are listed in [repository.md](repository.md#repo_namecldef).

```
RepositoryName: public.changelog.cl
RepositoryDescription: Public changelogs tracked by the changelog.cl project.
LicenseInformation: CC-BY-4.0
ContactEmailAddress: repo@changelog.cl
RepositoryOwner: changelog.cl
cllstFileList: libraries.cllst
  opensource.cllst
  https://other.example.com/shared/rnd.cllst
```

`cllstFileList` is a whitespace-separated list of URLs (absolute or relative).

## `[repo_list_name].cllst`

One record per application, separated by blank lines.

```
ApplicationID: cl.changelog
ApplicationName: Changelog.cl
ApplicationURL: https://changelog.cl/
clFileURL: cl.changelog.cl
LastChangedDate: 2026-10-22
LatestVersion: 0.1.0
Hash: 3f786850e387550fdab836ed7e6dc881de23001b
```

| Field           | Required | Notes                                                                  |
|-----------------|----------|------------------------------------------------------------------------|
| ApplicationID   | Yes      | Unique within the repository. Must match the `.cl` file name.          |
| ApplicationName | Public   | Friendly name.                                                         |
| ApplicationURL  | No       | Home page of the application (shown by `cl list applications`).        |
| clFileURL       | Yes      | Absolute or relative URL of the `.cl` file.                            |
| LastChangedDate | Public   | `YYYY-MM-DD`.                                                          |
| LatestVersion   | Public   | Latest released version in the `.cl` file.                             |
| Hash            | Yes      | Lower-case hex SHA1 of the `.cl` file's exact bytes.                   |

`ApplicationURL` is an addition to the original design: the CLI design shows a URL
column for applications that none of the original fields supplied.

## `[application_id].cl`

A Markdown changelog in the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.
The CLI recognises:

- `## [Unreleased]` — unreleased changes
- `## [1.2.0] - 2026-10-22` — a release (the brackets and date are optional)
- `## [1.1.0] - 2026-09-01 [YANKED]` — a yanked release
- link reference definitions at the end of the file (`[1.2.0]: https://...`),
  which are shown together with the version they belong to

Versions are expected newest-first, as Keep a Changelog prescribes; "latest" means the
first released, non-yanked version in the file.
