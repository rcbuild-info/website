'use strict';
var request = require('superagent');
var _ = require('underscore');
var React = require('react');
var SwipeViews = require('react-swipe-views');
var CollapsibleMixin = require('react-bootstrap/lib/CollapsibleMixin');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var classNames = require('classnames');

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
    return (<div><Grid onClick={this.onHandleToggle}><Row><Col className="category" xs={4}>{this.props.model.name}</Col>{partInfo}</Row></Grid><div ref='panel' className={classNames(styles)}>{this.state.partInfo.name}</div></div>);
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
console.log(user, repo);
React.render(
  <SwipeViews>
        <div title="Build">
          <Build user={user} repo={repo}/>
        </div>
        <div title="PIDs">
          PIDs
        </div>
        <div title="Flights">
          Flights
        </div>
  </SwipeViews>,
  document.body
);