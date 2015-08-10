var alt = require("../alt");

class SiteActions {
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
    if (pageInfo.page === "compare") {
      pageInfo.primaryBuildVersion = {"user": routeInfo.params.primaryUser,
                                      "branch": routeInfo.params.primaryBranch,
                                      "key": routeInfo.params.primaryUser + "/" + routeInfo.params.primaryBranch + "@HEAD"};
      pageInfo.secondaryBuildVersion = {"user": routeInfo.params.secondaryUser,
                                        "branch": routeInfo.params.secondaryBranch,
                                        "key": routeInfo.params.secondaryUser + "/" + routeInfo.params.secondaryBranch + "@HEAD"};
    }
    if (pageInfo.page === "builds") {
      pageInfo.listPage = routeInfo.params.page;
    }
    this.dispatch(pageInfo);
  }
}

module.exports = alt.createActions(SiteActions);
