import React from "react";
import request from "superagent";

import Table from "react-bootstrap/lib/Table";

export default class BuildSettings extends React.Component {
  constructor() {
    super();
    this.componentDidMount = this.componentDidMount.bind(this);
    this.render = this.render.bind(this);
    this.state = {
      cleanflightSettings: {}
    };
    this.activeRequest = null;
  }

  componentDidMount() {
    this.activeRequest =
      request.get("/build/" + this.props.user + "/" + this.props.repo + "/cleanflight_cli_dump.txt")
             .end(function(err, res){
               this.activeRequest = null;
               if (err || !res.ok) {
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

  render() {
    if (!this.state.cleanflightSettings) {
      return <div></div>;
    }
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
    return (<div className="pids">
              <div><h3>Core</h3>{corePID}</div>
              <div><h3>Rates</h3>{rates}</div>
              <div><h3>Filter</h3>{filter}</div>
            </div>);
  }
}
BuildSettings.propTypes = {
  repo: React.PropTypes.string,
  user: React.PropTypes.string
};
