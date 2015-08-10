import React from "react";

import PageHeader from "react-bootstrap/lib/PageHeader";
import Pagination from "react-bootstrap/lib/Pagination";

import BuildCard from "./build-card";
import BuildStore from "../stores/build-store";

export default class BuildList extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onBuildChange = this.onBuildChange.bind(this);
    this.onSelect = this.onSelect.bind(this);
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
    this.setState({"buildList": state.buildList[state.currentListPage]});
  }

  onSelect(event, selectedEvent) {
    this.context.router.transitionTo("builds", {"page": selectedEvent.eventKey});
  }

  render() {
    var yourBuilds = [];
    var otherBuilds = [];
    var pagination;
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
      pagination = (<div className="text-center"><Pagination
                      activePage={this.state.buildList.currentPage}
                      ellipsis
                      items={this.state.buildList.totalPages}
                      maxButtons={5}
                      next
                      onSelect={this.onSelect}
                      prev/></div>);
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
              {pagination}
            </div>);
  }
}
BuildList.contextTypes = {
  router: React.PropTypes.func
};
