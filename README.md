# rcbuild.info
Site to catalog multicopter builds.

## Development
rcbuild.info can be run locally for easier testing of code.

### Dependencies
It has two external dependencies: elasticsearch and github. Elasticsearch installation instructions are [here](https://www.elastic.co/downloads/elasticsearch) and GitHub's API is mimicked by local-github whose installation instructions are [here](https://github.com/tannewt/local-github).

Python dependencies are installed within a virtual environment. Start the environment with `sh bin/activate` from within the virtual env directory. Then do `pip install -r requirements.txt`. Later, run application.py from this terminal which has the virtual environment set.

Most Javascript dependencies are managed by npm. npm is available [here](). Once installed it is suggested to install grunt-cli globally with `npm -g grunt-cli`. Finally the rest of the dependencies can be installed within the directory with `npm install`.

### Running
To get rcbuild.info going run steps 3-6 in separate tabs. Once running it will be [here](http://127.0.0.1:5000).
1. Update `development.env` so that `LOCAL_GITHUB_REPO_DIRECTORY` points to the correct location.
2. `source development.env`
3. `elasticsearch --http.cors.enabled=true` - Runs on port 9200 by default.
4. `node local-github.js` - Runs on port 6178 by default.
5. `init-rcbuild.sh` - Optional after the first time.
6. `grunt watch`
7. `python2 application.py` - Runs on port 5000 by default.
