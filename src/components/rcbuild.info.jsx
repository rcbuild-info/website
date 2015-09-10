require("babelify/polyfill");

var React = require("react");
var DropdownButton = require("./DropdownButton");
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
    this.onCopyText = this.onCopyText.bind(this);
    this.state = SiteStore.getState();
    this.state.copyText = "";
    this.state.copyCount = 0;
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

  onShareText(text) {
    let newCount = this.state.copyCount;
    if (text !== this.state.copyText) {
      newCount = 0;
    }
    this.setState({"copyText": text, "copyCount": newCount});
    React.findDOMNode(this.refs.copyText).focus();
  }

  onCopyText() {
    React.findDOMNode(this.refs.copyText).select();

    try {
      // Now that we've selected the anchor text, execute the copy command
      var successful = document.execCommand('copy');
      if (successful) {
        this.setState({"copyCount": this.state.copyCount + 1});
      }
    } catch(err) {
    }

    // Remove the selections - NOTE: Should use
    // removeRange(range) when it is supported
    window.getSelection().removeAllRanges();
  }

  render() {
    let disableEdit = !this.state.loggedInUser ||
                      this.state.page === "createbuild" ||
                      !this.state.primaryBuildVersion ||
                      !this.state.primaryBuildVersion.isHead ||
                      this.state.loggedInUser !== this.state.primaryBuildVersion.user;

    let similar = [];
    if (this.state.similarBuilds && Object.keys(this.state.similarBuilds).length > 0) {
      if ("yours" in this.state.similarBuilds) {
        similar.push(<MenuItem header key="mine">Mine</MenuItem>);
        for (let build of this.state.similarBuilds.yours) {
          similar.push(<MenuItemLink key={ build.user + "/" + build.branch }
                                     params={{"primaryUser": this.state.primaryBuildVersion.user,
                                              "primaryBranch": this.state.primaryBuildVersion.branch,
                                              "primaryCommit": this.state.primaryBuildVersion.isHead? "HEAD" : this.state.primaryBuildVersion.commit.slice(0, 8),
                                              "secondaryUser": build.user,
                                              "secondaryBranch": build.branch,
                                              "secondaryCommit": "HEAD"}}
                                     to="compare">{ build.branch }</MenuItemLink>);
        }
        similar.push(<MenuItem divider key="d"/>);
        similar.push(<MenuItem header key="others">Others</MenuItem>);
      }
      for (let build of this.state.similarBuilds.others) {
        similar.push(<MenuItemLink key={ build.user + "/" + build.branch }
                                   params={{"primaryUser": this.state.primaryBuildVersion.user,
                                            "primaryBranch": this.state.primaryBuildVersion.branch,
                                            "primaryCommit": this.state.primaryBuildVersion.commit.slice(0, 8),
                                            "secondaryUser": build.user,
                                            "secondaryBranch": build.branch,
                                            "secondaryCommit": "HEAD"}}
                                   to="compare">{ build.user + "/" + build.branch }</MenuItemLink>);
      }
    }
    let share = [];
    if (this.state.page === "build" && this.state.primaryBuildVersion) {
      let version = this.state.primaryBuildVersion;
      let latestUrl = "https://rcbuild.info/build/" + version.user + "/" + version.branch + "/";
      share.push(<MenuItem key="fb">
                   <div className="fb-share-button"
                      data-href={latestUrl}
                      data-layout="button_count">
                   </div>
                 </MenuItem>);
      share.push(<MenuItem href={"http://www.reddit.com/submit?url=" + encodeURIComponent(latestUrl)} key="reddit">
                   <span className="reddit_button" style={{"color": "grey"}}>
                       <img src="//www.redditstatic.com/spreddit5.gif"
                            style={{"height": "2.3ex", "verticalAlign": "top", "marginRight": "1ex"}}/>submit
                   </span>
                 </MenuItem>);
      share.push(<MenuItem divider key="afterNetworks"/>);
      share.push(<MenuItem key="newest" onClick={ this.onShareText.bind(this, latestUrl) }>Link to newest version</MenuItem>);
      share.push(<MenuItem key="this" onClick={ this.onShareText.bind(this, latestUrl + version.commit.slice(0,8)) }>Link to this version</MenuItem>);
      share.push(<MenuItem divider key="d"/>);
      share.push(<li key="text"><input placeholder="Select a link above" readOnly ref="copyText"  type="text" value={this.state.copyText} /></li>);
      let copyText = "Copy";
      if (this.state.copyCount === 1) {
        copyText = "Copied!";
      } else if (this.state.copyCount === 2) {
        copyText = "Copied again!";
      } else if (this.state.copyCount === 3) {
        copyText = "Copied again and again!"
      } else if (this.state.copyCount > 3){
        copyText = "Copied " + this.state.copyCount + " times!";
      }
      share.push(<MenuItem disabled={this.state.copyText === ""} key="copy" onClick={ this.onCopyText }>{copyText}</MenuItem>);
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
                <DropdownButton disabled={share.length === 0} eventKey={1} key="share" title="Share">
                  {share}
                </DropdownButton>
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
