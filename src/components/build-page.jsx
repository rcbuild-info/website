import React from "react";

import Alert from "react-bootstrap/lib/Alert";
import ButtonGroup from "react-bootstrap/lib/ButtonGroup";
import Button from "react-bootstrap/lib/Button";
import Row from "react-bootstrap/lib/Row";
import Col from "react-bootstrap/lib/Col";
import Panel from "react-bootstrap/lib/Panel";

import BuildActions from "../actions/build-actions";
import BuildParts from "./build-parts";
import SiteActions from "../actions/site-actions";
import FlightControllerSettings from "./fc-settings";

export default class BuildPage extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onCreateBuild = this.onCreateBuild.bind(this);
    this.onShareDismiss = this.onShareDismiss.bind(this);
    this.state = {"share": false};
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.primaryBuild && nextProps.primaryBuild.state === "saving") {
      this.setState({"share": true});
    }
  }

  onCreateBuild() {
    BuildActions.createBuild(this.props.primaryBuildVersion);
  }

  onSaveBuild() {
    BuildActions.saveBuild();
  }

  onDiscardChanges() {
    SiteActions.discardBuild();
  }

  onShareDismiss() {
    this.setState({"share": false});
  }

  render() {
    if (this.props.primaryBuild === undefined) {
      return null;
    }

    if (this.props.primaryBuild.state === "exists" ||
        this.props.primaryBuild.state === "unsaved" ||
        this.props.primaryBuild.state === "saving") {
      let banner = null;

      if (this.props.editing) {
        banner = (<Row><Col md={6}>
                      <Panel>
                        <ButtonGroup fill justified>
                          <Button bsStyle="success"
                                  disabled={this.props.primaryBuild.state !== "unsaved"}
                                  href="#"
                                  onClick={this.onSaveBuild}>Save changes</Button>
                          <Button bsStyle="danger" href="#" onClick={this.onDiscardChanges}>Discard Changes</Button>
                        </ButtonGroup>
                      </Panel>
                    </Col>
                    </Row>);
      } else if (this.props.primaryBuild.state === "saving") {
        banner = (<Row><Col md={12}><Alert bsStyle="info" fill><strong>Saving</strong> Hold on, your build is saving.</Alert>
                  </Col>
                  </Row>);
      } else if (this.props.primaryBuild.state === "save-failed") {
        banner = (<Row><Col md={12}><Alert bsStyle="danger" fill><strong>Save failed!</strong> This is currently unhandled. :-(</Alert>
                  </Col>
                  </Row>);
      } else if (this.state.share) {
          banner = (<Row><Col md={12}><Alert bsStyle="success" fill onDismiss={this.onShareDismiss}><strong>Saved!</strong> Your build is saved. <a href={window.location}>Link here</a> to share this build!</Alert>
        </Col>
        </Row>);
      }
      return (<div>{banner}
          <Row>

                <Col md={6}>
                  <BuildParts editing={this.props.editing} fill
                              ownerLoggedIn={this.props.ownerLoggedIn}
                              partStore={this.props.partStore}
                              parts={this.props.primaryBuild.parts}/>
                </Col>
                <Col md={6}>
                  <FlightControllerSettings editing={this.props.editing}
                                            primarySettings={this.props.primaryBuild.settings.fc}/>
                </Col>
              </Row>
                {banner}</div>);
    } else if (this.props.primaryBuild.state === "does-not-exist") {
      if (this.props.ownerLoggedIn) {
        return (<Row>
                  <Col md={12}>
                    <Panel>
                      Are you sure you want to create a build called "{ this.props.primaryBuildVersion.branch }"?<hr/>
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
    console.log("didn't render anything!");
    return null;
  }
}
BuildPage.propTypes = {
  editing: React.PropTypes.bool.isRequired,
  ownerLoggedIn: React.PropTypes.bool.isRequired,
  partStore: React.PropTypes.object,
  primaryBuild: React.PropTypes.object, // This is a wrapper object which includes status, parts and settings.
  primaryBuildVersion: React.PropTypes.object
};
