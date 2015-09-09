var alt = require("../alt");

class BuildActions {
  constructor() {
    this.generateActions("createBuild", "createdBuild", "createBuildFailed",
                         "loadBuild", "loadedBuild", "loadingBuild",
                         "loadBuildFailed", "editBuild", "discardBuild",
                         "saveBuild", "savedBuild", "saveBuildFailed",
                         "setBuildPart", "loadedSettings", "loadSettingsFailed",
                         "setSettings", "loadedSimilar", "loadSimilarFailed",
                         "addPhoto", "deletePhoto", "addVideo", "deleteVideo");
  }
}

module.exports = alt.createActions(BuildActions);
