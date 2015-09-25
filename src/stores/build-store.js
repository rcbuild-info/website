var alt = require("../alt");

import BuildActions from "../actions/build-actions";
import SiteActions from "../actions/site-actions";
import BuildSource from "../sources/build-source";

import clone from "clone";
import _ from "underscore";

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
      addPhoto: BuildActions.addPhoto,
      deletePhoto: BuildActions.deletePhoto,
      addVideo: BuildActions.addVideo,
      deleteVideo: BuildActions.deleteVideo,
      editBuild: BuildActions.editBuild,
      discardBuild: BuildActions.discardBuild,
      setSettings: BuildActions.setSettings,
      loadedSettings: BuildActions.loadedSettings,
      loadSettingsFailed: BuildActions.loadSettingsFailed,
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
    } else if (pageInfo.page === "builds" || pageInfo.page === undefined) {
      this.primaryBuildVersion = null;
      this.secondaryBuildVersion = null;
    }
    if (this.primaryBuildVersion) {
      this.getInstance().loadBuild(this.primaryBuildVersion);
    }
    if (this.secondaryBuildVersion) {
      this.getInstance().loadBuild(this.secondaryBuildVersion);
    }
  }
  editBuild() {
    this.savedPrimaryBuildVersion = clone(this.primaryBuildVersion);
    this.primaryBuildVersion.commit = "staged";
    this.primaryBuildVersion.key = this.primaryBuildVersion.user + "/" + this.primaryBuildVersion.branch + "@staged";
    this.builds[this.primaryBuildVersion.key] = clone(this.builds[this.savedPrimaryBuildVersion.key]);
  }
  setBuildPart(change) {
    let build = this.builds[this.primaryBuildVersion.key];
    build.parts.config[change.category] = change.partIDs;
    build.state = "unsaved";
    build.dirty.parts = true;
  }
  addPhoto(photo) {
    let build = this.builds[this.primaryBuildVersion.key];
    for (let existing of build.info.media.photos) {
      if (_.isEqual(existing, photo)) {
        return;
      }
    }
    // By default we have one template entry that we should remove after we add
    // one entry.
    if (build.info.media.photos.length === 1 &&
        (Object.keys(build.info.media.photos[0]) > 1 ||
         build.info.media.photos[0].imgur.imageId === "")) {
     build.info.media.photos.pop();
    }
    build.info.media.photos.push(photo);
    build.state = "unsaved";
    build.dirty.info = true;
  }
  deletePhoto(index) {
    let build = this.builds[this.primaryBuildVersion.key];
    build.info.media.photos.splice(index, 1);
    build.state = "unsaved";
    build.dirty.info = true;
  }
  addVideo(video) {
    let build = this.builds[this.primaryBuildVersion.key];
    for (let existing of build.info.media.videos) {
      if (_.isEqual(existing, video)) {
        return;
      }
    }
    // By default we have one template entry that we should remove after we add
    // one entry.
    if (build.info.media.videos.length === 1 &&
        (Object.keys(build.info.media.videos[0]) > 1 ||
         build.info.media.videos[0].youtube.videoId === "")) {
     build.info.media.videos.pop();
    }
    build.info.media.videos.push(video);
    build.state = "unsaved";
    build.dirty.info = true;
  }
  deleteVideo(index) {
    let build = this.builds[this.primaryBuildVersion.key];
    build.info.media.videos.splice(index, 1);
    build.state = "unsaved";
    build.dirty.info = true;
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
  discardBuild() {
    delete this.builds[this.primaryBuildVersion];
    this.primaryBuildVersion = this.savedPrimaryBuildVersion;
    this.savedPrimaryBuildVersion = null;
  }
  saveBuild() {
    let stagedKey = this.primaryBuildVersion.key;
    ga("send", "event", "build", "save", stagedKey);
    this.builds[stagedKey].state = "saving";
    this.getInstance().saveBuild(this.primaryBuildVersion, this.builds[stagedKey]);
  }
  savedBuild(response) {
    let buildVersion = response.config.buildVersion;
    buildVersion.commit = response.data.commit.slice(0, 8);
    let stagedKey = buildVersion.key;
    buildVersion.key = buildVersion.key.replace("staged", buildVersion.commit);
    ga("send", "event", "build", "saved", this.primaryBuildVersion.key);
    this.builds[buildVersion.key] = this.builds[stagedKey];
    this.builds[buildVersion.key].state = "exists";
    for (let alias of ["HEAD"]) {
      this.builds[buildVersion.key.replace(buildVersion.commit, alias)] = this.builds[buildVersion.key];
    }
    this.primaryBuildVersion = buildVersion;
    this.savedPrimaryBuildVersion = null;
    this.getInstance().loadSimilar(buildVersion);
  }
  saveBuildFailed(response) {
    ga("send", "event", "build", "saveFailed", response.config.buildVersion.key);
    this.builds[response.config.buildVersion.key].state = "save-failed";
  }
  createBuild(buildVersion) {
    ga("send", "event", "build", "create", buildVersion.user + "/" + buildVersion.branch);
    this.builds[buildVersion.key].state = "creating";
    this.getInstance().createBuild(buildVersion);
  }
  createdBuild(response) {
    let buildVersion = response.config.buildVersion;
    if (this.primaryBuildVersion &&
        this.primaryBuildVersion.user === buildVersion.user &&
        this.primaryBuildVersion.branch === buildVersion.branch) {
      this.primaryBuildVersion.commit = response.data.commit.slice(0, 8);
      this.primaryBuildVersion.key = this.primaryBuildVersion.key.replace("staged", this.primaryBuildVersion.commit);
    }
    ga("send", "event", "build", "created", buildVersion.user + "/" + buildVersion.branch);
    this.builds[buildVersion.key].state = "created";
    this.getInstance().loadBuild(this.primaryBuildVersion);
  }
  createBuildFailed(response) {
    if (response.status === 504 && response.config.attempt < 3) {
      setTimeout(
        function() {this.getInstance().createBuild(response.config.buildVersion, response.config.attempt + 1);}.bind(this),
        Math.pow(2, response.config.attempt) * 1000);
      return;
    }
    ga("send", "event", "build", "createFailed", response.config.buildVersion.user + "/" + response.config.buildVersion.branch);
    this.builds[response.config.buildVersion.key].state = "create-failed";
  }
  loadBuild(buildVersion) {
    this.getInstance().loadBuild(buildVersion);
  }
  loadedBuild(response) {
    let buildVersion = response.config.buildVersion;
    if (typeof response.data === "string" || response.data instanceof String) {
      this.builds[buildVersion.key] = {"state": "invalid"};
      return;
    }
    if (buildVersion.commit.length < 40) {
      let oldKey = buildVersion.key.slice(0);
      let oldCommit = buildVersion.commit;
      // If we loaded a staged version save a copy under staged and also under
      // the commit.
      let commit = response.data.commits[response.data.commits.length - 1].slice(0, 8);
      if (oldCommit === "staged") {
        this.builds[buildVersion.key] = clone({
          "state": "exists",
          "dirty": {},
          "info": response.data.info,
          "parts": response.data.build,
          "settings": {"fc": undefined},
          "similar": {},
          "this_snapshot": buildVersion.commit,
          "previous_snapshot": commit
        });
      }
      if (this.savedPrimaryBuildVersion) {
        buildVersion = this.savedPrimaryBuildVersion;
        oldCommit = buildVersion.commit;
      }
      buildVersion.commit = commit;
      buildVersion.key = buildVersion.key.replace(oldCommit, commit);
    }
    this.builds[buildVersion.key] = {
      "state": "exists",
      "dirty": {},
      "info": response.data.info,
      "parts": response.data.build,
      "settings": {"fc": undefined},
      "similar": {},
      "this_snapshot": buildVersion.commit
    };

    // If this is a head build then also store under the HEAD key.
    if (buildVersion.isHead) {
      for (let alias of ["HEAD"]) {
        this.builds[buildVersion.key.replace(buildVersion.commit, alias)] = this.builds[buildVersion.key];
      }
    }

    this.getInstance().loadSettingsFile({"path": ["fc", "cf_cli"],
                                         "buildVersion": buildVersion},
                                        "cleanflight_cli_dump.txt");
    this.getInstance().loadSimilar(buildVersion);
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
  loadedSimilar(response) {
    this.builds[response.config.buildVersion.key].similar = response.data;
  }
  loadSimilarFailed(response) {
    console.log(response);
  }
}

module.exports = alt.createStore(BuildStore, "BuildStore");
