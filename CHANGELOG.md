# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/)

About changelog [here](https://keepachangelog.com/en/1.0.0/)

## [x.x.x]
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
### Fixed
 - Replaced depricated `update()` with `update_one()` in `update_transcripts.py`.
 - Adjust the "Loading..." div to avoid drawing it above UI elements
## [1.0.0]
### Added
 - Initial release of Gens
