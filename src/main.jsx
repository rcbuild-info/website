import React from "react";

import RCBuildInfo from "./components/rcbuild.info.jsx";
import BuildPage from "./components/build-page";
import BuildList from "./components/build-list";
import HomePage from "./components/home-page";
import CreateBuildPage from "./components/create-build-page";

import SiteActions from "./actions/site-actions";

import Router from "react-router";
var Route = Router.Route;
var DefaultRoute = Router.DefaultRoute;
var Redirect = Router.Redirect;

var routes = (
  <Route handler={RCBuildInfo} name="home" path="/">
    <DefaultRoute handler={HomePage}/>
    <Route handler={CreateBuildPage} name="createbuild" path="createbuild" />
    <Route handler={BuildList} name="builds" path="builds" />
    <Route handler={BuildPage} name="build" path="build/:user/:branch/:commit?" />
    <Route handler={BuildPage} name="editbuild" path="edit/:user/:branch" />
    <Route handler={BuildPage} name="compare" path="/compare/:primaryUser/:primaryBranch/:primaryCommit/vs/:secondaryUser/:secondaryBranch/:secondaryCommit" />
    <Redirect from="/compare/:primaryUser/:primaryBranch/vs/:secondaryUser/:secondaryBranch" to="compare" />
  </Route>);

Router.run(routes, Router.HistoryLocation, (Root, state) => {
  React.render(<Root/>, document.body);
  SiteActions.navigateToPage(state);
  let pageview = {"page": state.path};
  ga("send", "pageview", pageview);
});
