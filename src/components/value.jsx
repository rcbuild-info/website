import React from "react";

export default class Value extends React.Component {
  constructor(props) {
    super();
    this.render = this.render.bind(this);

    if (props.precision) {
      this.state = {"precision": props.precision};
    } else if (props.divisor) {
      this.state = {"precision": Math.log(props.divisor) / Math.LN10};
    } else {
      this.state = {"precision": 0};
    }
  }

  render() {
    if (this.props.primaryValue === undefined) {
      return null;
    }
    if (!this.props.secondaryValue || this.props.secondaryValue === this.props.primaryValue) {
      return <span>{(this.props.primaryValue).toFixed(this.state.precision)}</span>;
    }
    let sp;
    let diff;
    if (this.props.showDifference) {
      let positive = this.props.secondaryValue > this.props.primaryValue;
      diff = <span className={ positive ? "diff-positive" : "diff-negative" }>{(positive ? "+" : "") + (this.props.secondaryValue - this.props.primaryValue).toFixed(this.state.precision)}</span>;
      sp = <span>&nbsp;</span>;
    }
    let d = 1;
    if (this.props.divisor) {
      d = this.props.divisor;
    }
    return (
        <div className="value">
          <span className="diff-gone">{(this.props.primaryValue / d).toFixed(this.state.precision)}</span>&nbsp;
          <span className="diff-new">{(this.props.secondaryValue / d).toFixed(this.state.precision)}</span>
          { sp }
          { diff }
        </div>
      );
    }
}
Value.propTypes = {
  divisor: React.PropTypes.number,
  precision: React.PropTypes.number,
  primaryValue: React.PropTypes.number,
  secondaryValue: React.PropTypes.number,
  showDifference: React.PropTypes.bool
};
