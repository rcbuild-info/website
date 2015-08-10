var alt = require("../alt");

import BuildActions from "../actions/build-actions";
import SiteActions from "../actions/site-actions";
import BuildSource from "../sources/build-source";

import clone from "clone";

import PartStore from "./part-store";

class BuildStore {
  constructor() {
    this.on("error", (err) => {
      console.log(err);
    });

    this.primaryBuildVersion = null;
    this.secondaryBuildVersion = null;
    this.savedPrimaryBuildVersion = null;
    this.builds = {};

    this.buildList = {};
    this.currentListPage = null;

    this.exportAsync(BuildSource);
    this.bindListeners({
      navigateToPage: SiteActions.navigateToPage,
      loadedBuild: BuildActions.loadedBuild,
      loadBuildFailed: BuildActions.loadBuildFailed,
      createBuild: BuildActions.createBuild,
      createdBuild: BuildActions.createdBuild,
      createBuildFailed: BuildActions.createBuildFailed,
      saveBuild: BuildActions.saveBuild,
      savedBuild: BuildActions.savedBuild,
      saveBuildFailed: BuildActions.saveBuildFailed,
      setBuildPart: BuildActions.setBuildPart,
      editBuild: BuildActions.editBuild,
      discardBuild: BuildActions.editBuild,
      setSettings: BuildActions.setSettings,
      loadedSettings: BuildActions.loadedSettings,
      loadSettingsFailed: BuildActions.loadSettingsFailed,
      loadedBuildList: BuildActions.loadedBuildList,
      loadBuildListFailed: BuildActions.loadBuildListFailed,
      loadedSimilar: BuildActions.loadedSimilar,
      loadSimilarFailed: BuildActions.loadSimilarFailed
    });
  }
  navigateToPage(pageInfo) {
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
      } else {
        this.secondaryBuildVersion = null;
      }
    } else if (pageInfo.page === "builds") {
      this.primaryBuildVersion = null;
      this.secondaryBuildVersion = null;
      this.currentListPage = pageInfo.listPage;
      this.getInstance().loadBuildList(pageInfo.listPage);
    }
    if (this.primaryBuildVersion) {
      this.getInstance().loadBuild(this.primaryBuildVersion);
    }
    if (this.secondaryBuildVersion) {
      this.getInstance().loadBuild(this.secondaryBuildVersion);
    }
  }
  loadParts(parts) {
    if (Array.isArray(parts)) {
      for (let part of parts) {
        if (part !== "") {
          PartStore.loadPart(part);
        }
      }
    } else if (parts !== ""){
      PartStore.loadPart(parts);
    }
  }
  editBuild() {
    this.savedPrimaryBuildVersion = clone(this.primaryBuildVersion);
    this.primaryBuildVersion.commit = "staged";
    this.primaryBuildVersion.key = this.primaryBuildVersion.user + "/" + this.primaryBuildVersion.branch + "@staged";
    this.builds[this.primaryBuildVersion] = this.builds[this.savedPrimaryBuildVersion.key];
  }
  setBuildPart(change) {
    let build = this.builds[this.primaryBuildVersion.key];
    build.parts.config[change.category] = change.partIDs;
    this.loadParts(change.partIDs);
    build.state = "unsaved";
    build.dirty.parts = true;
  }
  setSettings(settings) {
    let build = this.builds[this.primaryBuildVersion.key];
    if (!build.dirty.settings) {
      build.dirty.settings = {};
    }
    build.state = "unsaved";
    for (let key of Object.keys(settings)) {
      build.settings[key] = settings[key];
      build.dirty.settings[key] = true;
    }
  }
  saveBuild() {
    let stagedKey = this.primaryBuildVersion.key;
    this.builds[stagedKey].state = "saving";
    this.getInstance().saveBuild(this.savedPrimaryBuildVersion, this.builds[stagedKey]);
  }
  discardBuild() {
    this.primaryBuildVersion = this.savedPrimaryBuildVersion;
    this.savedPrimaryBuildVersion = null;
  }
  savedBuild(response) {
    this.builds[this.savedPrimaryBuildVersion.key] = this.builds[this.primaryBuildVersion.key];
    this.discardBuild();
    let key = response.config.buildVersion.key;
    this.builds[key].state = "exists";
  }
  saveBuildFailed(response) {
    this.builds[response.config.buildVersion.key].state = "save-failed";
  }
  createBuild(buildVersion) {
    this.getInstance().createBuild(buildVersion);
  }
  createdBuild(response) {
    this.getInstance().loadBuild(response.config.buildVersion);
  }
  createBuildFailed(response) {
    this.builds[response.config.buildVersion.key].state = "create-failed";
  }
  loadBuild(buildVersion) {
    this.getInstance().loadBuild(buildVersion);
  }
  loadedBuild(response) {
    if (typeof response.data === "string" || response.data instanceof String) {
      this.builds[response.config.buildVersion.key] = {"state": "invalid"};
      return;
    }
    this.builds[response.config.buildVersion.key] = {
      "state": "exists",
      "dirty": {},
      "parts": response.data,
      "settings": {"fc": undefined},
      "similar": {}
    };

    let config = response.data.config;
    for (let category of Object.keys(config)) {
      this.loadParts(config[category]);
    }
    this.getInstance().loadSettingsFile({"path": ["fc", "cf_cli"],
                                         "buildVersion": response.config.buildVersion},
                                        "cleanflight_cli_dump.txt");
    this.getInstance().loadSimilar(response.config.buildVersion);
  }
  loadBuildFailed(response) {
    if (response.status === 404) {
      this.builds[response.config.buildVersion.key] = {
        "state": "does-not-exist"
      };
    }
  }
  loadedSettings(response) {
    let settings = this.builds[response.config.settingInfo.buildVersion.key].settings;
    let path = response.config.settingInfo.path;
    for (let i = 0; i < path.length - 1; i++) {
      if (!settings[path[i]]) {
        settings[path[i]] = {};
        settings = settings[path[i]];
      }
    }
    settings[path[path.length - 1]] = response.data;
  }
  loadSettingsFailed(response) {
    console.log(response);
  }
  loadedBuildList(response) {
    this.buildList[response.config.listPage] = response.data;
  }
  loadBuildListFailed(response) {
    console.log(response);
  }
  loadedSimilar(response) {
    this.builds[response.config.buildVersion.key].similar = response.data;
  }
  loadSimilarFailed(response) {
    console.log(response);
  }
}

module.exports = alt.createStore(BuildStore, "BuildStore");
