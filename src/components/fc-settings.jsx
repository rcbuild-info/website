import React from "react";

import BuildActions from "../actions/build-actions";

import Alert from "react-bootstrap/lib/Alert";
import Input from "react-bootstrap/lib/Input";
import Panel from "react-bootstrap/lib/Panel";
import Table from "react-bootstrap/lib/Table";

import NumericValue from "./numeric-value";
import StringValue from "./string-value";

export default class FlightControllerSettings extends React.Component {
  constructor() {
    super();
    this.onChange = this.onChange.bind(this);
    this.render = this.render.bind(this);
    this.state = {
      primaryCleanflightSettings: {},
      secondaryCleanflightSettings: {},
      error: null
    };

    this.state.otherSettings = ["telemetry_inversion",
                                "blackbox_device",
                                "blackbox_rate_num",
                                "blackbox_rate_denom"];

    this.state.deps = {
      "p_roll": { "settings": {"fc": ["pid_controller"]}},
      "i_roll": { "settings": {"fc": ["pid_controller"]}},
      "d_roll": { "settings": {"fc": ["pid_controller"]}},
      "p_pitch": { "settings": {"fc": ["pid_controller"]}},
      "i_pitch": { "settings": {"fc": ["pid_controller"]}},
      "d_pitch": { "settings": {"fc": ["pid_controller"]}},
      "p_yaw": { "settings": {"fc": ["pid_controller"]}},
      "i_yaw": { "settings": {"fc": ["pid_controller"]}},
      "d_yaw": { "settings": {"fc": ["pid_controller"]}},
      "telemetry_inversion": { "parts": ["fc", "receiver"] },
      "blackbox_device": { "parts": ["blackbox"] },
      "blackbox_rate_num": { "parts": ["blackbox"], "settings": {"fc": ["looptime"]} },
      "blackbox_rate_denom": { "parts": ["blackbox"], "settings": {"fc": ["looptime"]} }
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.primarySettings && nextProps.primarySettings !== this.props.primarySettings) {
      this.loadCleanflightSettings("primaryCleanflightSettings", nextProps.primarySettings.cf_cli);
    }
    if (nextProps.secondarySettings && nextProps.secondarySettings !== this.props.secondarySettings) {
      this.loadCleanflightSettings("secondaryCleanflightSettings", nextProps.secondarySettings.cf_cli);
    }
  }

  loadCleanflightSettings(stateKey, cfCli) {
    if (cfCli instanceof Blob) {
      let reader = new FileReader();
      reader.onloadend = function() {
        let newState = {};
        newState[stateKey] = FlightControllerSettings.parseCleanflightDump(reader.result);
        this.setState(newState);
      }.bind(this);
      reader.readAsText(cfCli);
    } else {
      let newState = {};
      newState[stateKey] = FlightControllerSettings.parseCleanflightDump(cfCli);
      this.setState(newState);
    }
  }

  static parseCleanflightDump(dumpTxt) {
    var splitTxt = dumpTxt.split("\n");
    var setRegExp = /set (\w+) =\s+(\d+\.\d+|\d+)/;
    var versionRegExp = /#? ?(\w+)\/\w+ (\d+\.\d+\.\d+) ([^\(]+)\(([0-9a-z]{7})\)/;
    var config = {};
    for (var lineNum in splitTxt) {
      var result = setRegExp.exec(splitTxt[lineNum]);
      if (result) {
        config[result[1]] = Number(result[2]);
        continue;
      }
      result = versionRegExp.exec(splitTxt[lineNum]);
      if (result) {
        config.fc_name = result[1];
        config.fc_version = result[2];
        config.fc_build_date = result[3].trim();
        config.fc_build_commit = result[4];
        continue;
      }
    }
    return config;
  }

  onChange() {
    let cg = this.refs.cleanflight_gui.getInputDOMNode().files;
    let cc = this.refs.cleanflight_cli.getInputDOMNode().files;
    if ((cg.length > 0 && cc.length === 0) ||
        (cg.length === 0 && cc.length > 0)) {
      this.setState({
        error: "Please submit both the GUI backup and CLI dump."
      });
      return;
    }
    this.setState({
      error: null
    });

    BuildActions.setSettings({"fc": {"cf_gui": cg[0], "cf_cli": cc[0]}});
  }

