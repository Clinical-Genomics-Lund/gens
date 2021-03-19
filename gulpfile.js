// requirements
const gulp = require('gulp');
const sass = require('gulp-sass');
const rename = require('gulp-rename');
const webpack = require('webpack');
const sourcemaps = require('gulp-sourcemaps');
let webpackConfig = require('./webpack.config.js');

// define paths
const dest = 'build'
const assetPath = 'assets'
const gensCss = [
  `${assetPath}/css/gens.scss`,
]

// run webpack
function runWebpack(config) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        return reject(err)
      }
      if (stats.hasErrors()) {
        return reject(new Error(stats.compilation.errors.join('\n')))
      }
      resolve()
    })
  })
}

// PRODUCTION tasks
gulp.task('build-js', function() {
  return runWebpack(webpackConfig)
})

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
  webpackConfig['mode'] = 'development'
  return runWebpack(webpackConfig)
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
