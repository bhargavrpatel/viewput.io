var
    gulp    = require('gulp'),
    babel   = require('gulp-babel'),
    watch   = require('gulp-watch'),
    uglify  = require('gulp-uglify'),
    strip   = require('gulp-strip-comments'),
    rename  = require('gulp-rename');

// Transpile ES6 app to ES5 using babel
gulp.task('transpile-app', function () {
  return gulp.src('app/main.es6.js')
    .pipe(strip())                       // Strip comments
    .pipe(babel())                       // Pipe the file into babel
    .pipe(uglify())                       // Pipe the file into babel
    .pipe(rename('main.dist.js'))             // rename to main.js
    .pipe(gulp.dest('app'))              // Save it in the same directory
});

// Transpile general ES6 javascripts
gulp.task('transpile-scripts', function () {
  return gulp.src('browser/src/es6-js/**.es6.js')
    .pipe(strip())                       // Strip comments
    .pipe(babel())                       // Babel ES5 -> ES6
    .pipe(uglify())                      // uglify
    .pipe(rename(function (path) {       // Rename files so .es6.js -> .js
      path.basename = path.basename.replace('.es6', '');
    }))
    .pipe(gulp.dest('browser/build/js'))
});


gulp.task('default', ['transpile-app'])
gulp.task('transpile', ['transpile-app', 'transpile-scripts'])
