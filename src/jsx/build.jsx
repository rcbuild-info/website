import React from "react";
import request from "superagent";

import Part from "./part";

export default class Build extends React.Component {
  constructor() {
    super();
    this.componentDidMount = this.componentDidMount.bind(this);
    this.render = this.render.bind(this);
    this.state = {
      buildModel: {},
      buildInfo: {}
    };
    this.buildRequest = null;
    this.partCategoriesRequest = null;
  }

  componentDidMount() {
    this.buildRequest =
      request.get("/build/" + this.props.user + "/" + this.props.repo + ".json")
             .end(function(err, res){
               this.buildRequest = null;
               if (!err && res.ok) {
                  this.setState({
                    buildInfo: JSON.parse(res.text)
                  });
                }
             }.bind(this));
    this.partCategoriesRequest =
      request.get("/partCategories.json")
             .end(function(err, res){
               this.partCategoriesRequest = null;
               if (!err && res.ok) {
                  this.setState({
                    partCategories: JSON.parse(res.text)
                  });
              }
            }.bind(this));
  }

  componentWillUnmount() {
    if (this.buildRequest) {
      this.buildRequest.abort();
      this.buildRequest = null;
    }
    if (this.partCategoriesRequest) {
      this.partCategoriesRequest.abort();
      this.partCategoriesRequest = null;
    }
  }

  render() {
    var parts = [];
    if (this.state.partCategories &&
        Object.keys(this.state.partCategories).length > 0 &&
        this.state.buildInfo &&
        Object.keys(this.state.buildInfo).length > 0) {
      var partCategories = Object.keys(this.state.buildInfo.config);
      partCategories.sort(function(a, b) { return this.state.partCategories.categories[a].order - this.state.partCategories.categories[b].order; }.bind(this));
      for (var i in partCategories) {
        var category = partCategories[i];
          parts.push((<Part id={this.state.buildInfo.config[category]} key={this.state.buildInfo.config[category]} model={this.state.partCategories.categories[category]}/>));
        }
    }
    return (<div>{parts}</div>);
  }
}
Build.propTypes = {
  repo: React.PropTypes.string,
  user: React.PropTypes.string
};
