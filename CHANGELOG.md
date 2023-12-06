# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/)

About changelog [here](https://keepachangelog.com/en/1.0.0/)

## [x.x.x]
### Added
### Changed
 - Changes the main view's page title to be `sample_name` and adds `sample_name` and `case_id` to the header title
 - Updated external images used in GitHub actions, including tj-actions/branch-names to v7 (fixes a security issue)
 - Updated Python and MongoDB version used in tests workflow to 3.8 and 7 respectively
### Fixed

## [2.1.1]
### Added
### Changed
 - Updated flask and pinned connexion to v2
 - Updated node version of github action to 17.x
### Fixed
 - Fixed annotation tracks being hidden behind other elements
 - Use sample id as individual id to link out from Gens home sample list
 - Some fixes from MHKC CG-Lund, e.g. status codes and a JSON error
 - Removes some leading `/` that were breaking links
 - Increased contrast of region selector
 - Chromosome bands are displayed properly

## [2.1.0]
### Added
 - Added seperate error page for when accessing a sample not in the database
 - load chromosome-info stores centromere position and cyto band info
 - Display viewed chromosome region in cytogenetic ideogram figure
### Changed
### Fixed
 - Can now display samples that doesnt have data on all chromosomes

## [2.0.1]
### Added
### Changed
 - Do not warn when using default configuration
 - Renamed cli gens load chrom-sizes to gens load chromosome-info
 - Removed gens load chromosome-info dependancy on additional files
### Fixed
 - Missing tbi files now returns 404 status code
 - Fixed sort order of samples table
 - Prevent "internal error" when trying to access sample not in database

## [2.0.0]
### Added
 - Command line interface for manageing Gens
 - Commands for loading transcripts, annotations and chromosome size into database
 - Include api spec, html and static files in distribution
 - Display when databases last updated in /about.html
 - Display current configuration /about.html
 - Added landing page that show uploaded samples
 - Added load sample command for loading samples into gens database
 - Added index command for creating new indexes
 - Added view sample command for displaying sample information
 - Added pagination samples table
### Changed
 - Changed development status from Alpha to Stable
 - Samples are loaded based on the paths given when uploading the sample
 - Gens no longer uses HG38_PATH and HG37_PATH variables
 - Use genome build instead of hg_type throughout the codebase and in API calls
### Fixed
 - Fixed typo in variable name

## [1.2.1]
### Added
 - Reinstated tooltips to display additional information on genetic elements
### Changed
 - Use popper for positioning tooltips
### Fixed

## [1.2.0]
### Added
 - Added github workflow for running pytest on PRs
 - Added unit tests
 - Added labels to the annotation tracks
 - Added js unit tests with jest and linting with eslint
### Changed
 - Changed positive strand color of transcripts to a more constrasting color
 - Temporarily disabled on hover popups in annotation tracks
 - Transcripts are represented as arrows in lower resolutions
 - Highlight MANE transcript in name and with a brighter color
 - Annotaion tracks are disabled if api returns an error at some point
 - Annotation track DOMs are constructed with template macros
 - Don't show "Loading..." when panning the interactive view with the  mouse
 - Changed default chromosome region to display to entire chromosome 1
 - Restored ability to view entire chromosome when zoomed in by clicking on it in the chromosome overview.
 - Build js package with webpack instead of gulp
 - Remove dependency on three.js
### Fixed
 - Gene names are now centered below transcript
 - Fixed assignement of height order when updating transcript data
 - get-variant-data returns 404 if case cant be found
 - Hide trancscript tracks when requesting new data from api
 - Fixed alignment of annotation tracks near chromosome end

## [1.1.2]
### Added
 - Added error pages for 404, 416, 500 and missing samples
 - Added `watch` cmd to `npm run` to launch a gulp server watches and updates js/css assets
 - Shift - Click now Zoom in
### Changed
 - Refactored page definitions into blueprint module
 - Removed entrypoint script
### Fixed
 - Navigation shortcuts does not trigger in text fields
 - Fixed crash when searching for only chromosome
 - Restored ability to search for transcripts by gene name
 - Fixed crash when Shift - Click in interactive canvas
 - Fixed checking of api return status in drawInteractiveContent
 - Aligned highlight in interactive canvas
 - Bumped Three to version 0.125.0

## [1.1.1]
### Fixed
 - Reincluded gunicorn in docker image

## [1.1.0]
### Added
 - Runnable Gens development environment in docker
 - Added Change log document
 - Added development environment
 - Set default annotation file with annotation="name" url argument
 - Added tack with variants from the Scout database where the selected variant is highlighted
 - Github action to enforce the use of a changelog
 - Described Gens APIs in openAPI specification file
 - Add possibility to load overview data from a JSON, which substantially improves initial load times.
 - Ctrl + Mouse click in interacive canvas zooms out
 - Shift + Mouse to select a region in the interactive canvas to zoom in on
 - Annotation tracks pan with the coverage track
 - Annotation tracks are rendered by blitting sections from an offscreen canvas
 - Added logo to README and Gens webpage
### Changed
 - Added description on how to use the containerized version of Gens
 - Replaced print statements with logging to stderr
 - Refactored Gens as a python package
 - Updated `start.sh` to work with packaged Gens
 - Improved loading of genome overview track
 - Made Gens (and db update scripts) read db configuration from env variables
 - Increased the expanded annoation track width to 300px
 - All annotations are allways being displayed
 - Eliminate use of offScreenCanvas in order to support Firefox/Gecko
 - Removed select region to zoom functionality from overview canvas
 - Dropped jquery as a dependency
 - General GUI updates
### Fixed
 - Replaced depricated `update()` with `update_one()` in `update_transcripts.py`.
 - Adjust the "Loading..." div to avoid drawing it above UI elements
 - Made SASS more readable

## [1.0.0]
### Added
 - Initial release of Gens
