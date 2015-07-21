
module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    uglify: {
      options: {
        banner: "/*! <%= pkg.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n",
        sourceMap: true,
        sourceMapIn: "out/exorcise/<%= pkg.name %>.deps.js.map",
        mangle: true,
        beautify: false
      },
      build: {
        src: "<%= browserify.main.dest %>",
        dest: "static/js/<%= pkg.name %>.min.js"
      }
    },
    concat: {
      options: {
        // define a string to put between each file in the concatenated output
        separator: ";"
      },
      dist: {
        // the files to concatenate
        src: ["out/react/*.js"],
        // the location of the resulting JS file
        dest: "out/concat/<%= pkg.name %>.js"
      }
    },
    eslint: {
      // define the files to lint
      target: ["gruntfile.js", "src/jsx/*.jsx"]
    },
    browserify: {
      options: {
        browserifyOptions: {
          debug: true,
          extensions: [".js", ".jsx", ".es6"]
        }
      },
      main: {
        src: ["src/jsx/*.jsx", "src/jsx/*.es6"],
        dest: "out/browserify/<%= pkg.name %>.deps.js",
        options: {
          transform: [ "babelify" ]
        }
      }
    },
    exorcise: {
      bundle: {
        options: {},
        files: {
          "out/exorcise/<%= pkg.name %>.deps.js.map": ["out/browserify/<%= pkg.name %>.deps.js"]
        }
      }
    },
    cssmin: {
      options: {
        sourceMap: true
      },
      target: {
        files: {
          "static/css/main.min.css": ["src/css/*.css",
                                      "node_modules/react-swipe-views/lib/react-swipe-views.css"]
        }
      }
    },
    watch: {
      files: ["<%= eslint.target %>", "src/jsx/*.jsx", "src/css/*.css"],
      tasks: ["default"]
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-eslint");
  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-exorcise");

  // Default task(s).
  grunt.registerTask("default", ["eslint", "browserify", "exorcise", "uglify", "cssmin"]);

};
