import React from "react";

export default class YouTubeThumb extends React.Component {
  constructor(props) {
    super();
    this.render = this.render.bind(this);
    this.componentDidMount = this.componentDidMount.bind(this);
    this.state = {"size": ""};
  }

  componentDidMount() {
    let node = this.refs.container.getDOMNode();
    let devicePixelRatio = window.devicePixelRatio || 1;
    let w = node.clientWidth * devicePixelRatio;
    let h = node.clientHeight * devicePixelRatio;
    let size = "";
    if (w > 480 || h > 360) {
      size = "maxres";
    } else if (w > 320 || h > 180) {
      size = "hq";
    } else if (w > 120 || h > 90) {
      size = "mq";
    }
    if (size !== this.state.size) {
      this.setState({"size": size});
    }
  }

  render() {
    var imageStyle = {
      backgroundImage: "url(https://img.youtube.com/vi/" + this.props.videoId + "/" + this.state.size + "default.jpg)"
    };
    return (
      <div className={this.props.className} onClick={this.props.onClick}>
        <div className="embed-responsive embed-responsive-16by9 clipped-image" ref="container" style={imageStyle}/>
        {this.props.children}
      </div>
      );
    }
}
YouTubeThumb.propTypes = {
  children: React.PropTypes.element,
  className: React.PropTypes.string,
  onClick: React.PropTypes.func,
  videoId: React.PropTypes.string
};
