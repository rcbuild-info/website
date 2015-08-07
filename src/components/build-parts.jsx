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
    BuildActions.setBuildPart({"category": category,
                               "partIDs": partIDs});
  }

  render() {
    var parts = [];
    if (this.props.partStore.categories && this.props.primaryParts) {
      var partCategories = Object.keys(this.props.primaryParts.config);
      partCategories.sort(function(a, b) { return this.props.partStore.categories[a].order - this.props.partStore.categories[b].order; }.bind(this));
      for (var i in partCategories) {
        var category = partCategories[i];
        var part;
        if (!this.props.editing) {
          let secondaryParts;
          if (this.props.secondaryParts) {
            secondaryParts = this.props.secondaryParts.config[category];
          }
          part = (<Part key={category + "-" + this.props.primaryParts.config[category]}
                        model={this.props.partStore.categories[category]}
                        partStore={this.props.partStore}
                        primaryParts={this.props.primaryParts.config[category]}
                        secondaryParts={ secondaryParts }/>);
        } else {
          let supportedPartsInCategory = {};
          if (this.props.partStore.supportedParts[category]) {
            supportedPartsInCategory = this.props.partStore.supportedParts[category];
          }
          part = (<PartEntry categoryID={category}
                             id={this.props.primaryParts.config[category]}
                             key={category + "-" + this.props.primaryParts.config[category]}
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
  editing: React.PropTypes.bool.isRequired,
  ownerLoggedIn: React.PropTypes.bool,
  partStore: React.PropTypes.object,
  primaryParts: React.PropTypes.object,
  secondaryParts: React.PropTypes.object
};
