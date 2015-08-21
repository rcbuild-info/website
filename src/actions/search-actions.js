var alt = require("../alt");

class SearchActions {
  constructor() {
    this.generateActions("loadedBuildList", "loadBuildListFailed");
  }
}

module.exports = alt.createActions(SearchActions);
