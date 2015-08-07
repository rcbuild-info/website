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
    this.primaryBuildVersion = null;
    this.secondaryBuildVersion = null;
    this.loggedInUser = null;
    this.savedPrimaryBuildVersion = null;

    this.bindListeners({
      logInUser: SiteActions.logInUser,
      navigateToPage: SiteActions.navigateToPage,
      editBuild: SiteActions.editBuild,
      discardBuild: SiteActions.discardBuild,
      savedBuild: BuildActions.savedBuild
    });
  }

  logInUser(user) {
    this.loggedInUser = user;
  }

  navigateToPage(pageInfo) {
    this.page = pageInfo.page;
    if (pageInfo.page === "build" || pageInfo.page === "editbuild" || pageInfo.page === "compare") {
      if (this.savedPrimaryBuildVersion === null ||
          this.savedPrimaryBuildVersion.key !== pageInfo.primaryBuildVersion.key) {
        this.primaryBuildVersion = pageInfo.primaryBuildVersion;
      }
      if (pageInfo.page === "editbuild") {
        this.editBuild();
      }
      if (pageInfo.page === "compare") {
        this.secondaryBuildVersion = pageInfo.secondaryBuildVersion;
      }
    }
  }

  editBuild() {
    this.savedPrimaryBuildVersion = clone(this.primaryBuildVersion);
    this.primaryBuildVersion.commit = "staged";
    this.primaryBuildVersion.key = this.primaryBuildVersion.user + "/" + this.primaryBuildVersion.branch + "@staged";
  }

  discardBuild() {
    this.primaryBuildVersion = this.savedPrimaryBuildVersion;
    this.savedPrimaryBuildVersion = null;
  }

  savedBuild() {
    this.discardBuild();
  }
}

module.exports = alt.createStore(SiteStore, "SiteStore");
