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

// PRODUCTION tasks
//
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

// DEVELOPMENT tasks
//
const devGlobalAssets = 'gens/static'
const devGensAssets = 'gens/blueprints/gens/static'
gulp.task('build-js-dev', () => {
  return gulp.src(jsFiles)
    .pipe(concat('gens.min.js'))
    .pipe(gulp.dest(devGensAssets))
});

gulp.task('build-gens-css-dev', () => {
  return gulp.src(gensCss)
    .pipe(rename('gens.min.css'))
    .pipe(sass())
    .pipe(gulp.dest(devGensAssets))
});

gulp.task('build-base-css-dev', () => {
  return gulp.src(`${assetPath}/css/base.scss`)
    .pipe(rename('base.min.css'))
    .pipe(sass())
    .pipe(gulp.dest(`${devGlobalAssets}/css`))
});

gulp.task('build-error-css-dev', () => {
  return gulp.src(`${assetPath}/css/error.scss`)
    .pipe(rename('error.min.css'))
    .pipe(sass())
    .pipe(gulp.dest(`${devGlobalAssets}/css`))
});

gulp.task('watch', () => {
  gulp.watch(`${assetPath}/css/*.scss`, gulp.parallel('build-gens-css-dev', 'build-base-css-dev', 'build-error-css-dev'));
  gulp.watch(`${assetPath}/js/*.js`, gulp.parallel('build-js-dev'))
})