  getPids(settings) {
    let isPC2 = settings.pid_controller === 2;
    let pids = {};
    pids.pRoll = isPC2 ? settings.p_rollf : settings.p_roll / 10;
    pids.iRoll = isPC2 ? settings.i_rollf : settings.i_roll / 1000;
    pids.dRoll = isPC2 ? settings.d_rollf : settings.d_roll;
    pids.pPitch = isPC2 ? settings.p_pitchf : settings.p_pitch / 10.;
    pids.iPitch = isPC2 ? settings.i_pitchf : settings.i_pitch / 1000.;
    pids.dPitch = isPC2 ? settings.d_pitchf : settings.d_pitch;
    pids.pYaw = isPC2 ? settings.p_yawf : settings.p_yaw / 10.;
    pids.iYaw = isPC2 ? settings.i_yawf : settings.i_yaw / 1000.;
    pids.dYaw = isPC2 ? settings.d_yawf : settings.d_yaw;
    return pids;
  }

  depsMatch(value) {
    if (!this.state.secondaryCleanflightSettings || !(value in this.state.deps)) {
      return false;
    }
    let deps = this.state.deps[value];
    if (deps.settings && deps.settings.fc) {
      for (let dep of this.state.deps[value].settings.fc) {
        if (this.state.primaryCleanflightSettings[dep] !== this.state.secondaryCleanflightSettings[dep]) {
          return false;
        }
      }
    }
    if (deps.parts && this.props.primaryParts && this.props.secondaryParts) {
      for (let part of deps.parts) {
        if (this.props.primaryParts[part] !== this.props.secondaryParts[part]) {
          return false;
        }
      }
    }
    return true;
  }

  getNumericRows(definition) {
    let p = this.state.primaryCleanflightSettings;
    let s = this.state.secondaryCleanflightSettings;
    let rows = [];
    for (let def of definition) {
      rows.push(
        <tr key={def.key}>
          <td>{def.name ? def.name : def.key}</td>
          <td><NumericValue divisor={ def.divisor } primaryValue={p[def.key]} secondaryValue={s[def.key]} showDifference={this.depsMatch(def.key)}/></td>
        </tr>
      );
    }
    return rows;
  }

  getStringRows(definition) {
    let p = this.state.primaryCleanflightSettings;
    let s = this.state.secondaryCleanflightSettings;
    let rows = [];
    for (let def of definition) {
      rows.push(
        <tr key={def.key}>
          <td>{def.name ? def.name : def.key}</td>
          <td><StringValue getUrl={def.getUrl} primaryValue={p[def.key]} secondaryValue={s[def.key]}/></td>
        </tr>
      );
    }
    return rows;
  }

  static firmwareUrl(firmwareName) {
    var urls = {"Cleanflight": "http://cleanflight.com/",
                "BetaFlight": "http://www.rcgroups.com/forums/showthread.php?t=2464844"};
    return urls[firmwareName];
  }

  static commitUrl(firmwareCommit) {
    return "https://github.com/cleanflight/cleanflight/commit/" + firmwareCommit;
  }

