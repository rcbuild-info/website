require("babelify/polyfill");

var React = require("react");
var DropdownButton = require("react-bootstrap/lib/DropdownButton");
var Grid = require("react-bootstrap/lib/Grid");
var Row = require("react-bootstrap/lib/Row");
var Col = require("react-bootstrap/lib/Col");
var MenuItem = require("react-bootstrap/lib/MenuItem");
var Navbar = require("react-bootstrap/lib/Navbar");
var CollapsibleNav = require("react-bootstrap/lib/CollapsibleNav");
var Nav = require("react-bootstrap/lib/Nav");
var NavItem = require("react-bootstrap/lib/NavItem");

import Router from "react-router";
var RouteHandler = Router.RouteHandler;
var Link = Router.Link;

import MenuItemLink from "react-router-bootstrap/lib/MenuItemLink";
import NavItemLink from "react-router-bootstrap/lib/NavItemLink";

import Cookies from "js-cookie";

import SiteActions from "../actions/site-actions";
import BuildStore from "../stores/build-store";
import SiteStore from "../stores/site-store";

export default class RCBuildInfo extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.componentDidMount = this.componentDidMount.bind(this);
    this.componentWillUnmount = this.componentWillUnmount.bind(this);
    this.onBuildChange = this.onBuildChange.bind(this);
    this.onSiteChange = this.onSiteChange.bind(this);
    this.state = SiteStore.getState();
  }

  componentDidMount() {
    SiteStore.listen(this.onSiteChange);
    BuildStore.listen(this.onBuildChange);

    // Fire off initial events based on the url and cookie state.
    SiteActions.logInUser(Cookies.get("u"));
  }

  componentWillUnmount() {
    SiteStore.unlisten(this.onSiteChange);
    BuildStore.unlisten(this.onBuildChange);
  }

  onSiteChange(state) {
    this.setState(state);
  }

  onBuildChange(state) {
    let similar;
    if (state.primaryBuildVersion && state.builds[state.primaryBuildVersion.key]) {
      similar = state.builds[state.primaryBuildVersion.key].similar;
    }
    this.setState({"primaryBuildVersion": state.primaryBuildVersion,
                   "similarBuilds": similar});
  }

  onEditBuild() {
    BuildActions.editBuild();
  }

  render() {
    let disableEdit = !this.state.loggedInUser ||
                      this.state.page === "createbuild" ||
                      !this.state.primaryBuildVersion ||
                      this.state.loggedInUser !== this.state.primaryBuildVersion.user;

    let similar = [];
    if (this.state.similarBuilds) {
      if ("yours" in this.state.similarBuilds) {
        similar.push(<MenuItem header key="mine">Mine</MenuItem>);
        for (let build of this.state.similarBuilds.yours) {
          similar.push(<MenuItemLink key={ build.user + "/" + build.branch }
                                     params={{"primaryUser": this.state.primaryBuildVersion.user,
                                              "primaryBranch": this.state.primaryBuildVersion.branch,
                                              "secondaryUser": build.user,
                                              "secondaryBranch": build.branch}}
                                     to="compare">{ build.branch }</MenuItemLink>);
        }
        similar.push(<MenuItem divider key="d"/>);
        similar.push(<MenuItem header key="others">Others'</MenuItem>);
      }
      for (let build of this.state.similarBuilds.others) {
        similar.push(<MenuItemLink key={ build.user + "/" + build.branch }
                                   params={{"primaryUser": this.state.primaryBuildVersion.user,
                                            "primaryBranch": this.state.primaryBuildVersion.branch,
                                            "secondaryUser": build.user,
                                            "secondaryBranch": build.branch}}
                                   to="compare">{ build.user + "/" + build.branch }</MenuItemLink>);
      }
    }

    var logo = <Link to="home"><img src="/static/logo.svg"/></Link>;
    var login = <NavItem eventKey={11} href={"/login?next=" + window.location.href}>Login with GitHub</NavItem>;
    if (this.state.loggedInUser) {
      login = <NavItem eventKey={11} href={"/logout?next=" + window.location.href}>Logout</NavItem>;
    }

    return (
      <div id="appContainer">
        <Navbar brand={logo} toggleNavKey={0}>
          <CollapsibleNav eventKey={0}> {/* This is the eventKey referenced */}
            <Nav navbar right>
              <NavItemLink eventKey={14} params={ {"page": 1}} to="builds">Find</NavItemLink>
              <NavItemLink eventKey={13} to="createbuild">Create</NavItemLink>
              <DropdownButton disabled={similar.length === 0} eventKey={1} key="compare" title="Compare">
                {similar}
              </DropdownButton>
              <NavItemLink
                disabled={ disableEdit }
                eventKey={2}
                key="edit"
                params={{"user": disableEdit ? "" : this.state.primaryBuildVersion.user,
                         "branch": disableEdit ? "" : this.state.primaryBuildVersion.branch}}
                to="editbuild">Edit</NavItemLink>
              {login}
            </Nav>
          </CollapsibleNav>
        </Navbar>
        <Grid>
          <Row>
            <Col xs={12}>
              <RouteHandler loggedInUser={this.state.loggedInUser}/>
            </Col>
          </Row>
          <hr/>
          <Row>
            <Col xs={12}>
              Site by <a href="http://tannewt.org">tannewt</a>. Code on <a href="https://github.com/rcbuild-info/website">GitHub</a>. <span className="disclaimer">RCBuild.Info is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to amazon.com.</span>
            </Col>
          </Row>
        </Grid>
      </div>
    );
  }
}
