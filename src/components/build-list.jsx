import React from "react";

import PageHeader from "react-bootstrap/lib/PageHeader";

import BuildCard from "./build-card";
import BuildStore from "../stores/build-store";

export default class BuildList extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onBuildChange = this.onBuildChange.bind(this);
    this.state = {};
  }
  componentDidMount() {
    BuildStore.listen(this.onBuildChange);
    this.onBuildChange(BuildStore.getState());
  }

  componentWillUnmount() {
    BuildStore.unlisten(this.onBuildChange);
  }

  onBuildChange(state) {
    this.setState({"buildList": state.buildList});
  }

  render() {
    var yourBuilds = [];
    var otherBuilds = [];
    if (this.state.buildList) {
      if ("yours" in this.state.buildList) {
        for (let build of this.state.buildList.yours) {
          yourBuilds.push((<BuildCard build={build} key={ "y" + build.user + build.branch } showUser={false}/>));
        }
      }
      if ("others" in this.state.buildList) {
        for (let build of this.state.buildList.others) {
          otherBuilds.push((<BuildCard build={build} key={ "o" + build.user + build.branch } showUser={true}/>));
        }
      }
    }
    let yourBuildsSection;
    let buildSectionName = "Builds";
    if (yourBuilds.length > 0) {
      yourBuildsSection = <div><PageHeader>My Builds</PageHeader>{yourBuilds}</div>;
      buildSectionName = "Other Builds";
    }
    return (<div>
              {yourBuildsSection}
              <PageHeader>{buildSectionName}</PageHeader>
              {otherBuilds}
            </div>);
  }
}
