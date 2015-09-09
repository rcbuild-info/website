import React from "react";

import Button from "react-bootstrap/lib/Button";
import Input from "react-bootstrap/lib/Input";

export default class LinkInput extends React.Component {
  constructor(props) {
    super();
    this.render = this.render.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);

    this.state = {"link": "",
                  "value": null,
                  "valid": null};
  }

  onChange() {
    let link = this.refs.input.getValue();
    if (this.props.regexes) {
      for (let regex of this.props.regexes) {
        let m = regex.exec(link);
        if (m !== null) {
          this.setState({"link": link, "value": m.slice(1), "valid": true});
          return;
        }
      }
    }
    let valid = null;
    if (link !== "") {
      valid = false;
    }
    this.setState({"link": link, "value": null, "valid": valid});
  }

  onSubmit(event) {
    if (this.state.value) {
      this.props.onSubmit(this.state.value);
      this.setState({"link": "", "value": null, "valid": null});
    }
    event.preventDefault();
  }

  render() {
    let feedbackStyle = null;
    let buttonStyle = null;
    let help = null;
    if (this.state.valid !== null) {
      if (this.state.valid) {
        feedbackStyle = "success";
        buttonStyle = "success";
      } else {
        feedbackStyle = "error";
        buttonStyle = "danger";
        help = this.props.invalidMessage;
      }
    }
    let button = <Button bsStyle={buttonStyle} disabled={!this.state.valid} onClick={this.onSubmit}>{this.props.buttonText}</Button>;
    return (
      <form onSubmit={this.onSubmit}><Input bsStyle={feedbackStyle} buttonAfter={button} hasFeedback={this.state.valid !== null} help={help} label={this.props.label} onChange={this.onChange} placeholder={this.props.placeholder} ref="input" type="text" value={this.state.link}/></form>
      );
    }
}

LinkInput.propTypes = {
  buttonText: React.PropTypes.string,
  invalidMessage: React.PropTypes.node,
  label: React.PropTypes.string,
  onSubmit: React.PropTypes.func,
  placeholder: React.PropTypes.string,
  regexes: React.PropTypes.array
};
