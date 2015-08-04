var alt = require("../alt");

import BuildActions from "./build-actions";
import PartActions from "./part-actions";

class SiteActions {
  constructor() {
    this.generateActions("editBuild", "discardBuild");
  }

  logInUser(user) {
    this.dispatch(user);
  }

  navigateToPage(pageInfo) {
    if (pageInfo.page === "build") {
      PartActions.loadCategories();
      BuildActions.loadBuild(pageInfo.primaryBuild);
      if (pageInfo.editingBuild) {
        PartActions.loadIndices();
      } else if (pageInfo.secondaryBuild) {
        BuildActions.loadBuild(pageInfo.secondaryBuild);
      }
    }
    this.dispatch(pageInfo);
  }
}

module.exports = alt.createActions(SiteActions);
