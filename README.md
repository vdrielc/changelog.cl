# changelog.cl

[Link](https://changelog.cl) :TODO:

This project aims to provide a standardized method of tracking functional changes to applications (no diffs or commit logs), offering a single, fast and easy to use CLI interface to fetch the latest changelogs.

[Short History](https://github.com/vdrielc/changelog.cl/blob/master/HISTORY.md)

## Initial Goals:
- Provide tooling for centrally managing and communicating functional changes to users
	- Central management is self hosted and can be entirely private
- Optional participation in a public changelog	repository
- API for integrating change logs into systems
	- Both private and public repositories
- Provision for notification systems
	- UI components for notifying users of changes
- State management for changes, for example
	- Planned
	- Released
	- Pulled/Rolled back
- Plugin system for correctly sorting versions based on different schemes
	- Industries have their own standards for versioning

## Design Documents

| Documents      |                                                                                       |
|-----------------------|--------------------------------------------------------------------------------|
| CLI Commands Document | [Link](https://github.com/vdrielc/changelog.cl/blob/master/design/command-line.md) |
| CLI Commands Visual   | [Link](https://github.com/vdrielc/changelog.cl/blob/master/design/command-design.pdf) |
| Repository Document   | [Link](https://github.com/vdrielc/changelog.cl/blob/master/design/repository.md)                                                                         |

## Cross Platform
- The application should be platform independent
- It should allow for integration into toolchains through piping of input and output

## Progress
I have finally had a chance to play with this idea. Below is a prototype CLI interface I'm using to explore ideas, note that this does not implement the same commandline commands as the design document proposes.

![Image of Proto-CLI](https://github.com/vdrielc/changelog.cl/blob/master/assets/proto-cli.gif)

## Attribution
[keep-a-changelog](https://github.com/olivierlacan/keep-a-changelog)
- The file format for this project is based on the work of [keepachangelog.com](https://keepachangelog.com/)
- The license can be found here: [MIT License](https://github.com/vdrielc/changelog.cl/blob/master/attributions/keepachangelog.com)


