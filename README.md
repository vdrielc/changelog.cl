# changelog.cl

[![CI](https://github.com/vdrielc/changelog.cl/actions/workflows/ci.yml/badge.svg)](https://github.com/vdrielc/changelog.cl/actions/workflows/ci.yml)

This project aims to provide a standardized method of tracking functional changes to applications (no diffs or commit logs), offering a single, fast and easy to use CLI interface to fetch the latest changelogs.

[Short History](HISTORY.md)

## Install

Requires [Node.js](https://nodejs.org/) 20 or newer. No other dependencies.

```sh
npm install --global changelog.cl
cl --version
```

The command is `cl`. It is also installed as `changelog-cl`, for shells where `cl` is
already taken (for example the MSVC compiler in a Visual Studio Developer Command Prompt).

## Quick start

Try it against the example repository in this project:

```sh
git clone https://github.com/vdrielc/changelog.cl && cd changelog.cl
npm run serve-example                      # serves examples/public-repo on :8787

# in another terminal
cl repo add public.changelog.cl http://localhost:8787/
cl repo fetch public.changelog.cl
cl list applications
cl list versions com.example.widgets
cl show com.example.widgets                # latest released version
cl show com.example.widgets --unreleased
cl show org.example.weather-api -s 2.9.0
```

A repository can also be read straight from disk with a `file://` URL.

## Commands

| Command                                   | What it does                                                        |
|-------------------------------------------|---------------------------------------------------------------------|
| `cl list applications [-r REPO] [--search TEXT]` | Applications in all fetched repositories                     |
| `cl list versions APP_ID [-r REPO]`       | Versions in an application's changelog, with Released/Yanked status |
| `cl list repos`                           | Registered repositories, last fetch, and whether a fetch is due     |
| `cl show APP_ID`                          | Latest released, non-yanked version (Markdown)                      |
| `cl show APP_ID -ur \| -y \| -f \| -s VERSION` | Unreleased, yanked, full changelog, or a specific version     |
| `cl repo add NAME URL [--fetch]`          | Register a repository                                               |
| `cl repo update NAME [-u URL] [-n NAME]`  | Change a repository's URL or name                                   |
| `cl repo remove NAME`                     | Unregister a repository and delete its local copy                   |
| `cl repo fetch NAME` / `cl repo fetch -a` | Download what changed from one or all repositories                  |
| `cl help [COMMAND]`                       | Help for a command                                                  |

Commands are case-insensitive, so `cl List Applications` from the design documents works too.
List commands accept `--json`, and `cl show -q` drops the header line, for use in toolchains.

Exit codes: `0` success, `1` error, `2` usage error, `3` a fetch failed.

Fetched data is kept locally for offline use, in `%APPDATA%\changelog.cl` on Windows,
`~/Library/Application Support/changelog.cl` on macOS and `~/.local/share/changelog.cl`
elsewhere. Set `CL_HOME` to use another folder.

## Hosting a repository

A repository is a set of plain text files served over HTTP GET; any static web host works.
See [design/repository.md](design/repository.md) for the design and
[design/file-formats.md](design/file-formats.md) for the exact file syntax.
[examples/public-repo](examples/public-repo) is a complete working example.

## Design Documents

| Documents             |                                                  |
|-----------------------|--------------------------------------------------|
| CLI Commands Document | [Link](design/command-line.md)                   |
| CLI Commands Visual   | [Link](design/command-design.pdf)                |
| Repository Document   | [Link](design/repository.md)                     |
| File Formats          | [Link](design/file-formats.md)                   |

## Goals and progress

- [x] CLI to fetch and read changelogs from self-hosted, optionally private repositories
- [x] Offline use from a local copy; only changed files are downloaded
- [x] Composable repositories (one `.cldef` can include `.cllst` files from anywhere)
- [x] State for changes: Unreleased, Released, Yanked (pulled/rolled back)
- [x] Cross platform, and pipe-friendly output (`--json`, `-q`)
- [ ] Tooling for repository owners to generate and validate `.cllst` files
- [ ] Public changelog repository at changelog.cl
- [ ] API for integrating changelogs into systems
- [ ] Notifications and UI components for informing users of changes
- [ ] Plugin system for sorting versions by industry-specific schemes

## Development

```sh
npm test                 # node's built-in test runner, no install needed
npm run build-example    # refresh hashes in examples/public-repo after editing it
```

Releases are published by pushing a `vX.Y.Z` tag (see `.github/workflows/release.yml`).

## Attribution
[keep-a-changelog](https://github.com/olivierlacan/keep-a-changelog)
- The file format for this project is based on the work of [keepachangelog.com](https://keepachangelog.com/)
- The license can be found here: [MIT License](attributions/keepachangelog.com)
