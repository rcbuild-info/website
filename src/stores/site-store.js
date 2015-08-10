import alt from "../alt";

import BuildActions from "../actions/build-actions";
import SiteActions from "../actions/site-actions";

class SiteStore {
  constructor() {
    this.on("error", (err) => {
      console.log(err);
    });

    this.page = null;
    this.loggedInUser = null;

    this.bindListeners({
      logInUser: SiteActions.logInUser,
      navigateToPage: SiteActions.navigateToPage
    });
  }

  logInUser(user) {
    this.loggedInUser = user;
  }

  navigateToPage(pageInfo) {
    this.page = pageInfo.page;
  }
}

module.exports = alt.createStore(SiteStore, "SiteStore");
