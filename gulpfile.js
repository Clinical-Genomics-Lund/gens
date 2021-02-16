// requirements
const gulp = require('gulp'),
      sass = require('gulp-sass'),
      uglify = require('gulp-uglify-es').default,
      concat = require('gulp-concat'),
      rename = require('gulp-rename'),
      sourcemaps = require('gulp-sourcemaps');

// define paths
const dest = 'build'
const assetPath = 'assets'
const jsFiles = [
  'node_modules/three/build/three.min.js',
  `${assetPath}/js/fetch.js`,
  `${assetPath}/js/genecanvas.js`,
  `${assetPath}/js/interactive.js`,
  `${assetPath}/js/track.js`,
  `${assetPath}/js/transcript.js`,
  `${assetPath}/js/variant.js`,
  `${assetPath}/js/annotation.js`,
  `${assetPath}/js/overview.js`,
]

gulp.task('build-js', function() {
  return gulp.src(jsFiles)
    .pipe(sourcemaps.init())
    .pipe(concat('gens.min.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/js`))
});
gulp.task('build-css', function() {
  return gulp.src(`${assetPath}/css/*.scss`)
    .pipe(rename('gens.min.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({outputStyle: 'compressed'}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/css`))
});

gulp.task('build', gulp.parallel('build-js', 'build-css'));
