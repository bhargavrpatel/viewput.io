var
    gulp    = require('gulp'),
    babel   = require('gulp-babel'),
    watch   = require('gulp-watch'),
    strip   = require('gulp-strip-comments'),
    rename  = require('gulp-rename');

// Transpile ES6 app to ES5 using babel
gulp.task('transpile', function () {
  return gulp.src('app/main.es6.js')
    .pipe(strip())                       // Strip comments
    .pipe(babel())                       // Pipe the file into babel
    .pipe(rename('main.js'))             // rename to main.js
    .pipe(gulp.dest('app'))              // Save it in the same directory
});

// // Watch the main.es6.js file for changes and transpile automatically
// gulp.task('watch', function () {
//   watch('app/main.es6.js', ['transpile']);
// })


gulp.task('default', ['transpile'])