  render() {
    if (!this.props.editing) {
      let p = this.state.primaryCleanflightSettings;
      let pPids = this.getPids(p);
      let sPids = {};
      let s = this.state.secondaryCleanflightSettings;
      if (s && Object.keys(s).length > 0) {
        sPids = this.getPids(s);
      }
      var firmware =
        (
          <Table condensed striped>
            <tbody>
              { this.getStringRows([{"name": "Name", "key": "fc_name", "getUrl": FlightControllerSettings.firmwareUrl},
                                    {"name": "Version", "key": "fc_version"},
                                    {"name": "Build Date", "key": "fc_build_date"},
                                    {"name": "Build Commit", "key": "fc_build_commit", "getUrl": FlightControllerSettings.commitUrl}]) }
            </tbody>
          </Table>
        );

      let pPrecision = 1;
      let iPrecision = 3;
      let dPrecision = 0;
      if ((s && s.pid_controller === 2) ||
          ((!s || Object.keys(s).length === 0) && p && p.pid_controller === 2)) {
        pPrecision = 2;
        iPrecision = 2;
        dPrecision = 3;
      }
      var corePID =
        (
          <div fill>
            <Table condensed striped>
              <thead>
                <tr><th></th><th>Proportional</th><th>Integral</th><th>Derivative</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Roll</td>
                  <td><NumericValue precision={pPrecision} primaryValue={pPids.pRoll} secondaryValue={sPids.pRoll} showDifference={this.depsMatch("p_roll")}/></td>
                  <td><NumericValue precision={iPrecision} primaryValue={pPids.iRoll} secondaryValue={sPids.iRoll} showDifference={this.depsMatch("i_roll")}/></td>
                  <td><NumericValue precision={dPrecision} primaryValue={pPids.dRoll} secondaryValue={sPids.dRoll} showDifference={this.depsMatch("d_roll")}/></td>
                </tr>
                <tr>
                  <td>Pitch</td>
                  <td><NumericValue precision={pPrecision} primaryValue={pPids.pPitch} secondaryValue={sPids.pPitch} showDifference={this.depsMatch("p_pitch")}/></td>
                  <td><NumericValue precision={iPrecision} primaryValue={pPids.iPitch} secondaryValue={sPids.iPitch} showDifference={this.depsMatch("i_pitch")}/></td>
                  <td><NumericValue precision={dPrecision} primaryValue={pPids.dPitch} secondaryValue={sPids.dPitch} showDifference={this.depsMatch("d_pitch")}/></td>
                </tr>
                <tr>
                  <td>Yaw</td>
                  <td><NumericValue precision={pPrecision} primaryValue={pPids.pYaw} secondaryValue={sPids.pYaw} showDifference={this.depsMatch("p_yaw")}/></td>
                  <td><NumericValue precision={iPrecision} primaryValue={pPids.iYaw} secondaryValue={sPids.iYaw} showDifference={this.depsMatch("i_yaw")}/></td>
                  <td><NumericValue precision={dPrecision} primaryValue={pPids.dYaw} secondaryValue={sPids.dYaw} showDifference={this.depsMatch("d_yaw")}/></td>
                </tr>
              </tbody>
            </Table>
            <Table condensed striped>
              <tbody>
                <tr>
                  <td>PID Controller</td>
                  <td><NumericValue primaryValue={p.pid_controller} secondaryValue={s.pid_controller}/></td>
                </tr>
                <tr>
                  <td>looptime</td>
                  <td><NumericValue primaryValue={p.looptime} secondaryValue={s.looptime}/></td>
                </tr>
              </tbody>
            </Table>
          </div>
      );

      var rates =
        (
          <Table condensed striped>
            <tbody>
              { this.getNumericRows([{"name": "Roll", "key": "roll_rate", "divisor": 100.},
                                     {"name": "Pitch", "key": "pitch_rate", "divisor": 100.},
                                     {"name": "Yaw", "key": "yaw_rate", "divisor": 100.},
                                     {"name": "TPA", "key": "tpa_rate", "divisor": 100.},
                                     {"name": "TPA Breakpoint", "key": "tpa_breakpoint"}]) }
            </tbody>
          </Table>
        );
      var filter =
        (
          <Table condensed striped>
            <tbody>
              { this.getNumericRows([{"key": "gyro_lpf"},
                                     {"key": "dterm_cut_hz"},
                                     {"key": "pterm_cut_hz"},
                                     {"key": "gyro_cut_hz"}]) }
            </tbody>
          </Table>
        );
      if (this.props.primarySettings && this.props.secondarySettings) {
        let interestingOther = [];
        for (let other of this.state.otherSettings) {
          if (other in this.props.primarySettings &&
              other in this.props.secondarySettings &&
              (this.props.primarySettings[other] !== this.props.secondarySettings[other]) &&
              this.depsMatch(other)) {
            interestingOther.push({"key": other});
          }
        }
        var other = null;
        if (interestingOther.length > 0) {
          other = (
            <Table condensed striped>
              <tbody>
                { this.getNumericRows(interestingOther) }
              </tbody>
            </Table>
          );
        }
      }
    }
    var content;
    if (this.props.editing) {
      let alert;
      if (this.state.error) {
        alert = <Alert bsStyle="danger">{this.state.error}</Alert>;
      }
      content = (<form>
                  {alert}
                  <Input label="Cleanflight GUI backup" onChange={this.onChange} ref="cleanflight_gui" type="file"/>
                  <Input label="Cleanflight CLI dump" onChange={this.onChange} ref="cleanflight_cli" type="file"/>
                  <hr/>
                 </form>);
    } else {
      if (other) {
        other = (<div><h3>Other</h3>{other}</div>);
      }
      content = (<div className="pids" fill>
                  <div><h3>Firmware</h3>{firmware}</div>
                  <div><h3>Core PIDs</h3>{corePID}</div>
                  <div><h3>Rates</h3>{rates}</div>
                  <div><h3>Filter</h3>{filter}</div>
                  { other }
                 </div>);
    }
    return (<Panel header="Flight Controller Settings">
              {content}
            </Panel>);
  }
}
FlightControllerSettings.propTypes = {
  editing: React.PropTypes.bool,
  primaryParts: React.PropTypes.object,
  primarySettings: React.PropTypes.oneOfType([React.PropTypes.string,
                                              React.PropTypes.object]),
  secondaryParts: React.PropTypes.object,
  secondarySettings: React.PropTypes.oneOfType([React.PropTypes.string,
                                                React.PropTypes.object])
};
