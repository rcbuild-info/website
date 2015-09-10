
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
        src: "out/browserify/<%= pkg.name %>.deps.js",
        dest: "static/js/<%= pkg.name %>.min.js"
      }
    },
    eslint: {
      // define the files to lint
      target: ["gruntfile.js", "src/**/*.jsx", "src/**/*.js"]
    },
    browserify: {
      dev: {
        options: {
          browserifyOptions: {
            debug: true,
            extensions: [".js", ".jsx"]
          },
          transform: [[ "babelify" ]]
        },
        files: {
          "out/browserify/<%= pkg.name %>.deps.js": ["src/**/*.js", "src/**/*.jsx"]
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
      files: ["<%= eslint.target %>", "src/css/*.css"],
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
