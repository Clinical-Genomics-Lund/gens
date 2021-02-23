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
const gensCss = [
  `${assetPath}/css/gens.scss`,
]

gulp.task('build-js', function() {
  return gulp.src(jsFiles)
    .pipe(sourcemaps.init())
    .pipe(concat('gens.min.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/js`))
});

gulp.task('build-gens-css', function() {
  return gulp.src(gensCss)
    .pipe(rename('gens.min.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({outputStyle: 'compressed'}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/css`))
});

gulp.task('build-base-css', function() {
  return gulp.src(`${assetPath}/css/base.scss`)
    .pipe(rename('base.min.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({outputStyle: 'compressed'}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/css`))
});

gulp.task('build-error-css', function() {
  return gulp.src(`${assetPath}/css/error.scss`)
    .pipe(rename('error.min.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({outputStyle: 'compressed'}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/css`))
});

gulp.task('build', gulp.parallel('build-js', 'build-gens-css',
                                 'build-base-css', 'build-error-css'));
