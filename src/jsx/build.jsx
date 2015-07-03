'use strict';
var request = require('superagent');
var _ = require('underscore');
var React = require('react');
var Cookies = require('js-cookie');
var SwipeViews = require('react-swipe-views');
var CollapsibleMixin = require('react-bootstrap/lib/CollapsibleMixin');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Table = require('react-bootstrap/lib/Table');
var Panel = require('react-bootstrap/lib/Panel');
var Navbar = require('react-bootstrap/lib/Navbar');
var CollapsibleNav = require('react-bootstrap/lib/CollapsibleNav');
var Nav = require('react-bootstrap/lib/Nav');
var NavItem = require('react-bootstrap/lib/NavItem');
var classNames = require('classnames');

/**
* Function that tracks a click on an outbound link in Google Analytics.
* This function takes a valid URL string as an argument, and uses that URL string
* as the event label.
*/
var trackOutboundLink = function(url) {
   ga('send', 'event', 'outbound', 'click', url, {'hitCallback':
     function () {
       document.location = url;
     }
   });
}

var parseCleanflightDump = function(dumpTxt) {
  var splitTxt = dumpTxt.split("\n");
  var setRegExp = new RegExp("set (\\w+) =\\s+(\\d+\\.\\d+|\\d+)");
  var config = {};
  for (var lineNum in splitTxt) {
    var result = setRegExp.exec(splitTxt[lineNum]);
    if (result) {
      config[result[1]] = Number(result[2]);
    }
  }
  return config;
}

var BuildSettings = React.createClass({
  getInitialState: function() {
    return {
      cleanflightSettings: {}
    };
  },
  componentDidMount: function() {
    request.get('/build/' + this.props.user + "/" + this.props.repo + "/cleanflight_cli_dump.txt")
           .end(_.bind(function(err, res){
             if (!this.isMounted()) return;
             if (res.ok) {
               this.setState({
                 cleanflightSettings: parseCleanflightDump(res.text)
               });
             }
           }, this));
  },
  render: function() {
    console.log(this.state.cleanflightSettings);
    if (!this.state.cleanflightSettings) return <div></div>;
    var c = this.state.cleanflightSettings;
    var p_roll = c.pid_controller == 2 ? c.p_rollf : c.p_roll;
    var i_roll = c.pid_controller == 2 ? c.i_rollf : c.i_roll;
    var d_roll = c.pid_controller == 2 ? c.d_rollf : c.d_roll;
    var p_pitch = c.pid_controller == 2 ? c.p_pitchf : c.p_pitch;
    var i_pitch = c.pid_controller == 2 ? c.i_pitchf : c.i_pitch;
    var d_pitch = c.pid_controller == 2 ? c.d_pitchf : c.d_pitch;
    var p_yaw = c.pid_controller == 2 ? c.p_yawf : c.p_yaw;
    var i_yaw = c.pid_controller == 2 ? c.i_yawf : c.i_yaw;
    var d_yaw = c.pid_controller == 2 ? c.d_yawf : c.d_yaw;
    var corePID =
      <div fill>
      <Grid><Row><Col xs={4}>PID Controller</Col><Col xs={8}>{c.pid_controller}</Col></Row></Grid>
      <Table condensed striped>
        <thead>
          <tr><th></th><th>Proportional</th><th>Integral</th><th>Derivative</th></tr>
        </thead>
        <tbody>
          <tr><td>Roll</td><td>{p_roll}</td><td>{i_roll}</td><td>{d_roll}</td></tr>
          <tr><td>Pitch</td><td>{p_pitch}</td><td>{i_pitch}</td><td>{d_pitch}</td></tr>
          <tr><td>Yaw</td><td>{p_yaw}</td><td>{i_yaw}</td><td>{d_yaw}</td></tr>
        </tbody>
      </Table>
      </div>;
    var rates = 
      <Grid fill>
        <Row><Col xs={4}>Roll</Col><Col xs={8}>{c.roll_rate}</Col></Row>
        <Row><Col xs={4}>Pitch</Col><Col xs={8}>{c.pitch_rate}</Col></Row>
        <Row><Col xs={4}>Yaw</Col><Col xs={8}>{c.yaw_rate}</Col></Row>
        <Row><Col xs={4}>TPA</Col><Col xs={8}>{c.tpa_rate}</Col></Row>
        <Row><Col xs={4}>TPA Breakpoint</Col><Col xs={8}>{c.tpa_breakpoint}</Col></Row>
      </Grid>;
    var filter = 
      <Grid fill>
        <Row><Col xs={4}>gyro_lpf</Col><Col xs={8}>{c.gyro_lpf}</Col></Row>
        <Row><Col xs={4}>dterm_cut_hz</Col><Col xs={8}>{c.dterm_cut_hz}</Col></Row>
        <Row><Col xs={4}>pterm_cut_hz</Col><Col xs={8}>{c.pterm_cut_hz}</Col></Row>
        <Row><Col xs={4}>gyro_cut_hz</Col><Col xs={8}>{c.gyro_cut_hz}</Col></Row>
      </Grid>;
    return (<div>
              <Panel header='Core'>{corePID}</Panel>
              <Panel header='Rates'>{rates}</Panel>
              <Panel header='Filter'>{filter}</Panel>
            </div>);
  }
});

