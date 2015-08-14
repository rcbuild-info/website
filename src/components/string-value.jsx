import React from "react";

export default class StringValue extends React.Component {
  constructor(props) {
    super();
    this.render = this.render.bind(this);
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
    if (this.props.primaryValue === undefined) {
      return null;
    }
    let p = this.props.primaryValue;
    let s = this.props.secondaryValue;
    if (this.props.getUrl) {
      let pUrl = this.props.getUrl(this.props.primaryValue);
      let sUrl = this.props.getUrl(this.props.secondaryValue);
      p = <a href={pUrl} onClick={ this.onClick.bind(this, pUrl) }>{p}</a>;
      s = <a href={sUrl} onClick={ this.onClick.bind(this, sUrl) }>{s}</a>;
    }
    if (!this.props.secondaryValue || this.props.secondaryValue === this.props.primaryValue) {
      return <span>{p}</span>;
    }
    return (
        <div className="value">
          <span className="diff-gone">{p}</span>&nbsp;
          <span className="diff-new">{s}</span>
        </div>
      );
    }
}
StringValue.propTypes = {
  getUrl: React.PropTypes.func,
  primaryValue: React.PropTypes.string,
  secondaryValue: React.PropTypes.string
};
