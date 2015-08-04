var alt = require("../alt");

import BuildActions from "../actions/build-actions";
import SiteActions from "../actions/site-actions";
import BuildSource from "../sources/build-source";

import PartStore from "./part-store";
import SiteStore from "./site-store";

class BuildStore {
  constructor() {
    this.on("error", (err) => {
      console.log(err);
    });

    this.builds = {};

    this.exportAsync(BuildSource);
    this.bindListeners({
      handleLoadBuild: BuildActions.loadBuild,
      handleLoadedBuild: BuildActions.loadedBuild,
      handleLoadBuildFailed: BuildActions.loadBuildFailed,
      handleCreateBuild: BuildActions.createBuild,
      handleCreatedBuild: BuildActions.createdBuild,
      handleCreateBuildFailed: BuildActions.createBuildFailed,
      handleSaveBuild: BuildActions.saveBuild,
      handleSavedBuild: BuildActions.savedBuild,
      handleSaveBuildFailed: BuildActions.saveBuildFailed,
      handleSetBuildPart: BuildActions.setBuildPart,
      handleEditBuild: SiteActions.editBuild,
      handleSetSettings: BuildActions.setSettings,
      handleLoadedSettings: BuildActions.loadedSettings,
      handleLoadSettingsFailed: BuildActions.loadSettingsFailed
    });
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
  handleEditBuild() {
    this.waitFor(SiteStore.dispatchToken);
    let key = SiteStore.getState().primaryBuild.key;
    this.builds[key] = this.builds[SiteStore.getState().savedPrimaryBuild.key];
  }
  handleSetBuildPart(change) {
    let build = this.builds[SiteStore.getState().primaryBuild.key];
    build.parts.config[change.category] = change.partIDs;
    this.loadParts(change.partIDs);
    build.state = "unsaved";
    build.dirty.parts = true;
  }
  handleSetSettings(settings) {
    let build = this.builds[SiteStore.getState().primaryBuild.key];
    if (!build.dirty.settings) {
      build.dirty.settings = {};
    }
    build.state = "unsaved";
    for (let key of Object.keys(settings)) {
      build.settings[key] = settings[key];
      build.dirty.settings[key] = true;
    }
  }
  handleSaveBuild() {
    this.unsavedKey = SiteStore.getState().primaryBuild.key;
    this.builds[this.unsavedKey].state = "saving";
    this.savingKey = SiteStore.getState().savedPrimaryBuild.key;
    this.getInstance().saveBuild(SiteStore.getState().primaryBuild,
                                 this.builds[this.unsavedKey]);
  }
  handleSavedBuild() {
    this.builds[this.savingKey] = this.builds[this.unsavedKey];
    this.builds[this.savingKey].state = "exists";
    this.savingKey = null;
    this.unsavedKey = null;
  }
  handleSaveBuildFailed(response) {
    this.builds[response.config.buildVersion.key].state = "save-failed";
  }
  handleCreateBuild(buildVersion) {
    this.getInstance().createBuild(buildVersion);
  }
  handleCreatedBuild(response) {
    this.getInstance().loadBuild(response.config.buildVersion);
  }
  handleCreateBuildFailed(response) {
    this.builds[response.config.buildVersion.key].state = "create-failed";
  }
  handleLoadBuild(buildVersion) {
    this.getInstance().loadBuild(buildVersion);
  }
  handleLoadedBuild(response) {
    this.builds[response.config.buildVersion.key] = {
      "state": "exists",
      "dirty": {},
      "parts": response.data,
      "settings": {"fc": undefined}
    };
    let config = response.data.config;
    for (let category of Object.keys(config)) {
      this.loadParts(config[category]);
    }
    this.getInstance().loadSettingsFile({"path": ["fc", "cf_cli"],
                                         "buildVersion": response.config.buildVersion},
                                        "cleanflight_cli_dump.txt");
  }
  handleLoadBuildFailed(response) {
    if (response.status === 404) {
      this.builds[response.config.buildVersion.key] = {
        "state": "does-not-exist"
      };
    }
  }
  handleLoadedSettings(response) {
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
  handleLoadSettingsFailed(response) {
    console.log(response);
  }
}

module.exports = alt.createStore(BuildStore, "BuildStore");
