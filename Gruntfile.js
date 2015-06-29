module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: '<%= browserify.main.dest %>',
        dest: 'static/js/<%= pkg.name %>.min.js'
      }
    },
    react: {
      files: {
        expand: true,
        cwd: 'src',
        src: ['**/*.jsx'],
        dest: 'static/js',
        ext: '.js'
      }
    },
    concat: {
      options: {
        // define a string to put between each file in the concatenated output
        separator: ';'
      },
      dist: {
        // the files to concatenate
        src: ['static/js/build.js'],
        // the location of the resulting JS file
        dest: 'static/js/<%= pkg.name %>.js'
      }
    },
    jshint: {
      // define the files to lint
      files: ['gruntfile.js', 'src/**/*.js', 'test/**/*.js']
    },
    browserify: {
      main: {
        src: 'static/js/<%= pkg.name %>.js',
        dest: 'static/js/<%= pkg.name %>.deps.js'
      }
    },
    watch: {
      files: ['<%= jshint.files %>', 'src/*.jsx'],
      tasks: ['default']
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-react');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'react', 'concat', 'browserify', 'uglify']);

};