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
                                      "commit": routeInfo.params.commit || "HEAD",
                                      "isHead": routeInfo.params.commit === undefined || routeInfo.params.commit === "" || routeInfo.params.commit === "HEAD",
                                      "key": routeInfo.params.user + "/" + routeInfo.params.branch + "@" + (routeInfo.params.commit || "HEAD")};
    }
    if (pageInfo.page === "compare") {
      pageInfo.primaryBuildVersion = {"user": routeInfo.params.primaryUser,
                                      "branch": routeInfo.params.primaryBranch,
                                      "commit": routeInfo.params.primaryCommit,
                                      "isHead": routeInfo.params.commit === undefined || routeInfo.params.commit === "" || routeInfo.params.primaryCommit === "HEAD",
                                      "key": routeInfo.params.primaryUser + "/" + routeInfo.params.primaryBranch + "@" + routeInfo.params.primaryCommit};
      pageInfo.secondaryBuildVersion = {"user": routeInfo.params.secondaryUser,
                                        "branch": routeInfo.params.secondaryBranch,
                                        "commit": routeInfo.params.secondaryCommit,
                                        "isHead": routeInfo.params.secondaryCommit === "HEAD",
                                        "key": routeInfo.params.secondaryUser + "/" + routeInfo.params.secondaryBranch + "@" + routeInfo.params.secondaryCommit};
    }
    if (pageInfo.page === "builds") {
      pageInfo.listPage = routeInfo.query.page;
      pageInfo.parts = routeInfo.query.parts;
    }
    this.dispatch(pageInfo);
  }
}

module.exports = alt.createActions(SiteActions);
