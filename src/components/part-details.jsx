import React from "react";

import Row from "react-bootstrap/lib/Row";
import Col from "react-bootstrap/lib/Col";

export default class PartDetails extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
  }

  static getSite(url) {
    var parser = document.createElement("a");
    parser.href = url;
    return parser.hostname.replace("www.", "");
  }

  static trackOutboundLink(url) {
     ga("send", "event", "outbound", "click", url, {"hitCallback":
       function () {
         document.location = url;
       }
     });
  }

  static onClick(url, event) {
    PartDetails.trackOutboundLink(url);
    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = !1;
    }
  }

  render() {
    if (!this.props.partInfo || Object.keys(this.props.partInfo).length === 0) {
      return <div>Unknown part.</div>;
    }
    var buttons = [];
    for (let urlClass in this.props.partInfo.urls) {
      for (let i = 0; i < this.props.partInfo.urls[urlClass].length; i++) {
        let url = this.props.partInfo.urls[urlClass][i];
        let site = PartDetails.getSite(url);
        buttons.push((<li key={url}><a className={urlClass} href={url} onClick={ PartDetails.onClick.bind(url) }>{site}</a></li>));
      }
    }
    return (<Row className="row-eq-height links"><Col className="category" xs={4}/><Col xs={8}><ul>{buttons}</ul></Col></Row>);
  }
}
PartDetails.propTypes = {
  partInfo: React.PropTypes.object
};
