var alt = require("../alt");

import SearchActions from "../actions/search-actions";
import SearchSource from "../sources/search-source";
import SiteActions from "../actions/site-actions";

class SearchStore {
  constructor() {
    this.on("error", (err) => {
      console.log(err);
    });
    this.buildList = {};
    this.currentListPage = 1;
    this.currentParts = [];
    this.currentSearchKey = "";

    this.exportAsync(SearchSource);
    this.bindListeners({
      navigateToPage: SiteActions.navigateToPage,
      loadedBuildList: SearchActions.loadedBuildList,
      loadBuildListFailed: SearchActions.loadBuildListFailed
    });
  }
  navigateToPage(pageInfo) {
    if (pageInfo.page === "builds") {
      this.currentParts = pageInfo.parts;
      if (!this.currentParts) {
        this.currentParts = [];
      }
      this.currentSearchKey = "";
      for (let part of this.currentParts) {
        this.currentSearchKey += part;
      }
      this.currentListPage = pageInfo.listPage;
      if (!this.currentListPage) {
        this.currentListPage = 1;
      }
      this.getInstance().loadBuildList(this.currentParts, this.currentListPage,
                                       {"searchKey": this.currentSearchKey,
                                        "listPage": this.currentListPage});
    }
  }
  loadedBuildList(response) {
    if (!(response.config.searchKey in this.buildList)) {
      this.buildList[response.config.searchKey] = {};
    }
    this.buildList[response.config.searchKey][response.config.listPage] = response.data;
  }
  loadBuildListFailed(response) {
    console.log(response);
  }
}

module.exports = alt.createStore(SearchStore, "SearchStore");
