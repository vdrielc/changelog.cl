# Commandline Design

## Help

### Listing available applications
:> cl List Applications

| Application       | Application ID     | Repository          | Last Updated | Latest Version | URL                         |
|-------------------|--------------------|---------------------|--------------|----------------|-----------------------------|
| Changelog.cl      | cl.changelog       | public.changelog.cl | 2021-07-01   | 0.0.1          | https://changelog.cl/       |
| Keep a Change Log | com.keepachangelog | public.changelog.cl | 2017-06-20   | 1.0.0          | https://keepachangelog.com/ |

#### Optional Filters
:TODO:

### Listing application versions
:> cl List Versions com.keepachangelog

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

#### Optional Filters
:TODO:

### Listing Repos
:> cl List Repos

| Repository           | URL                                     | Last Fetch | Fetch Required |
|----------------------|-----------------------------------------|------------|----------------|
| public.changelog.cl  | https://public.changelog.cl/repository/ | 2021-06-04 | Yes            |
| private.changelog.cl | https://changelogcl.local/repository/   | 2021-07-22 | No             |

#### Optional Filters
:TODO:

### Listing version information
:> cl Show com.keepachangelog

com.keepachangelog | Keep A Change Log | public.changelog.cl

\# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

\#\# [1.0.0] - 2017-06-20
\#\#\# Added
- New visual identity by [@tylerfortune8](https://github.com/tylerfortune8).
- Version navigation.
- Links to latest released version in previous versions.
- "Why keep a changelog?" section.
- "Who needs a changelog?" section.
- "How do I make a changelog?" section.
- "Frequently Asked Questions" section.
- New "Guiding Principles" sub-section to "How do I make a changelog?".
- Simplified and Traditional Chinese translations from [@tianshuo](https://github.com/tianshuo).
- German translation from [@mpbzh](https://github.com/mpbzh) & [@Art4](https://github.com/Art4).
- Italian translation from [@azkidenz](https://github.com/azkidenz).
- Swedish translation from [@magol](https://github.com/magol).
- Turkish translation from [@karalamalar](https://github.com/karalamalar).
- French translation from [@zapashcanon](https://github.com/zapashcanon).
- Brazilian Portugese translation from [@Webysther](https://github.com/Webysther).
- Polish translation from [@amielucha](https://github.com/amielucha) & [@m-aciek](https://github.com/m-aciek).
- Russian translation from [@aishek](https://github.com/aishek).
- Czech translation from [@h4vry](https://github.com/h4vry).
- Slovak translation from [@jkostolansky](https://github.com/jkostolansky).
- Korean translation from [@pierceh89](https://github.com/pierceh89).
- Croatian translation from [@porx](https://github.com/porx).
- Persian translation from [@Hameds](https://github.com/Hameds).
- Ukrainian translation from [@osadchyi-s](https://github.com/osadchyi-s).

\#\#\# Changed
- Start using "changelog" over "change log" since it's the common usage.
- Start versioning based on the current English version at 0.3.0 to help
translation authors keep things up-to-date.
- Rewrite "What makes unicorns cry?" section.
- Rewrite "Ignoring Deprecations" sub-section to clarify the ideal
  scenario.
- Improve "Commit log diffs" sub-section to further argument against
  them.
- Merge "Why can’t people just use a git log diff?" with "Commit log
  diffs"
- Fix typos in Simplified Chinese and Traditional Chinese translations.
- Fix typos in Brazilian Portuguese translation.
- Fix typos in Turkish translation.
- Fix typos in Czech translation.
- Fix typos in Swedish translation.
- Improve phrasing in French translation.
- Fix phrasing and spelling in German translation.

\#\#\# Removed
- Section about "changelog" vs "CHANGELOG".


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