# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-22
### Added
- `cl` command line tool for Node.js 20+, with no runtime dependencies.
- `cl repo add | update | remove | fetch` to manage repositories. Fetching downloads
  only new or changed `.cl` files (by SHA1) and keeps the previous offline copy if it fails.
- `cl list applications | versions | repos`, with `--json` output for toolchains.
- `cl show` with `--latest`, `--unreleased`, `--yanked`, `--full` and `--specific` modes.
- Specification of the `.cldef` and `.cllst` file syntax (design/file-formats.md).
- Example public repository in `examples/public-repo`.

[Unreleased]: https://github.com/vdrielc/changelog.cl/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/vdrielc/changelog.cl/releases/tag/v0.1.0
