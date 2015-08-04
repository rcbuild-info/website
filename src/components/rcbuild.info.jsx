require("babelify/polyfill");

var React = require("react");
var Grid = require("react-bootstrap/lib/Grid");
var Row = require("react-bootstrap/lib/Row");
var Col = require("react-bootstrap/lib/Col");
var Navbar = require("react-bootstrap/lib/Navbar");
var CollapsibleNav = require("react-bootstrap/lib/CollapsibleNav");
var Nav = require("react-bootstrap/lib/Nav");
var NavItem = require("react-bootstrap/lib/NavItem");
var Jumbotron = require("react-bootstrap/lib/Jumbotron");
var Button = require("react-bootstrap/lib/Button");

import AllParts from "./all-parts";
import BuildPage from "./build-page";
import BuildList from "./build-list";
import CreateBuildPage from "./create-build-page";
import SupportedParts from "./supported-parts";

import Cookies from "js-cookie";

import SiteActions from "../actions/site-actions";
import BuildStore from "../stores/build-store";
import PartStore from "../stores/part-store";
import SiteStore from "../stores/site-store";

export default class RCBuildInfo extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.componentDidMount = this.componentDidMount.bind(this);
    this.componentWillUnmount = this.componentWillUnmount.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onBuildChange = this.onBuildChange.bind(this);
    this.onPartChange = this.onPartChange.bind(this);
    this.state = {"site": SiteStore.getState(),
                  "builds": BuildStore.getState().builds};
  }

  componentDidMount() {
    SiteStore.listen(this.onChange);
    BuildStore.listen(this.onBuildChange);
    PartStore.listen(this.onPartChange);

    // Fire off initial events based on the url and cookie state.
    SiteActions.logInUser(Cookies.get("u"));

    var urlparts = window.location.pathname.split("/");
    var page = urlparts[1];

    if (page === "build") {
      let user = urlparts[2];
      let branch = urlparts[3];
      let primaryBuild = {"user": user, "branch": branch,
                          "key": user + "/" + branch + "@HEAD"};
      SiteActions.navigateToPage({"page": page,
                                  "primaryBuild": primaryBuild,
                                  "editingBuild": true});
    } else if (this.page === "parts") {
      SiteActions.navigateToPage({"page": page, "partClassification": urlparts[2]});
    } else {
      SiteActions.navigateToPage({"page": page});
    }
  }

  componentWillUnmount() {
    BuildStore.unlisten(this.onBuildChange);
    SiteStore.unlisten(this.onChange);
    PartStore.unlisten(this.onPartChange);
  }

  onChange(state) {
    this.setState({"site": state});
  }

  onBuildChange(state) {
    this.setState({"builds": state.builds});
  }

  onPartChange(state) {
    this.setState({"part": state});
  }

  onEditBuild() {
    SiteActions.editBuild();
  }

  render() {
    var content;
    var github;
    var pageNav;
    if (this.state.site.page === "build") {
      pageNav = [(<NavItem disabled eventKey={1} key="compare">Compare</NavItem>),
                 (<NavItem disabled={ this.state.site.editingBuild } eventKey={2} key="edit" onClick={this.onEditBuild}>Edit</NavItem>)];
      content = (<BuildPage editing={this.state.site.editingBuild}
                            ownerLoggedIn={this.state.site.loggedInUser === this.state.site.primaryBuild.user}
                            partStore={this.state.part}
                            primaryBuild={this.state.builds[this.state.site.primaryBuild.key]}
                            primaryBuildVersion={this.state.site.primaryBuild}/>);
      github = "https://github.com/" + this.state.site.primaryBuild.user + "/rcbuild.info-builds/tree/" + this.state.site.primaryBuild.branch;
    } else if (this.state.site.page === "parts") {
      var classification = this.state.site.primaryBuild.partClassification;
      if (classification === "supported") {
        content = <SupportedParts/>;
      } else if (classification === "all") {
        content = <AllParts/>;
      }
      github = "https://github.com/rcbuild-info/parts";
    } else if (this.state.site.page === "builds") {
      content = <BuildList/>;
      github = "https://github.com/rcbuild-info/website";
    } else if (this.state.site.page === "createbuild") {
      content = <CreateBuildPage loggedInUser={this.state.site.loggedInUser}/>;
      github = "https://github.com/rcbuild-info/website";
    } else if (this.state.site.page === "") {
      content = (
              <Jumbotron>
                <h1>Welcome!</h1>
                <p>Find a build and PIDs to make the best flying multirotor you've ever had. Or, share a build and PIDs you already have to get feedback easily.</p>
                <p><Button bsStyle="primary" href="/builds">Find Build</Button> <Button bsStyle="primary" href="/createbuild">Share Build</Button></p>
              </Jumbotron>);
      github = "https://github.com/rcbuild-info/website";
    }
    var logo = <a href="/"><img src="/static/logo.svg"/></a>;
    var login = <NavItem eventKey={11} href={"/login?next=" + window.location.href}>Login with GitHub</NavItem>;
    if (this.state.site.loggedInUser) {
      login = <NavItem eventKey={11} href={"/logout?next=" + window.location.href}>Logout</NavItem>;
    }

    return (
      <div id="appContainer">
        <Navbar brand={logo} toggleNavKey={0}>
          <CollapsibleNav eventKey={0}> {/* This is the eventKey referenced */}
            <Nav navbar right>
              <NavItem eventKey={13} href="/createbuild">Create</NavItem>
              {pageNav}
              <NavItem eventKey={10} href={github}>GitHub</NavItem>
              {login}
            </Nav>
          </CollapsibleNav>
        </Navbar>
        <Grid>
          <Row>
            <Col xs={12}>
              { content }
            </Col>
          </Row>
          <hr/>
          <Row>
            <Col xs={12}>
              <div className="footer">RCBuild.Info is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to amazon.com.</div>
            </Col>
          </Row>
        </Grid>
      </div>
    );
  }
}
