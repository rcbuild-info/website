import React from "react";
import request from "superagent";

import Alert from "react-bootstrap/lib/Alert";
import Button from "react-bootstrap/lib/Button";
import Input from "react-bootstrap/lib/Input";
import Panel from "react-bootstrap/lib/Panel";
import Table from "react-bootstrap/lib/Table";

export default class BuildSettings extends React.Component {
  constructor() {
    super();
    this.componentDidMount = this.componentDidMount.bind(this);
    this.render = this.render.bind(this);
    this.onDone = this.onDone.bind(this);
    this.onUpload = this.onUpload.bind(this);
    this.state = {
      cleanflightSettings: {},
      editing: false,
      error: null,
      info: null
    };
    this.activeRequest = null;
    this.uploadRequest = null;
  }

  componentDidMount() {
    this.activeRequest =
      request.get("/build/" + this.props.user + "/" + this.props.branch + "/cleanflight_cli_dump.txt")
             .end(function(err, res){
               this.activeRequest = null;
               if (err || !res.ok) {
                 if (err.status === 404) {
                   this.setState({
                     editing: true
                   });
                 }
                 return;
               }
               this.setState({
                 cleanflightSettings: BuildSettings.parseCleanflightDump(res.text)
               });
             }.bind(this));
  }

  componentWillUnmount() {
    if (this.activeRequest) {
      this.activeRequest.abort();
    }
  }

  static parseCleanflightDump(dumpTxt) {
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

  onDone() {
    let cg = this.refs.cleanflight_gui.getInputDOMNode().files;
    let cc = this.refs.cleanflight_cli.getInputDOMNode().files;
    if ((cg.length > 0 && cc.length === 0) ||
        (cg.length === 0 && cc.length > 0)) {
      this.setState({
        error: "Please submit both the GUI backup and CLI dump."
      });
      return;
    }
    if (cg.length === 0 && cc.length === 0) {
      this.setState({
        editing: false
      });
      return;
    }
    this.setState({
      error: null,
      info: "Uploading..."
    });
    var formData = new FormData();
    formData.append("cleanflight_gui_backup.json", cg[0]);
    formData.append("cleanflight_cli_dump.txt", cc[0]);
    this.uploadRequest =
      request.post("/build/" + this.props.user + "/" + this.props.branch + "/settings")
             .send(formData)
             .end(function(err, res){
               this.uploadRequest = null;
               if (!err && res.ok) {
                this.setState({
                  editing: false,
                  info: null
                });
               }
             }.bind(this));
  }

  onUpload() {
    this.setState({
      editing: true
    });
  }

  render() {
    if (!this.state.editing) {
      var c = this.state.cleanflightSettings;
      var pRoll = c.pid_controller === 2 ? c.p_rollf : c.p_roll / 10;
      var iRoll = c.pid_controller === 2 ? c.i_rollf : c.i_roll / 1000;
      var dRoll = c.pid_controller === 2 ? c.d_rollf : c.d_roll;
      var pPitch = c.pid_controller === 2 ? c.p_pitchf : c.p_pitch / 10.;
      var iPitch = c.pid_controller === 2 ? c.i_pitchf : c.i_pitch / 1000.;
      var dPitch = c.pid_controller === 2 ? c.d_pitchf : c.d_pitch;
      var pYaw = c.pid_controller === 2 ? c.p_yawf : c.p_yaw / 10.;
      var iYaw = c.pid_controller === 2 ? c.i_yawf : c.i_yaw / 1000.;
      var dYaw = c.pid_controller === 2 ? c.d_yawf : c.d_yaw;
      var corePID =
        (
          <div fill>
            <Table condensed striped>
              <thead>
                <tr><th></th><th>Proportional</th><th>Integral</th><th>Derivative</th></tr>
              </thead>
              <tbody>
                <tr><td>Roll</td><td>{pRoll}</td><td>{iRoll}</td><td>{dRoll}</td></tr>
                <tr><td>Pitch</td><td>{pPitch}</td><td>{iPitch}</td><td>{dPitch}</td></tr>
                <tr><td>Yaw</td><td>{pYaw}</td><td>{iYaw}</td><td>{dYaw}</td></tr>
              </tbody>
            </Table>
            <Table condensed striped>
              <tbody>
                <tr><td>PID Controller</td><td>{c.pid_controller}</td></tr>
                <tr><td>looptime</td><td>{c.looptime}</td></tr>
              </tbody>
            </Table>
          </div>
      );
      var rates =
        (
          <Table condensed striped>
            <tbody>
              <tr><td>Roll</td><td>{c.roll_rate / 100.}</td></tr>
              <tr><td>Pitch</td><td>{c.pitch_rate / 100.}</td></tr>
              <tr><td>Yaw</td><td>{c.yaw_rate / 100.}</td></tr>
              <tr><td>TPA</td><td>{c.tpa_rate / 100.}</td></tr>
              <tr><td>TPA Breakpoint</td><td>{c.tpa_breakpoint}</td></tr>
            </tbody>
          </Table>
        );
      var filter =
        (
          <Table condensed striped>
            <tbody>
              <tr><td>gyro_lpf</td><td>{c.gyro_lpf}</td></tr>
              <tr><td>dterm_cut_hz</td><td>{c.dterm_cut_hz}</td></tr>
              <tr><td>pterm_cut_hz</td><td>{c.pterm_cut_hz}</td></tr>
              <tr><td>gyro_cut_hz</td><td>{c.gyro_cut_hz}</td></tr>
            </tbody>
          </Table>
        );
    }
    var content;
    var header;
    if (this.state.editing) {
      header = <div>PIDs<Button bsSize="xsmall" onClick={this.onDone}>Done</Button></div>;
      var alert;
      if (this.state.error) {
        alert = <Alert bsStyle="danger">{this.state.error}</Alert>;
      } else if (this.state.info) {
        alert = <Alert bsStyle="info">{this.state.info}</Alert>;
      }
      content = (<form>
                  {alert}
                  <Input label="Cleanflight GUI backup" ref="cleanflight_gui" type="file"/>
                  <Input label="Cleanflight CLI dump" ref="cleanflight_cli" type="file"/>
                  <hr/>
                 </form>);
    } else {
      header = <div>PIDs<Button bsSize="xsmall" disabled={this.props.user !== this.props.loggedInUser} onClick={this.onUpload}>Upload</Button></div>;
      content = (<div className="pids" fill>
                  <div><h3>Core</h3>{corePID}</div>
                  <div><h3>Rates</h3>{rates}</div>
                  <div><h3>Filter</h3>{filter}</div>
                 </div>);
    }
    return (<Panel header={header}>
              {content}
            </Panel>);
  }
}
BuildSettings.propTypes = {
  branch: React.PropTypes.string,
  loggedInUser: React.PropTypes.string,
  user: React.PropTypes.string
};
