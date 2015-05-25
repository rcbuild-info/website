var github = new Github({
  token: "5c71bfe936fcc9e78d6b96b67524592e261d8bb5", // token. not actually my password
  auth: "oauth"
});

var Part = React.createClass({
  getInitialState: function() {
    return {
      partInfo: {},
      unknown: false
    };
  },

  componentDidMount: function() {
    var repo = github.getRepo("tannewt", "rcbuild.info-parts");
    repo.contents("master", this.props.id + ".json",
                  _.bind(function(err, contents) {
                    console.log(err, contents);
                    if (err) {
                      this.setState({
                        unknown: true
                      });
                    } else if (this.isMounted()) {
                      this.setState({
                        partInfo: JSON.parse(window.atob(contents["content"]))
                      });
                    }
                  }, this));
  },
  render: function() {
    var unknown = "";
    if (this.state.unknown) {
      unknown = (<a href="https://github.com/tannewt/rcbuild.info-part-skeleton" title="This part is unknown. Click for more information on how to add it." target="_blank" className="unknown">?</a>);
    }
    var partInfo = (<td>{this.props.id}{unknown}</td>);
    if (this.state.partInfo.name) {
      partInfo = (<td className="part">{this.state.partInfo.manufacturer} {this.state.partInfo.name}</td>);
    }
    return (<tr><td className="category">{this.props.model.name}</td>{partInfo}</tr>);
  }
});

var Build = React.createClass({
  getInitialState: function() {
    return {
      buildModel: {},
      buildInfo: {}
    };
  },

  componentDidMount: function() {
    var repo = github.getRepo(this.props.user, this.props.repo);
    repo.contents("master", "build.json",
                  _.bind(function(err, contents) {
                    console.log(err, contents);
                    if (this.isMounted()) {
                      this.setState({
                        buildInfo: JSON.parse(window.atob(contents["content"]))
                      });
                    }
                  }, this));
    var buildSkeletonRepo = github.getRepo("tannewt", "rcbuild.info-part-skeleton");
    buildSkeletonRepo.contents("master", "partCategories.json",
                  _.bind(function(err, contents) {
                    if (this.isMounted()) {
                      this.setState({
                        partCategories: JSON.parse(window.atob(contents["content"]))
                      });
                    }
                  }, this));
  },
  render: function() {
    var parts = [];
    if (this.state.partCategories && this.state.buildInfo) {
      console.log(this.state.buildInfo["config"]);
      var partCategories = Object.keys(this.state.buildInfo["config"]);
      partCategories.sort(_.bind(function(a, b) { return this.state.partCategories["categories"][a]["order"] - this.state.partCategories["categories"][b]["order"]; }, this));
      for (var i in partCategories) {
        var category = partCategories[i];
          parts.push((<Part model={this.state.partCategories["categories"][category]} key={this.state.buildInfo.config[category]} id={this.state.buildInfo.config[category]}/>));
        }
    }
    return (<table>{parts}</table>);
  }
});

var urlparts = window.location.pathname.split("/");
var user = urlparts[2];
var repo = urlparts[3];
React.render(
  <Build user={user} repo={repo}/>,
  document.getElementById('build')
);