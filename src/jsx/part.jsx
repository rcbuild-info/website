var React = require("react");
var request = require("superagent");
var CollapsibleMixin = require("react-bootstrap/lib/CollapsibleMixin");
var classNames = require("classnames");
var Row = require("react-bootstrap/lib/Row");
var Col = require("react-bootstrap/lib/Col");

var PartDetails = require("./part-details");

module.exports = React.createClass({
  propTypes: {
    id: React.PropTypes.oneOfType([React.PropTypes.string,
                                   React.PropTypes.array]).isRequired,
    model: React.PropTypes.shape({
      name: React.PropTypes.string
    })
  },

  mixins: [CollapsibleMixin],

  getInitialState: function() {
    return {
      partInfo: {},
      unknown: false
    };
  },

  componentDidMount: function() {
    if (this.props.id.length < 1) {
      return;
    }
    request.get("/part/" + this.props.id + ".json")
           .end(function(err, res){
             if (err || !this.isMounted()) {
               return;
             }
             if (res.ok) {
              this.setState({
                partInfo: JSON.parse(res.text)
              });
             } else {
              this.setState({
                unknown: true
              });
             }
           }.bind(this));
  },

  onHandleToggle: function(e) {
    ga("send", "event", "part", "toggle", this.props.id);
    e.preventDefault();
    this.setState({expanded: !this.state.expanded});
  },

  getCollapsibleDimensionValue: function(){
    return React.findDOMNode(this.refs.panel).scrollHeight;
  },

  getCollapsibleDOMNode: function(){
    return React.findDOMNode(this.refs.panel);
  },

  render: function() {
    var styles = this.getCollapsibleClassSet();
    var unknown = "";
    if (this.state.unknown) {
      unknown = (<a className="unknown" href="https://github.com/rcbuild-info/part-skeleton" target="_blank" title="This part is unknown. Click for more information on how to add it." >?</a>);
    }
    var partInfo = (<Col className="name" xs={8}>{this.props.id}{unknown}</Col>);
    if (this.state.partInfo.name) {
      partInfo = (<Col className="name" xs={8}>{this.state.partInfo.manufacturer} {this.state.partInfo.name}</Col>);
    }
    return (<div className="part"><Row onClick={this.onHandleToggle}><Col className="category" xs={4}>{this.props.model.name}</Col>{partInfo}</Row><div className={classNames(styles)} ref='panel'><PartDetails partInfo={this.state.partInfo}/></div></div>);
  }
});
