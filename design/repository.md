# Repository Design

For speedy and uninterruptable usage of Changelog.cl, a distributed set of self-hosted respositories are preferred. 
A local copy of the repositories will be kept and updated using :> cl repo fetch.

If a local repository is out of date with information in the *.cllst file, the individual resources found to be out of date will be fetched.

This will allow for offline use of the system with the understanding that the latest version information could be out of date.

To keep hosting requirements simple, cost effective and fast, resources will be fetches using Http->GET requests, no directory listings will be required or enumerated, only resources directly linked in one of the file definitions below will be fetched.

All files are plain text and human readable


## Process

When requested, the :> cl CLI will download the latest verion of the selected repository (or all repositories registered) .cldef file.

It will then loop over the cllstFileList and fetch each of the .cllst files in the cldef.
It will then identify missing or outdated .cl files by looping over the .cl file list in the .cllst file.
- any file that is missing locally is downloaded
- any file with a mismatched hash will be downloaded and replace the existing local file

Once completed, all other operations for interacting with .cl files will be performed locally until the user requestes another remote fetch.

![Repo Layout Example](https://github.com/vdrielc/changelog.cl/blob/master/assets/repo-example.png)

## Proposed File Formats

### [repo_name].cldef

The cl Definition (.cldef) file will contain information for the repositry at a URL as specified in the :> cl repo add [repo_friendly_name] [repo_url]

The definition should contain: 
- contact information for the provider of the repository
- any copyright or licensing notices associated with the repository
- a description of the applications tracked within this repository

Additionally the definition must contain:
- a list of all repository List files (.cllst) for the given cldef. These will be URL's that can be accessed with http:get

| Field                 | Description                                                                                                                                                                         | Type   | Required for Private | Required for Public |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|----------------------|---------------------|
| RepositoryName        | A friendly name for the repository, used in searches to locate repositories to subscribe to                                                                                         | String | No                   | Yes                 |
| RepositoryDescription | A brief description of the applications tracked by this repository                                                                                                                  | String | No                   | Yes                 |
| LicenseInformation    | Either the license name or a link to the license file for this repository. The license covers the *.cl* files for this repository and not the applications the *.cl files point to. | String | No                   | Yes                 |
| ContactEmailAddress   | Contact email address for the owner, maintainer or responsible party/team for this repository. Basically the support mailbox.                                                       | String | No                   | Yes                 |
| RepositoryOwner       | Name of the owner of this repository, individual, organization or team if private                                                                                                   | String | No                   | Yes                 |
| cllstFileList         | A list of file URLs pointing to *.cllst files provided by this repository                                                                                                           | List   | Yes                  | Yes                 |

Whitespace delimited list of *.cllst files
[http{s}://FQDN/DIRECTORY/[repo_list_name].cllst] [http{s}://FQDN/DIRECTORY/[repo_list_name].cllst] [http{s}://FQDN/DIRECTORY/[repo_list_name].cllst] [http{s}://FQDN/DIRECTORY/[repo_list_name].cllst]

Multiple .cllst files are supported in a single .cldef file because this allows the repository owner to compose different, larger repositories from smaller ones that automatically update when lower down repos are changed.

As an example, there may be a repository for com.microsoft.office containing .cl files for each version of the office suite. All these files are contained inside two distinct .cllst files. One containing versions with active support and another for legacy products.
There is a second repository for com.microsoft.visualstudio, again split up between two .cllst files, one active support and one legacy.

The exact same cllst files can be reused in their current location to compose three more repositories. One containting ALL the cllst files and named com.microsoft one containting only the active support cllst files for com.microsoft.current and a third containing only the legacy products, com.microsoft.legacy.

This localizes changes to all of these repos to a change to a single cllst file per change. Obviously the .cl file will always be updated but since that too is shared, changes do not need to be applied to individual repos.

Composing repositories in this way allows for grouping of related items and allows users to only subscribe to what is in scope for their needs or alternatively subscribe to everything.

![Composing Repositories](https://github.com/vdrielc/changelog.cl/blob/master/assets/composing-repos.png)

### [repo_list_name].cllst

The cl List file will contain a list of all application changelog files (.cl) tracked within the specific cllist file.

Each entry must contain:
- The URL where the application changelog .cl file is located
- A friendly name for the application the entry points to
- A unique application_id, which must match the name of the .cl file
    - The application_id must be unique within the repository that contains this file, it does not need to be globally unique
    - A preferred format will be constructed to standardise naming formats where possible
- The last changed date for the .cl file
- The latest version contained within the .cl file
- An SHA1 hash for the .cl file

| Field           | Description                                               | Type       | Required for Private | Required for Public |
|-----------------|-----------------------------------------------------------|------------|----------------------|---------------------|
| ApplicationID   | A unique application identifier used in the CLI interface | String     | Yes                  | Yes                 |
| ApplicationName | Friendly name for the application                         | String     | No                   | Yes                 |
| clFileURL       | URL go .cl file                                           | String     | Yes                  | Yes                 |
| LastChangedDate | The date this .cl file was last updated.                  | YYYY-MM-DD | No                   | Yes                 |
| LatestVersion   | The latest chronological version in the file.             | String     | No                   | Yes                 |
| Hash            | SHA1 has of .cl file for this entry                       | String     | Yes                  | Yes                 |

### [application_id].cl File

The .cl file is a markdown file matching the format as proposed by [keepachangelog.com](https://keepachangelog.com/)

- This file can be show viewed using :> cl show [application_id] 