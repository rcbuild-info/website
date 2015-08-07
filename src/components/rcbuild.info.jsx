require("babelify/polyfill");

var React = require("react");
var Grid = require("react-bootstrap/lib/Grid");
var Row = require("react-bootstrap/lib/Row");
var Col = require("react-bootstrap/lib/Col");
var Navbar = require("react-bootstrap/lib/Navbar");
var CollapsibleNav = require("react-bootstrap/lib/CollapsibleNav");
var Nav = require("react-bootstrap/lib/Nav");
var NavItem = require("react-bootstrap/lib/NavItem");

import Router from "react-router";
var RouteHandler = Router.RouteHandler;
var Link = Router.Link;

import NavItemLink from "react-router-bootstrap/lib/NavItemLink";

import Cookies from "js-cookie";

import SiteActions from "../actions/site-actions";
import SiteStore from "../stores/site-store";

export default class RCBuildInfo extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.componentDidMount = this.componentDidMount.bind(this);
    this.componentWillUnmount = this.componentWillUnmount.bind(this);
    this.onChange = this.onChange.bind(this);
    this.state = SiteStore.getState();
  }

  componentDidMount() {
    SiteStore.listen(this.onChange);

    // Fire off initial events based on the url and cookie state.
    SiteActions.logInUser(Cookies.get("u"));
  }

  componentWillUnmount() {
    SiteStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(state);
  }

  onEditBuild() {
    SiteActions.editBuild();
  }

  render() {
    var github = "https://github.com/rcbuild-info/website";
    var pageNav;
    if (this.state.page === "build" || this.state.page === "editbuild") {
      let disableEdit = this.state.page === "editbuild" ||
                        !this.state.loggedInUser ||
                        this.state.loggedInUser !== this.state.primaryBuildVersion.user;
      pageNav = [(<NavItem disabled eventKey={1} key="compare">Compare</NavItem>),
                 (<NavItemLink disabled={ disableEdit } eventKey={2} key="edit" params={{"user": this.state.primaryBuildVersion.user,
                                                                                         "branch": this.state.primaryBuildVersion.branch}} to="editbuild">Edit</NavItemLink>)];
      github = "https://github.com/" + this.state.primaryBuildVersion.user + "/rcbuild.info-builds/tree/" + this.state.primaryBuildVersion.branch;
    } else if (this.state.page === "allparts" || this.state.page === "supportedparts") {
      github = "https://github.com/rcbuild-info/parts";
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
              <NavItemLink eventKey={13} to="createbuild">Create</NavItemLink>
              {pageNav}
              <NavItem eventKey={10} href={github}>GitHub</NavItem>
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
