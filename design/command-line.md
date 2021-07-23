# Commandline Design

## Help

### Listing available applications
:> cl List Applications

---------------------------------------

| Application       | Application ID     | Repository          | Last Updated | Latest Version | URL                         |
|-------------------|--------------------|---------------------|--------------|----------------|-----------------------------|
| Changelog.cl      | cl.changelog       | public.changelog.cl | 2021-07-01   | 0.0.1          | https://changelog.cl/       |
| Keep a Change Log | com.keepachangelog | public.changelog.cl | 2017-06-20   | 1.0.0          | https://keepachangelog.com/ |

---------------------------------------

#### Optional Filters
:TODO:

### Listing application versions
:> cl List Versions com.keepachangelog

---------------------------------------

Keep A Change Log
com.keepachangelog

| Version | Release Date | Repository          |
|---------|--------------|---------------------|
| 1.0.0   | 2017-06-20   | public.changelog.cl |
| 0.3.0   | 2015-12-03   | public.changelog.cl |
| 0.2.0   | 2015-10-06   | public.changelog.cl |
| 0.1.0   | 2015-10-06   | public.changelog.cl |
| 0.0.8   | 2015-02-17   | public.changelog.cl |
| 0.0.7   | 2015-02-16   | public.changelog.cl |
| 0.0.6   | 2014-12-12   | public.changelog.cl |
| 0.0.5   | 2014-08-09   | public.changelog.cl |
| 0.0.4   | 2014-08-09   | public.changelog.cl |
| 0.0.3   | 2014-08-09   | public.changelog.cl |
| 0.0.2   | 2014-07-10   | public.changelog.cl |
| 0.0.1   | 2014-05-31   | public.changelog.cl |

---------------------------------------

#### Optional Filters
:TODO:

### Listing Repos
:> cl List Repos

---------------------------------------

| Repository           | URL                                     | Last Fetch | Fetch Required |
|----------------------|-----------------------------------------|------------|----------------|
| public.changelog.cl  | https://public.changelog.cl/repository/ | 2021-06-04 | Yes            |
| private.changelog.cl | https://changelogcl.local/repository/   | 2021-07-22 | No             |

---------------------------------------

#### Optional Filters
:TODO:

### Listing version information
:> cl Show com.keepachangelog

---------------------------------------

com.keepachangelog | Keep A Change Log | public.changelog.cl

\# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

\#\# [1.0.0] - 2017-06-20
\#\#\# Added
- Redacted
- Redacted
- Redacted
- Redacted
- Redacted

\#\#\# Changed
- Redacted
- Redacted
- Redacted
- Redacted
- Redacted
- Redacted
- Redacted

\#\#\# Removed
- Section about "changelog" vs "CHANGELOG".

---------------------------------------

#### Output
Output is unprocessed markdown at the moment, this may change going forward.

#### Optional Filters

Supports optional additional switches after the application ID

##### Latest
--latest or -l or no switch, this is the default mode

Displays the latest, released version. Will not display Yanked versions.

##### Unreleased
--unreleased or -ur

Displays the unreleased versions.

##### Yanked
--yanked or -y

Displays the yanked versions.

##### Full
--full or -f

Displays the full changelog.

##### Repo
--repo {REPO NAME} or -r {REPO NAME}

:> cl Show com.keepachangelog -s 0.0.1 -r public.changelog.cl

Uses a specific repository if the application exists in multiple repositories.
If a conflict exists and a repository filter isn't specified, an error will be shown.

"Please use --repo or -r, application ID conflict encountered"

##### Specific
--specific {VERSION} or -s {VERSION}

:> cl Show com.keepachangelog -s 0.0.1

### Listing version information
:> cl Help Show

Lists the help text associated with the command.

### Repo

#### Add new repository
:> cl Repo Add public.changelog.cl https://public.changelog.cl/repository/ 

Repo Add {REPO NAME} {REPO URL}

#### Update existing repository
:> cl Repo Update public.changelog.cl -n repo.changelog.cl

cl Repo Update {REPO NAME} -u {NEW REPO URL} -n {NEW REPO NAME}

#### Remove existing repository
:> cl Repo Remove public.changelog.cl

cl Repo Remove {REPO NAME}

#### Fetch from existing repository
:> cl Repo Fetch public.changelog.cl

cl Repo Fetch {REPO NAME} {-a} 

Repo Name is optional, if ommited and a -a flag is specified, all will be fetched

### Public
:TODO: