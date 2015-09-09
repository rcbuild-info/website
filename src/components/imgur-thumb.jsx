import React from "react";

import classNames from "classnames";

export default class ImgurThumb extends React.Component {
  constructor(props) {
    super();
    this.render = this.render.bind(this);
    this.componentDidMount = this.componentDidMount.bind(this);
    this.state = {"size": "t"};
  }

  componentDidMount() {
    let node = this.refs.container.getDOMNode();
    let devicePixelRatio = window.devicePixelRatio || 1;
    let w = node.clientWidth * devicePixelRatio;
    let h = node.clientHeight * devicePixelRatio;
    let size = "t";
    if (w > 640 || h > 640) {
      size = "h";
    } else if (w > 320 || h > 320) {
      size = "l";
    } else if (w > 160 || h > 160) {
      size = "m";
    }
    if (size !== this.state.size) {
      this.setState({"size": size});
    }
  }

  render() {
    var imageStyle = {
      backgroundImage: "url(https://i.imgur.com/" + this.props.imageId + this.state.size + ".jpg)"
    };
    return (
      <div className={this.props.className} onClick={this.props.onClick}>
        <div className={"embed-responsive embed-responsive-" + (this.props.aspectRatio || "16by9") + " clipped-image"}
             ref="container"
             style={imageStyle}/>
        {this.props.children}
      </div>
      );
    }
}
ImgurThumb.propTypes = {
  aspectRatio: React.PropTypes.string,
  children: React.PropTypes.element,
  className: React.PropTypes.string,
  imageId: React.PropTypes.string,
  onClick: React.PropTypes.func
};
