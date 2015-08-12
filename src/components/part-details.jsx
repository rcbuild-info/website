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

  static trackOutboundLink(url, redirect) {
    ga("send", "event", "outbound", "click", url, {"hitCallback":
      function () {
        if (redirect) {
          document.location = url;
        }
      }
    });
  }

  onClick(url, event) {
    let redirect = !event.ctrlKey && !event.metaKey && event.nativeEvent.button === 0;
    PartDetails.trackOutboundLink(url, redirect);
    if (redirect) {
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        event.returnValue = !1;
      }
    }
  }

  render() {
    let content;
    if (!this.props.partInfo || Object.keys(this.props.partInfo).length === 0) {
      content = "Unknown part.";
    } else {
      content = [];
      for (let urlClass in this.props.partInfo.urls) {
        for (let i = 0; i < this.props.partInfo.urls[urlClass].length; i++) {
          let url = this.props.partInfo.urls[urlClass][i];
          let site = PartDetails.getSite(url);
          content.push((<li key={url}><a className={urlClass} href={url} onClick={ this.onClick.bind(this, url) }>{site}</a></li>));
        }
      }
    }
    return (<Row className="row-eq-height links"><Col className="category" xs={4}/><Col xs={8}><ul>{content}</ul></Col></Row>);
  }
}
PartDetails.propTypes = {
  partInfo: React.PropTypes.object
};
