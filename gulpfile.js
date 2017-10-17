var gulp = require('gulp');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var beautify = require('gulp-beautify');
var mocha = require('gulp-mocha');

var paths = {
    watch: ['**/*.js', '!node_modules/**'],
    dist: 'dist',
    lint: ['**/*.js', '!dist/**', '!node_modules/**'],
    beautify: ['**/*.js', '!dist/**', '!node_modules/**'],
    compress: 'enrich.js',
    test: 'test/**/*.js'
};

var defaultTasks = ['lint', 'test', 'compress'];

gulp.task('default', defaultTasks.concat('watch'));

gulp.task('lint', function() {
    return gulp.src(paths.lint)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('test', function() {
    return gulp.src(paths.test)
        .pipe(mocha({
            reporter: 'progress'
        }));
});

gulp.task('compress', function() {
    return gulp.src(paths.compress)
        .pipe(uglify())
        .pipe(gulp.dest(paths.dist));
});

gulp.task('beautify', function() {
    return gulp.src(paths.beautify)
        .pipe(beautify({
            indent_size: 4
        }))
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    gulp.watch(paths.watch, defaultTasks);
});