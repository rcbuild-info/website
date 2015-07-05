module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        sourceMap: true,
        sourceMapIn: 'static/js/<%= pkg.name %>.deps.js.map',
        mangle: true
      },
      build: {
        src: '<%= browserify.main.dest %>',
        dest: 'static/js/<%= pkg.name %>.min.js'
      }
    },
    react: {
      files: {
        expand: true,
        cwd: 'src/jsx',
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
      options: {
        browserifyOptions: {
          debug: true
        }
      },
      main: {
        src: 'static/js/<%= pkg.name %>.js',
        dest: 'static/js/<%= pkg.name %>.deps.js'
      }
    },
    exorcise: {
      bundle: {
        options: {},
        files: {
          'static/js/<%= pkg.name %>.deps.js.map': ['static/js/<%= pkg.name %>.deps.js'],
        }
      }
    },
    cssmin: {
      options: {
        sourceMap: true
      },
      target: {
        files: {
          'static/css/main.min.css': ['src/css/*.css',
                                      'node_modules/react-swipe-views/lib/react-swipe-views.css']
        }
      }
    },
    watch: {
      files: ['<%= jshint.files %>', 'src/jsx/*.jsx', 'src/css/*.css'],
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
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-exorcise');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'react', 'concat', 'browserify', 'exorcise', 'uglify', 'cssmin']);

};
