import React from "react";

import BuildCard from "./build-card";

export default class BuildList extends React.Component {
  constructor() {
    super();
    console.log("buildlist");
    this.render = this.render.bind(this);
  }

  render() {
    var buildIds = ["tannewt/Blackout",
                    "kvanvranken/QAV250"];
    var flightInfo = {"tannewt/Blackout":
                       {"hd": {"url": "-t-pb3jMmbk",
                               "arm_time": 28.47},
                        "flight": {"url": "DsrK2Y6CjhY",
                                   "arm_time": 0},
                        "blackbox": {"url": "https://www.dropbox.com/s/nnh9tau26rmr2og/LOG00344.TXT?dl=0"}},
                      "kvanvranken/QAV250": {"hd": {"url": "vRNahTMs5zg",
                              "arm_time": 0},
                       "flight": {"url": "JMKLkgrkkoE",
                                  "arm_time": 0},
                       "blackbox": {"url": ""}}};
    var builds = [];
    for (var i in buildIds) {
      builds.push((<BuildCard flightInfo={ flightInfo[buildIds[i]]} id={ buildIds[i] } key={ buildIds[i]}/>));
    }
    return <div>{builds}</div>;
  }
}
