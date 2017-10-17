var gulp   = require('gulp');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var beautify = require('gulp-beautify');

var watchPath = ['**/*.js', '!node_modules/**'];
var distPath = 'dist';
var hintPath = ['**/*.js', '!node_modules/**'];
var beautifyPath = ['**/*.js', '!dist/**', '!node_modules/**'];
var compressPath = 'enrich.js';


gulp.task('default', ['watch']);

gulp.task('hint', function() {
  return gulp.src(hintPath)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('beautify', function () {
    return gulp.src(beautifyPath)
        .pipe(beautify({indent_size: 4}))
        .pipe(gulp.dest('./'));
});

gulp.task('compress', function () {
    return gulp.src('enrich.js')
        .pipe(uglify())
        .pipe(gulp.dest(distPath));
});

gulp.task('watch', function() {
  gulp.watch(watchPath, ['hint', 'compress']);
});