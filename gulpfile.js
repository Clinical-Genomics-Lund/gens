// requirements
const gulp = require('gulp')
const sass = require('gulp-sass')(require('sass'))
const rename = require('gulp-rename')
const webpack = require('webpack')
const sourcemaps = require('gulp-sourcemaps')
const resolve = require('path').resolve
const webpackConfig = require('./webpack.config.js')

// define paths
const dest = 'build'
const assetPath = 'assets'
const gensCss = [
  `${assetPath}/css/gens.scss`
]

// run webpack
function runWebpack (config) {
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
gulp.task('build-js', function () {
  return runWebpack(webpackConfig)
})

gulp.task('build-gens-css', function () {
  return gulp.src(gensCss)
    .pipe(rename('gens.min.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/css`))
})

gulp.task('build-home-css', function () {
  return gulp.src(`${assetPath}/css/home.scss`)
    .pipe(rename('home.min.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/css`))
})

gulp.task('build-landing-css', function () {
  return gulp.src(`${assetPath}/css/landing.scss`)
    .pipe(rename('landing.min.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/css`))
})

gulp.task('build-about-css', function () {
  return gulp.src(`${assetPath}/css/about.scss`)
    .pipe(rename('about.min.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/css`))
})

gulp.task('build-error-css', function () {
  return gulp.src(`${assetPath}/css/error.scss`)
    .pipe(rename('error.min.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(`${dest}/css`))
})

gulp.task('build', gulp.parallel('build-js', 'build-gens-css', 
'build-home-css', 'build-landing-css', 'build-about-css', 'build-error-css'))

// DEVELOPMENT tasks
//
const devGlobalAssets = 'gens/static'
const devGensAssets = 'gens/blueprints/gens/static'
const devAboutAssets = 'gens/blueprints/home/static'

gulp.task('build-js-dev', () => {
  webpackConfig.mode = 'development'
  webpackConfig.output.path = resolve('./gens/blueprints/gens/static/')
  return runWebpack(webpackConfig)
})

gulp.task('build-gens-css-dev', () => {
  return gulp.src(gensCss)
    .pipe(rename('gens.min.css'))
    .pipe(sass())
    .pipe(gulp.dest(devGensAssets))
})

gulp.task('build-about-css-dev', () => {
  return gulp.src(`${assetPath}/css/about.scss`)
    .pipe(rename('about.min.css'))
    .pipe(sass())
    .pipe(gulp.dest(devAboutAssets))
})

gulp.task('build-landing-css-dev', () => {
  return gulp.src(`${assetPath}/css/landing.scss`)
    .pipe(rename('landing.min.css'))
    .pipe(sass())
    .pipe(gulp.dest(devAboutAssets))
})

gulp.task('build-home-css-dev', () => {
  return gulp.src(`${assetPath}/css/home.scss`)
    .pipe(rename('home.min.css'))
    .pipe(sass())
    .pipe(gulp.dest(devAboutAssets))
})

gulp.task('build-error-css-dev', () => {
  return gulp.src(`${assetPath}/css/error.scss`)
    .pipe(rename('error.min.css'))
    .pipe(sass())
    .pipe(gulp.dest(`${devGlobalAssets}/css`))
})

gulp.task('watch', () => {
  gulp.watch(`${assetPath}/css/*.scss`, gulp.parallel('build-gens-css-dev', 'build-home-css-dev',
    'build-about-css-dev', 'build-landing-css-dev', 'build-error-css-dev'))
  gulp.watch(`${assetPath}/js/*.js`, gulp.parallel('build-js-dev'))
  gulp.watch(`${assetPath}/js/*/*.js`, gulp.parallel('build-js-dev'))
})