var getSite = function(url) {
  var parser = document.createElement('a');
  parser.href = url;
  return parser.hostname.replace("www.", "");
};
var PartDetails = React.createClass({
  render: function() {
    if (!this.props.partInfo || Object.keys(this.props.partInfo).length == 0) return <div>Unknown part.</div>;
    var buttons = [];
    for (var urlClass in this.props.partInfo.urls) {
      for (var i = 0; i < this.props.partInfo.urls[urlClass].length; i++) {
        var url = this.props.partInfo.urls[urlClass][i];
        var site = getSite(url);
        var onClick = function() {
          trackOutboundLink(url);
          event.preventDefault ? event.preventDefault() : event.returnValue = !1;
        };
        buttons.push((<li key={site}><a href={url} className={urlClass} onClick={onClick}>{site}</a></li>));
      }
    }
    return (<Grid><Row className="row-eq-height links"><Col className="category" xs={4}></Col><Col xs={8}><ul>{buttons}</ul></Col></Row></Grid>);
  }
});

var Part = React.createClass({
  getInitialState: function() {
    return {
      partInfo: {},
      unknown: false
    };
  },

  mixins: [CollapsibleMixin],

  getCollapsibleDOMNode: function(){
    return React.findDOMNode(this.refs.panel);
  },

  getCollapsibleDimensionValue: function(){
    return React.findDOMNode(this.refs.panel).scrollHeight;
  },

  onHandleToggle: function(e){
    e.preventDefault();
    this.setState({expanded:!this.state.expanded});
  },

  componentDidMount: function() {
    request.get('/part/' + this.props.id + ".json")
           .end(_.bind(function(err, res){
             if (!this.isMounted()) return;
             if (res.ok) {
              this.setState({
                partInfo: JSON.parse(res.text)
              });
             } else {
              this.setState({
                unknown: true
              });
             }
           }, this));
  },
  render: function() {
    var styles = this.getCollapsibleClassSet();
    var unknown = "";
    if (this.state.unknown) {
      unknown = (<a href="https://github.com/tannewt/rcbuild.info-part-skeleton" title="This part is unknown. Click for more information on how to add it." target="_blank" className="unknown">?</a>);
    }
    var partInfo = (<Col xs={8}>{this.props.id}{unknown}</Col>);
    if (this.state.partInfo.name) {
      partInfo = (<Col className="part" xs={8}>{this.state.partInfo.manufacturer} {this.state.partInfo.name}</Col>);
    }
    return (<div><Grid onClick={this.onHandleToggle}><Row><Col className="category" xs={4}>{this.props.model.name}</Col>{partInfo}</Row></Grid><div ref='panel' className={classNames(styles)}><PartDetails partInfo={this.state.partInfo}/></div></div>);
  }
});

var Build = React.createClass({
  getInitialState: function() {
    return {
      buildModel: {},
      buildInfo: {}
    };
  },

  componentDidMount: function() {
    request.get('/build/' + this.props.user + "/" + this.props.repo + ".json")
           .end(_.bind(function(err, res){
             //console.log(err, res);
             if (res.ok && this.isMounted()) {
                this.setState({
                  buildInfo: JSON.parse(res.text)
                });
              }
           }, this));
    request.get('/partCategories.json')
           .end(_.bind(function(err, res){
             if (res.ok && this.isMounted()) {
                this.setState({
                  partCategories: JSON.parse(res.text)
                });
            }
           }, this));
  },
  render: function() {
    var parts = [];
    if (this.state.partCategories && this.state.buildInfo) {
      //console.log(this.state.buildInfo["config"]);
      var partCategories = Object.keys(this.state.buildInfo["config"]);
      partCategories.sort(_.bind(function(a, b) { return this.state.partCategories["categories"][a]["order"] - this.state.partCategories["categories"][b]["order"]; }, this));
      for (var i in partCategories) {
        var category = partCategories[i];
          parts.push((<Part model={this.state.partCategories["categories"][category]} key={this.state.buildInfo.config[category]} id={this.state.buildInfo.config[category]}/>));
        }
    }
    return (<div>{parts}</div>);
  }
});

var urlparts = window.location.pathname.split("/");
var user = urlparts[2];
var repo = urlparts[3];
var logo = <img src="/static/logo.svg"/>;
var login = <NavItem eventKey={2} href={'/login?next=' + window.location.href}>Login with GitHub</NavItem>;
if (Cookies.get("u")) {
  login = <NavItem eventKey={2} href={'/logout?next=' + window.location.href}>Logout</NavItem>;
}
React.render(
  <div>
    <Navbar brand={logo} toggleNavKey={0}>
      <CollapsibleNav eventKey={0}> {/* This is the eventKey referenced */}
        <Nav navbar right>
          <NavItem eventKey={1} href={'https://github.com/' + user + '/' + repo}>View on GitHub</NavItem>
          {login}
        </Nav>
      </CollapsibleNav>
    </Navbar>
    <SwipeViews>
          <div title="Build">
            <Build user={user} repo={repo}/>
          </div>
          <div title="PIDs">
            <BuildSettings user={user} repo={repo}/>
          </div>
    </SwipeViews>
  </div>,
  document.body
);