import React from "react";

import Router from "react-router";
var Link = Router.Link;

import Col from "react-bootstrap/lib/Col";
import Panel from "react-bootstrap/lib/Panel";
import Row from "react-bootstrap/lib/Row";

import ImgurThumb from "./imgur-thumb";
import YouTubeThumb from "./youtube-thumb";

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
    let thumb = null;
    if (build.thumb) {
      if (build.thumb.imgur) {
        thumb = (<ImgurThumb aspectRatio="16by9" imageId={build.thumb.imgur.imageId}/>);
      } else if (build.thumb.youtube) {
        thumb = (<YouTubeThumb videoId={build.thumb.youtube.videoId}/>);
      }
    }
    return (
        <Panel className="build-card" onClick={ this.onClick }>
          <Row fill>
            <Col className="thumb" md={4} xs={6}>{thumb}</Col>
            <Col className="snippet" md={8} xs={6}><Link params={{"user": this.props.build.user, "branch": this.props.build.branch}} to="build">
          { (this.props.showUser ? build.user + "/" : "") + build.branch}</Link><hr/>
          <small> {build.snippet}</small></Col>
          </Row>
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
