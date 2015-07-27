import React from "react";
import request from "superagent";

import Button from "react-bootstrap/lib/Button";
import Row from "react-bootstrap/lib/Row";
import Col from "react-bootstrap/lib/Col";
import Panel from "react-bootstrap/lib/Panel";

import BuildParts from "./build-parts";
import BuildSettings from "./build-settings";

export default class BuildPage extends React.Component {
  constructor() {
    super();
    this.componentDidMount = this.componentDidMount.bind(this);
    this.render = this.render.bind(this);
    this.onBuildLoaded = this.onBuildLoaded.bind(this);
    this.onCreateBuild = this.onCreateBuild.bind(this);
    this.onCreateBuildResponse = this.onCreateBuildResponse.bind(this);
    this.loadBuild = this.loadBuild.bind(this);
    this.state = {
      buildInfo: {},
      status: "loading"
    };
    this.buildRequest = null;
    this.createRequest = null;
  }

  componentDidMount() {
    this.loadBuild();
  }

  componentWillUnmount() {
    if (this.buildRequest) {
      this.buildRequest.abort();
      this.buildRequest = null;
    }
    if (this.createRequest) {
      this.createRequest.abort();
      this.createRequest = null;
    }
  }

  loadBuild() {
    this.buildRequest =
      request.get("/build/" + this.props.user + "/" + this.props.branch + ".json")
             .end(this.onBuildLoaded);
  }

  onBuildLoaded(err, res) {
    this.buildRequest = null;
    if (!err && res.ok) {
      this.setState({
       buildInfo: JSON.parse(res.text),
       status: "exists"
      });
    } else if (res.status === 404) {
      this.setState({
       status: "DNE"
      });
    }
  }

  onCreateBuildResponse(err, res) {
    if (!err && res.ok) {
      this.loadBuild();
    }
  }

  onCreateBuild() {
    this.createRequest =
      request.post("/build/" + this.props.user + "/" + this.props.branch + ".json")
             .end(this.onCreateBuildResponse);
  }

  render() {
    if (this.state.status === "loading") {
      return <div/>;
    } else if (this.state.status === "exists") {
      return (<Row>
                <Col md={6}>
                  <BuildParts branch={this.props.branch} buildInfo={this.state.buildInfo} fill loggedInUser={this.props.loggedInUser} user={this.props.user}/>
                </Col>
                <Col md={6}>
                  <BuildSettings branch={this.props.branch} loggedInUser={this.props.loggedInUser} user={this.props.user}/>
                </Col>
              </Row>);
    } else if (this.state.status === "DNE") {
      if (this.props.user === this.props.loggedInUser) {
        return (<Row>
                  <Col md={12}>
                    <Panel>
                      Are you sure you want to create a build called "{ this.props.branch }"?<hr/>
                      <Button bsStyle="success" onClick={ this.onCreateBuild }>Yes</Button>
                      &nbsp;
                      <Button bsStyle="danger" href="/createbuild">No</Button>
                    </Panel>
                  </Col>
                </Row>);
      } else {
        return (<Row>
                  <Col md={12}>
                    <Panel header="Oops!">
                      It looks like this build does not exist!
                    </Panel>
                  </Col>
                </Row>);
      }
    }
  }
}
BuildPage.propTypes = {
  branch: React.PropTypes.string,
  loggedInUser: React.PropTypes.string,
  user: React.PropTypes.string
};
