import React from "react";

import PageHeader from "react-bootstrap/lib/PageHeader";
import Pagination from "react-bootstrap/lib/Pagination";

var Tokenizer = require('react-typeahead').Tokenizer;

import BuildCard from "./build-card";
import SearchStore from "../stores/search-store";
import PartStore from "../stores/part-store";

export default class BuildList extends React.Component {
  constructor() {
    super();
    this.render = this.render.bind(this);
    this.onSearchChange = this.onSearchChange.bind(this);
    this.onPartChange = this.onPartChange.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.onAddPart = this.onAddPart.bind(this);
    this.onRemovePart = this.onRemovePart.bind(this);
    this.filterOption = this.filterOption.bind(this);
    this.state = {"currentParts": [], "currentPartIDs": []};

    this.regexCache = {};
  }
  componentDidMount() {
    SearchStore.listen(this.onSearchChange);
    this.onSearchChange(SearchStore.getState());

    PartStore.listen(this.onPartChange);
    this.onPartChange(PartStore.getState());
  }

  componentWillUnmount() {
    SearchStore.unlisten(this.onSearchChange);
    PartStore.unlisten(this.onPartChange);
  }

  static rsplit(string, sep, maxsplit) {
    var split = string.split(sep);
    return maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
  }

  onSearchChange(state) {
    let newState = {"currentPartIDs": state.currentParts};
    if (newState.currentPartIDs && this.state.shortPartsByID) {
      let newParts = [];
      for (let id of newState.currentPartIDs) {
        newParts.push(this.state.shortPartsByID[id]);
      }
      newState["currentParts"] = newParts;
    }
    if (state.buildList[state.currentSearchKey] && state.buildList[state.currentSearchKey][state.currentListPage]) {
      newState["buildList"] = state.buildList[state.currentSearchKey][state.currentListPage];
    }
    this.setState(newState);
  }

  static sortByPartCategoryThenFullName(a, b) {
    if (a.category === b.category) {
      if (a.fullName < b.fullName) {
        return -1;
      } else if (a.fullName > b.fullName) {
        return 1;
      }
      return 0;
    } else if (b.category === "") {
      return -1;
    } else if (a.category === "") {
      return 1;
    } else if (a.category < b.category) {
      return -1;
    } else if (a.category > b.category) {
      return 1;
    }
    return 0;
  }

  onPartChange(state) {
    let partList = [];
    if (state.shortPartsByID) {
      for (let partID of Object.keys(state.shortPartsByID)) {
        partList.push(state.shortPartsByID[partID]);
      }
    }
    partList.sort(BuildList.sortByPartCategoryThenFullName);
    let currentParts = [];
    if (this.state.currentPartIDs && state.shortPartsByID) {
      for (let id of this.state.currentPartIDs) {
        currentParts.push(this.state.shortPartsByID[id]);
      }
    }
    this.setState({"partList": partList,
                   "currentParts": currentParts,
                   "shortPartsByID": state.shortPartsByID});
  }

  onSelect(event, selectedEvent) {
    this.context.router.transitionTo("builds", {}, {"page": selectedEvent.eventKey});
  }

  onAddPart(part) {
    if (part.id in this.state.currentPartIDs) {
      return;
    }
    let newPartIDs = this.state.currentPartIDs.slice(0);
    newPartIDs.push(part.id);
    this.context.router.transitionTo("builds", {}, {"page": 1, "parts": newPartIDs});
  }

  onRemovePart(part) {
    if (this.state.currentPartIDs.indexOf(part.id) === -1) {
      return;
    }
    let newPartIDs = this.state.currentPartIDs.slice(0);
    newPartIDs.splice(newPartIDs.indexOf(part.id), 1);
    this.context.router.transitionTo("builds", {}, {"page": 1, "parts": newPartIDs});
  }

  filterOption(input, option) {
    if (input.length < 4 && !option.category) {
      return false;
    }
    let regex;
    if (input in this.regexCache) {
      regex = this.regexCache[input];
    } else {
      regex = new RegExp(input.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "i");
      this.regexCache[input] = regex;
    }
    return regex.test(option.fullName) || input === option.category;
  }

  displayOption(option, index) {
    if (option === undefined) {
      return "unknown";
    }
    return option.fullName;
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
    let buildSectionName = null;
    if (yourBuilds.length > 0) {
      yourBuildsSection = <div><h3>Mine</h3>{yourBuilds}</div>;
      buildSectionName = <h3>Others</h3>;
    }
    let placeholder = "Search";
    if (this.state.currentParts.length > 0) {
      placeholder = "";
    }
    return (<div>
              <PageHeader>Builds</PageHeader>
              <Tokenizer
                defaultSelected={ this.state.currentParts }
                displayOption={this.displayOption}
                filterOption={this.filterOption}
                maxVisible={25}
                onClick={console.log}
                onTokenAdd={this.onAddPart}
                onTokenRemove={this.onRemovePart}
                options={this.state.partList}
                placeholder={placeholder} />
              {yourBuildsSection}
              {buildSectionName}
              {otherBuilds}
              {pagination}
            </div>);
  }
}
BuildList.contextTypes = {
  router: React.PropTypes.func
};
