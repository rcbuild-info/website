import React from "react";
import request from "superagent";
import Panel from "react-bootstrap/lib/Panel";

import PartList from "./part-list";

export default class SupportedParts extends React.Component {
  constructor() {
    super();
    this.componentDidMount = this.componentDidMount.bind(this);
    this.render = this.render.bind(this);
    this.state = {
      partCategories: null,
      parts: null
    };
    this.partIndexRequest = null;
    this.partCategoriesRequest = null;
  }

  componentDidMount() {
    this.partIndexRequest =
      request.get("/partIndex/by/category.json")
             .end(function(err, res){
               this.partIndexRequest = null;
               if (!err && res.ok) {
                  this.setState({
                    parts: JSON.parse(res.text)
                  });
                }
             }.bind(this));
    this.partCategoriesRequest =
      request.get("/partCategories.json")
             .end(function(err, res) {
               this.partCategoriesRequest = null;
               if (!err && res.ok) {
                  this.setState({
                    partCategories: JSON.parse(res.text)
                  });
              }
            }.bind(this));
  }

  componentWillUnmount() {
    if (this.partIndexRequest) {
      this.partIndexRequest.abort();
      this.partIndexRequest = null;
    }
    if (this.partCategoriesRequest) {
      this.partCategoriesRequest.abort();
      this.partCategoriesRequest = null;
    }
  }

  render() {
    if (!this.state.parts || !this.state.partCategories) {
      return <div/>;
    }
    var categories = [];
    var partCategories = Object.keys(this.state.partCategories.categories);
    partCategories.sort(function(a, b) { return this.state.partCategories.categories[a].order - this.state.partCategories.categories[b].order; }.bind(this));
    for (var i in partCategories) {
      var category = partCategories[i];
      categories.push(
        (<Panel header={this.state.partCategories.categories[category].name + " (" + category + ")"} key={category}>
           <PartList fill parts={this.state.parts[category]}/>
         </Panel>));
    }
    return <div>{ categories }</div>;
  }
}
