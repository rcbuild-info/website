import React from "react";

import Table from "react-bootstrap/lib/Table";

export default class PartList extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
  }

  static sortManufacturerIDs(a, b) {
    var aUnknown = a.startsWith("UnknownManufacturer");
    var bUnknown = b.startsWith("UnknownManufacturer");
    if ((aUnknown && bUnknown) || (!aUnknown && !bUnknown)) {
      if (a === b) {
        return 0;
      } else if (a < b) {
        return -1;
      } else {
        return 1;
      }
    } else if (aUnknown) {
      return 1;
    } else if (bUnknown) {
      return -1;
    }
  }

  render() {
    var parts = [];
    if (this.props.parts) {
      var manufacturerIDs = Object.keys(this.props.parts);
      manufacturerIDs.sort(PartList.sortManufacturerIDs);
      for (let manufacturerID of manufacturerIDs) {
        var partIDs = Object.keys(this.props.parts[manufacturerID]);
        partIDs.sort();
        for (let partID of partIDs) {
          var part = this.props.parts[manufacturerID][partID];
          var name;
          if (!manufacturerID.startsWith("UnknownManufacturer")) {
            name = part.manufacturer + " " + part.name;
          } else {
            name = part.name;
          }
          parts.push(
            (
              <tr key={manufacturerID + "/" + partID}>
                <td>{manufacturerID}/{partID}</td>
                <td>{ name }</td>
              </tr>
            ));
        }
      }
    }
    return (<Table>
              <thead>
                <tr>
                  <th>ID</th><th>Name</th>
                </tr>
              </thead>
              <tbody>
                {parts}
              </tbody>
            </Table>);
  }
}

PartList.propTypes = { parts:
  React.PropTypes.objectOf( // by manufacturerID
    React.PropTypes.objectOf( // by partID
      // TODO(tannewt): Create a proper Part class and have it match that.
      React.PropTypes.object))};
