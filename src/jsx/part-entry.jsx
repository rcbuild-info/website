import React from "react";

import Row from "react-bootstrap/lib/Row";
import Col from "react-bootstrap/lib/Col";

import Autosuggest from "react-autosuggest";

export default class PartEntry extends React.Component {
  constructor() {
    super();
    this.getSuggestions = this.getSuggestions.bind(this);
    this.onSuggestionSelected = this.onSuggestionSelected.bind(this);
    this.initialValues = [];
  }

  suggestionRenderer(suggestion) { // also gets input
    return suggestion.name;
  }

  suggestionValue(suggestion) {
    return suggestion.manufacturer + " " + suggestion.name;
  }

  newIdHelper(idIndex, id) {
    if (Array.isArray(this.props.id)) {
      let newIds = this.props.id;
      if (idIndex === newIds.length && id !== "") {
        newIds.push(id);
      } else if (id === "") {
        newIds.splice(idIndex, 1);
      } else {
        newIds[idIndex] = id;
      }
      this.props.onChange(this.props.categoryID, newIds);
    } else {
      this.props.onChange(this.props.categoryID, id);
    }
  }

  onSuggestionSelected(idIndex, suggestion) {
    this.newIdHelper(idIndex, suggestion.id);
  }

  onBlur(idIndex, event) {
    var newValue = event.target.value.trim();
    if (newValue !== this.initialValues[idIndex]) {
      this.newIdHelper(idIndex, newValue);
    }
    event.stopPropagation();
  }

  static sortByPartName(a, b) {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    }
    return 0;
  }

  static sortByGroupName(a, b) {
    if (a.sectionName < b.sectionName) {
      return -1;
    } else if (a.sectionName > b.sectionName) {
      return 1;
    }
    return 0;
  }

  getSuggestionsHelper(parts, input, regex) {
    var suggestions = [];
    for (let manufacturerID of Object.keys(parts)) {
      let group = {sectionName: null, suggestions: []};
      for (let partID of Object.keys(parts[manufacturerID])) {
        let part = parts[manufacturerID][partID];
        if (input.length === 0 || regex.test(part.fullName)) {
          if (group.sectionName === null) {
            group.sectionName = part.manufacturer;
          }
          group.suggestions.push(part);
        }
      }
      if (group.sectionName) {
        group.suggestions.sort(PartEntry.sortByPartName);
        suggestions.push(group);
      }
    }
    suggestions.sort(PartEntry.sortByGroupName);
    return suggestions;
  }

  getSuggestions(input, callback) {
    const regex = new RegExp(input, "i");
    var supportedSuggestions;
    if (this.props.supportedParts) {
      supportedSuggestions = this.getSuggestionsHelper(this.props.supportedParts, input, regex);
      callback(null, supportedSuggestions);
    }
    if (this.props.unsupportedParts &&
        (input.length >= 4 || supportedSuggestions.length === 0)) {
      let unsupportedSuggestions = this.getSuggestionsHelper(this.props.unsupportedParts, input, regex);
      callback(null, supportedSuggestions.concat(unsupportedSuggestions));
    }
  }

  // Determines when to show suggestions.
  showWhen() {
    return true;
  }

  // TODO(tannewt): use shouldComponentupdate to prevent render when
  // this.props.supportedParts is updated.

  getInputForId(idIndex) {
    var inputAttributes = {
      placeholder: "Enter " + this.props.model.name,
      onBlur: this.onBlur.bind(this, idIndex)
    };
    var id = this.props.id;
    if (Array.isArray(id)) {
      if (idIndex < id.length) {
        id = id[idIndex];
      } else {
        id = "";
      }
    }
    if (id.length > 0) {
      inputAttributes.value = id;
      if (id.indexOf("/") > -1) {
        let split = id.split("/", 2);
        let manufacturerID = split[0];
        let partID = split[1];
        if (this.props.supportedParts &&
            this.props.supportedParts[manufacturerID] &&
            this.props.supportedParts[manufacturerID][partID]) {
          inputAttributes.value = this.props.supportedParts[manufacturerID][partID].fullName;
        } else if (this.props.unsupportedParts &&
                   this.props.unsupportedParts[manufacturerID] &&
                   this.props.unsupportedParts[manufacturerID][partID]) {
          inputAttributes.value = this.props.unsupportedParts[manufacturerID][partID].fullName;
        }
      }
      this.initialValues.push(inputAttributes.value);
    } else {
      this.initialValues.push("");
    }

    return (<Autosuggest id={this.props.model.name + idIndex}
                         inputAttributes={inputAttributes}
                         key={this.props.model.name + idIndex + inputAttributes.value}
                         onSuggestionSelected={this.onSuggestionSelected.bind(this, idIndex)}
                         showWhen={this.showWhen}
                         suggestionRenderer={this.suggestionRenderer}
                         suggestionValue={this.suggestionValue}
                         suggestions={this.getSuggestions}/>);
  }

  render() {
    var ids = [];
    if (Array.isArray(this.props.id)) {
      ids = this.props.id;
    }
    var entries = [];
    this.initialValues = [];
    for (let i = 0; i < ids.length; i++) {
      entries.push(this.getInputForId(i));
    }
    entries.push(this.getInputForId(ids.length));
    return (<div className="partEntry">
              <Row>
                <Col className="category" xs={4}>{this.props.model.name}</Col>
                <Col className="name" xs={8}>
                  {entries}
                </Col>
              </Row>
            </div>);
  }
}
PartEntry.propTypes = {
  categoryID: React.PropTypes.string,
  id: React.PropTypes.oneOfType([React.PropTypes.string,
                                 React.PropTypes.array]).isRequired,
  model: React.PropTypes.shape({
    name: React.PropTypes.string
  }),
  onChange: React.PropTypes.func,
  supportedParts: React.PropTypes.object,
  unsupportedParts: React.PropTypes.object
};
