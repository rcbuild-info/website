var React = require("react");
var Cookies = require("js-cookie");
var Grid = require("react-bootstrap/lib/Grid");
var Row = require("react-bootstrap/lib/Row");
var Col = require("react-bootstrap/lib/Col");
var Panel = require("react-bootstrap/lib/Panel");
var Navbar = require("react-bootstrap/lib/Navbar");
var CollapsibleNav = require("react-bootstrap/lib/CollapsibleNav");
var Nav = require("react-bootstrap/lib/Nav");
var NavItem = require("react-bootstrap/lib/NavItem");
var Jumbotron = require("react-bootstrap/lib/Jumbotron");
var Button = require("react-bootstrap/lib/Button");

import AllParts from "./all-parts";
import Build from "./build";
import BuildList from "./build-list";
import BuildSettings from "./build-settings";
import SupportedParts from "./supported-parts";

var urlparts = window.location.pathname.split("/");
var base = urlparts[1];
var content;
var github;
if (base === "build") {
  var user = urlparts[2];
  var repo = urlparts[3];
  content = (<Row>
              <Col md={6}>
                <Panel header="Build">
                  <Build fill repo={repo} user={user}/>
                </Panel>
              </Col>
              <Col md={6}>
                <Panel header="PIDs">
                  <BuildSettings fill repo={repo} user={user}/>
                </Panel>
              </Col>
            </Row>);
  github = "https://github.com/" + user + "/" + repo;
} else if (base === "parts") {
  var classification = urlparts[2];
  if (classification === "supported") {
    content = <SupportedParts/>;
  } else if (classification === "all") {
    content = <AllParts/>;
  }
  github = "https://github.com/tannewt/rcbuild.info-parts";
} else if (base === "builds") {
  content = <BuildList/>;
  github = "https://github.com/tannewt/rcbuild.info";
} else if (base === "") {
  var url = "https://github.com/tannewt/rcbuild.info-build-skeleton/blob/master/README.md";
  var onClick = function() {
    ga("send", "event", "outbound", "click", url, {"hitCallback":
      function () {
        document.location = url;
      }
    });
    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = !1;
    }
  };
  content = (
          <Jumbotron>
            <h1>Welcome!</h1>
            <p>Find a build and PIDs to make the best flying multirotor you've ever had. Or, share a build and PIDs you already have to get feedback easily.</p>
            <p><Button bsStyle="primary" href="/builds">Find Build</Button> <Button bsStyle="primary" href={url} onClick={onClick}>Share Build</Button></p>
          </Jumbotron>);
  github = "https://github.com/tannewt/rcbuild.info";
}
var logo = <a href="/"><img src="/static/logo.svg"/></a>;
var login = <NavItem eventKey={2} href={"/login?next=" + window.location.href}>Login with GitHub</NavItem>;
if (Cookies.get("u")) {
  login = <NavItem eventKey={2} href={"/logout?next=" + window.location.href}>Logout</NavItem>;
}

React.render(
  <div id="appContainer">
    <Navbar brand={logo} toggleNavKey={0}>
      <CollapsibleNav eventKey={0}> {/* This is the eventKey referenced */}
        <Nav navbar right>
          <NavItem eventKey={1} href={github}>View on GitHub</NavItem>
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
  </div>,
  document.body
);
