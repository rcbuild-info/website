var alt = require("../alt");

class SiteActions {
  constructor() {
    this.generateActions("editBuild", "discardBuild");
  }

  logInUser(user) {
    this.dispatch(user);
  }

  navigateToPage(routeInfo) {
    let pageInfo = {};
    pageInfo.page = routeInfo.routes[1].name;

    if (pageInfo.page === "build" || pageInfo.page === "editbuild") {
      pageInfo.primaryBuildVersion = {"user": routeInfo.params.user,
                                      "branch": routeInfo.params.branch,
                                      "key": routeInfo.params.user + "/" + routeInfo.params.branch + "@HEAD"};
    }
    this.dispatch(pageInfo);
  }
}

module.exports = alt.createActions(SiteActions);
