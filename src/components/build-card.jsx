import React from "react";

import Router from "react-router";
var Link = Router.Link;

import Col from "react-bootstrap/lib/Col";
import Panel from "react-bootstrap/lib/Panel";
import Row from "react-bootstrap/lib/Row";

export default class BuildCard extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.context.router.transitionTo("build", {"user": this.props.build.user, "branch": this.props.build.branch });
  }

  render() {
    let build = this.props.build;
    return (
        <Panel className="build-card" onClick={ this.onClick }>
          <Link params={{"user": this.props.build.user, "branch": this.props.build.branch}} to="build">
          { (this.props.showUser ? build.user + "/" : "") + build.branch}</Link><small> {build.snippet}</small>
        </Panel>
      );
    }
}
BuildCard.propTypes = {
  build: React.PropTypes.object,
  showUser: React.PropTypes.bool
};
BuildCard.contextTypes = {
  router: React.PropTypes.func
};
