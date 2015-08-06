import React from "react";

import Panel from "react-bootstrap/lib/Panel";

import BuildActions from "../actions/build-actions";

import Part from "./part";
import PartEntry from "./part-entry";

export default class BuildParts extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onPartChange = this.onPartChange.bind(this);
  }

  onPartChange(category, partIDs) {
    BuildActions.setBuildPart({"buildKey": this.props.buildKey,
                               "category": category,
                               "partIDs": partIDs});
  }

  render() {
    var parts = [];
    if (this.props.partStore.categories) {
      var partCategories = Object.keys(this.props.parts.config);
      partCategories.sort(function(a, b) { return this.props.partStore.categories[a].order - this.props.partStore.categories[b].order; }.bind(this));
      for (var i in partCategories) {
        var category = partCategories[i];
        var part;
        if (!this.props.editing) {
          part = (<Part key={category + "-" + this.props.parts.config[category]}
                        model={this.props.partStore.categories[category]}
                        partStore={this.props.partStore}
                        parts={this.props.parts.config[category]}/>);
        } else {
          let supportedPartsInCategory = {};
          if (this.props.partStore.supportedParts[category]) {
            supportedPartsInCategory = this.props.partStore.supportedParts[category];
          }
          part = (<PartEntry categoryID={category}
                             id={this.props.parts.config[category]}
                             key={category + "-" + this.props.parts.config[category]}
                             model={this.props.partStore.categories[category]}
                             onChange={this.onPartChange}
                             supportedParts={supportedPartsInCategory}
                             unsupportedParts={this.props.partStore.unsupportedParts}/>);
        }
        parts.push(part);
      }
    }

    return (<Panel className="build-parts" header="Parts"><div fill>{parts}</div></Panel>);
  }
}
BuildParts.propTypes = {
  buildKey: React.PropTypes.string,
  editing: React.PropTypes.bool.isRequired,
  ownerLoggedIn: React.PropTypes.bool,
  partStore: React.PropTypes.object,
  parts: React.PropTypes.object
};
