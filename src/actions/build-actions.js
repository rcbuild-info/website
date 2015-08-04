var alt = require("../alt");

class BuildActions {
  constructor() {
    this.generateActions("createBuild", "createdBuild", "createBuildFailed", "loadBuild", "loadedBuild", "loadingBuild", "loadBuildFailed", "saveBuild", "savedBuild", "saveBuildFailed", "setBuildPart", "loadedSettings", "loadSettingsFailed", "setSettings");
  }
}

module.exports = alt.createActions(BuildActions);
