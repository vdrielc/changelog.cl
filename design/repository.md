# Repository Design

For speedy and uninterruptable usage of Changelog.cl, a distributed set of self-hosted respositories are preferred. 
A local copy of the repositories will be kept and updated using :> cl repo fetch.

If a local repository is out of date with information in the *.cllst file, the individual resources found to be out of date will be fetched and swapped out with the existing local copy.

This will allow for offline use of the system with the understanding that the latest version information could be out of date.



## Proposed File Formats

### [repo_name].cldef

The cl Definition (.cldef) file will contain information for the repositry at a URL as specified in the :> cl repo add [repo_friendly_name] [repo_url]

The definition should contain: 
- contact information for the provider of the repository
- any copyright or licensing notices associated with the repository
- a description of the applications tracked within this repository

Additionally the definition must contain:
- a list of all repository List files (.cllst) for the given cldef. These will be URL's that can be accessed with http:get

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
- An MD5 hash for the .cl file

### [application_id].cl File

The .cl file is a markdown file matching the format as proposed by keepachangelog.com

- This file can be show viewed using :> cl show [application_id] 