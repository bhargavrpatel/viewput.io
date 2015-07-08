var
    gulp    =   require('gulp'),
    babel   =   require('gulp-babel'),
    watch   =   require('gulp-watch'),
    uglify  =   require('gulp-uglify'),
    strip   =   require('gulp-strip-comments'),
    rename  =   require('gulp-rename');
    riot    =   require('riot');

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
      path.basename = path.basename.replace('es6', 'dist');
    }))
    .pipe(gulp.dest('browser/build/js'))
});


// Compile all of riot.js tag files
gulp.task('riot', function() {
  return gulp.src('browser/src/riot-tags/**.tag')
    .pipe(compileTAGtoJS())           // Custom Compile function
    .pipe(babel())                       // Babel ES5 -> ES6
    .pipe(uglify())                      // uglify
    .pipe(rename(function (path) {       // Rename files so .es6.js -> .js
      console.log(path);
      path.extname = '.tag.js';
    }))
    .pipe(gulp.dest('browser/build/js/riot-components'))
});



gulp.task('transpile', ['transpile-app', 'transpile-scripts'])
gulp.task('build', ['transpile', 'riot'])
gulp.task('default', ['build'])





/* ------------------------------------ */
//        CUSTOM FUNCTIONS BELOW        //
/* ------------------------------------ */

/* Converts Riotjs DSL to javascript */
function compileTAGtoJS() {
  function transform(file, callback) {
    file.contents = new Buffer(riot.compile(String(file.contents)));
    callback(null, file);
  }
  return require('event-stream').map(transform);
}
