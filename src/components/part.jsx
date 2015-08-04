import React from "react";
import Row from "react-bootstrap/lib/Row";
import Col from "react-bootstrap/lib/Col";
import Collapse from "react-bootstrap/lib/Collapse";

import PartDetails from "./part-details";

export default class Part extends React.Component {
  constructor(props) {
    super();
    let parts = props.parts;
    if (!Array.isArray(parts)) {
      parts = [parts];
    }
    let expanded = {};
    for (let part of parts) {
      expanded[part] = false;
    }
    this.state = {
      expanded: expanded
    };
  }

  onHandleToggle(partID, e) {
    ga("send", "event", "part", "toggle", partID);
    e.preventDefault();
    let expanded = this.state.expanded;
    expanded[partID] = !expanded[partID];
    this.setState({expanded: expanded});
  }

  render() {
    let parts = this.props.parts;
    if (!Array.isArray(parts)) {
      parts = [parts];
    }
    var partRows = [];
    for (let part of parts) {
      var unknown = "";
      if (part.unknown) {
        unknown = (<a className="unknown" href="https://github.com/rcbuild-info/part-skeleton" target="_blank" title="This part is unknown. Click for more information on how to add it." >?</a>);
      }
      var partInfo = (<Col className="name" xs={8}>{part}{unknown}</Col>);
      let partDetails = null;
      if (this.props.partStore.parts &&
          this.props.partStore.parts[part]) {
        partDetails = this.props.partStore.parts[part];
        partInfo = (<Col className="name" xs={8}>{partDetails.manufacturer} {partDetails.name}</Col>);
      }
      partRows.push(<div key={part}>
                      <Row onClick={this.onHandleToggle.bind(this, part)} ref={part}>
                        <Col className="category" xs={4}>{this.props.model.name}</Col>
                        {partInfo}
                      </Row>
                      <Collapse in={this.state.expanded[part]}>
                        <div><PartDetails partInfo={partDetails}/></div>
                      </Collapse>
                    </div>);
    }
    return (<div className="part">{partRows}</div>);
  }
}
Part.propTypes = {
  model: React.PropTypes.shape({
    name: React.PropTypes.string
  }),
  partStore: React.PropTypes.object,
  parts: React.PropTypes.oneOfType([React.PropTypes.string,
                                    React.PropTypes.array]).isRequired
};
