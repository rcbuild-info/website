import alt from "../alt";

import BuildActions from "../actions/build-actions";
import SiteActions from "../actions/site-actions";

import clone from "clone";

class SiteStore {
  constructor() {
    this.on("error", (err) => {
      console.log(err);
    });

    this.page = null;
    this.primaryBuild = null;
    this.secondaryBuild = null;
    this.editingBuild = false;
    this.partClassification = null;
    this.loggedInUser = null;

    this.bindListeners({
      logInUser: SiteActions.logInUser,
      navigateToPage: SiteActions.navigateToPage,
      editBuild: SiteActions.editBuild,
      discardBuild: SiteActions.discardBuild,
      saveBuild: BuildActions.saveBuild,
      savedBuild: BuildActions.savedBuild
    });
  }

  logInUser(user) {
    this.loggedInUser = user;
  }

  navigateToPage(pageInfo) {
    this.page = pageInfo.page;
    if (this.page === "build") {
      this.primaryBuild = pageInfo.primaryBuild;
      if (pageInfo.secondaryBuild) {
        this.secondaryBuild = pageInfo.secondaryBuild;
      }
    } else if (this.page === "parts") {
      this.partClassification = pageInfo.partClassification;
    }
  }

  editBuild() {
    this.editingBuild = true;
    this.savedPrimaryBuild = clone(this.primaryBuild);
    this.primaryBuild.commit = "staged";
    this.primaryBuild.key = this.primaryBuild.user + "/" + this.primaryBuild.branch + "@staged";
  }

  discardBuild() {
    this.editingBuild = false;
    this.primaryBuild = this.savedPrimaryBuild;
    this.savedPrimaryBuild = null;
  }

  saveBuild() {
    this.editingBuild = false;
  }

  savedBuild() {
    this.discardBuild();
  }
}

module.exports = alt.createStore(SiteStore, "SiteStore");
