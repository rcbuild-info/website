import React from "react";


export default class More extends React.Component {
  constructor(props) {
    super();
    this.render = this.render.bind(this);
  }

  render() {
    return (
      <div className="more" onClick={this.props.onClick}>
        <div>
          More
        </div>
      </div>
      );
    }
}
More.propTypes = {
  onClick: React.PropTypes.func
};
