import React from "react";
import request from "superagent";
import stringify from "json-stable-stringify";

import Alert from "react-bootstrap/lib/Alert";
import Button from "react-bootstrap/lib/Button";
import Panel from "react-bootstrap/lib/Panel";

import Part from "./part";
import PartEntry from "./part-entry";

export default class BuildParts extends React.Component {
  constructor() {
    super();
    this.componentDidMount = this.componentDidMount.bind(this);
    this.render = this.render.bind(this);
    this.onPartChange = this.onPartChange.bind(this);
    this.onSave = this.onSave.bind(this);
    this.onEdit = this.onEdit.bind(this);
    this.onShareDismiss = this.onShareDismiss.bind(this);
    this.state = {
      buildInfo: {},
      partCategories: {},
      editing: false,
      supportedParts: {},
      saving: false,
      share: false
    };
    this.buildInfoDirty = false;
    this.partCategoriesRequest = null;
    this.supportedPartsRequest = null;
    this.unsupportedPartsRequest = null;
    this.saveRequest = null;
  }

  // componentWillMount before first render
  componentWillMount() {
    this.setState({
      editing: this.props.buildInfo.config.frame === "" && this.props.user === this.props.loggedInUser,
      buildInfo: this.props.buildInfo
    });
  }

  componentDidMount() {
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
    if (this.state.editing) {
      this.fetchPartIndices();
    }
  }

  // componentWillReceiveProps called when new props are set

  componentDidUpdate() {
    if (this.state.editing) {
      this.fetchPartIndices();
    }
  }

  componentWillUnmount() {
    if (this.partCategoriesRequest) {
      this.partCategoriesRequest.abort();
      this.partCategoriesRequest = null;
    }
    if (this.supportedPartsRequest) {
      this.supportedPartsRequest.abort();
      this.supportedPartsRequest = null;
    }
    if (this.unsupportedPartsRequest) {
      this.unsupportedPartsRequest.abort();
      this.unsupportedPartsRequest = null;
    }
  }

  fetchPartIndices() {
    if (this.supportedPartsRequest ||
        Object.keys(this.state.supportedParts).length > 0) {
      return;
    }
    this.supportedPartsRequest =
      request.get("/partIndex/by/category.json")
             .end(function(err, res){
                this.supportedPartsRequest = null;
                if (!err && res.ok) {
                  let parts = JSON.parse(res.text);
                  for(let category of Object.keys(parts)) {
                    BuildParts.expandParts(parts[category]);
                  }
                  this.setState({
                    supportedParts: parts
                  });
                }
                this.unsupportedPartsRequest =
                  request.get("/partIndex/by/id.json")
                         .end(function(err2, res2){
                           this.unsupportedPartsRequest = null;
                           if (!err2 && res2.ok) {
                            let unsupportedParts = JSON.parse(res2.text);
                            BuildParts.filterOutSupportedParts(unsupportedParts);
                            BuildParts.expandParts(unsupportedParts);
                            this.setState({
                              unsupportedParts: unsupportedParts
                            });
                          }
                        }.bind(this));
              }.bind(this));
  }

  static expandParts(parts) {
    for (let manufacturerID of Object.keys(parts)) {
      for (let partID of Object.keys(parts[manufacturerID])) {
        let part = parts[manufacturerID][partID];
        part.fullName = part.manufacturer + " " + part.name;
        part.id = manufacturerID + "/" + partID;
      }
    }
  }

  static filterOutSupportedParts(parts) {
    for (let manufacturerID of Object.keys(parts)) {
      for (let partID of Object.keys(parts[manufacturerID])) {
        let part = parts[manufacturerID][partID];
        if (part.category !== "") {
          delete parts[manufacturerID][partID];
        }
      }
    }
  }

  onPartChange(category, partIDs) {
    var newBuildInfo = this.state.buildInfo;
    newBuildInfo.config[category] = partIDs;
    this.setState({
      buildInfo: newBuildInfo
    });
    this.buildInfoDirty = true;
  }

  onSave() {
    if (this.buildInfoDirty) {
      let newBuild = stringify(this.state.buildInfo,
        {cmp: function(a, b) {
          if (!this.state.partCategories.categories[a.key]) {
            return a.key.localeCompare(b.key);
          }
          return this.state.partCategories.categories[a.key].order - this.state.partCategories.categories[b.key].order;
         }.bind(this),
         space: 2});
      this.setState({
        saving: true
      });
      this.saveRequest =
        request.post("/build/" + this.props.user + "/" + this.props.branch + ".json")
               .set("Content-Type", "application/json")
               .send(newBuild)
               .end(function(err2, res2){
                 this.saveRequest = null;
                 if (!err2 && res2.ok) {
                   this.buildInfoDirty = false;
                   this.setState({
                     editing: false,
                     saving: false,
                     share: true
                   });
                }
               }.bind(this));
    }
    this.setState({
      editing: false
    });
  }

  onEdit() {
    this.setState({
      editing: true
    });
  }

  onShareDismiss() {
    this.setState({
      share: false
    });
  }

  render() {
    var parts = [];
    if (this.state.partCategories &&
        Object.keys(this.state.partCategories).length) {
      var partCategories = Object.keys(this.state.buildInfo.config);
      partCategories.sort(function(a, b) { return this.state.partCategories.categories[a].order - this.state.partCategories.categories[b].order; }.bind(this));
      for (var i in partCategories) {
        var category = partCategories[i];
        var part;
        if (!this.state.editing) {
          part = (<Part id={this.state.buildInfo.config[category]}
                        key={category + "-" + this.state.buildInfo.config[category]}
                        model={this.state.partCategories.categories[category]}/>);
        } else {
          let supportedPartsInCategory = {};
          if (this.state.supportedParts[category]) {
            supportedPartsInCategory = this.state.supportedParts[category];
          }
          part = (<PartEntry categoryID={category}
                             id={this.state.buildInfo.config[category]}
                             key={category + "-" + this.state.buildInfo.config[category]}
                             model={this.state.partCategories.categories[category]}
                             onChange={this.onPartChange}
                             supportedParts={supportedPartsInCategory}
                             unsupportedParts={this.state.unsupportedParts}/>);
        }
        parts.push(part);
      }
    }
    var buttons;
    if (this.state.editing) {
      buttons = <Button bsSize="xsmall" onClick={this.onSave}>Done</Button>;
    } else {
      buttons = <Button bsSize="xsmall" disabled={this.props.user !== this.props.loggedInUser} onClick={this.onEdit}>Edit</Button>;
    }
    var header = <div>Build{buttons}</div>;
    var alert = null;
    if (this.state.saving) {
      alert = (<Alert bsStyle="info" fill><strong>Saving</strong> Hold on, your build is saving.</Alert>);
    } else if (this.state.share) {
      alert = (<Alert bsStyle="success" fill onDismiss={this.onShareDismiss}><strong>Share!</strong> Your build is saved. Copy <a href={window.location}>the link</a> to share anywhere.</Alert>);
    }
    return (<Panel className="build-parts" header={header}><div fill>{alert}<div fill>{parts}</div></div></Panel>);
  }
}
BuildParts.propTypes = {
  branch: React.PropTypes.string,
  buildInfo: React.PropTypes.object,
  loggedInUser: React.PropTypes.string,
  user: React.PropTypes.string
};
