import BuildActions from "../actions/build-actions";

import stringify from "json-stable-stringify";

import PartStore from "../stores/part-store";

import axios from "axios";

export default {
  loadBuild() {
    return {
      // remotely fetch something (required)
      remote(state, buildVersion) {
        return axios.get("/build/" + buildVersion.user + "/" + buildVersion.branch + ".json", {"buildVersion": buildVersion});
      },

      // this function checks in our local cache first
      // if the value is present it'll use that instead (optional).
      local(state, buildVersion) {
        return state.builds[buildVersion.key] ? state.builds[buildVersion] : null;
      },

      // here we setup some actions to handle our response
      success: BuildActions.loadedBuild, // (required)
      error: BuildActions.loadBuildFailed // (required)
    };
  },
  saveBuild() {
    return {
      remote(state, buildVersion, build) {
        let partCategories = PartStore.getState().categories;
        let newBuild = stringify(build.parts,
         {cmp: function(a, b) {
           if (!partCategories[a.key]) {
             return a.key.localeCompare(b.key);
           }
           return partCategories[a.key].order - partCategories[b.key].order;
          },
          space: 2});

        var formData = new FormData();
        if (build.dirty.settings) {
          if (build.dirty.settings.fc) {
            formData.append("cleanflight_gui_backup.json", build.settings.fc.cf_gui);
            formData.append("cleanflight_cli_dump.txt", build.settings.fc.cf_cli);
          }
        }
        if (build.dirty.parts) {
          formData.append("build.json", newBuild);
        }
        return axios.post("/build/" + buildVersion.user + "/" + buildVersion.branch + "/files",
                          formData,
                          {"buildVersion": buildVersion});
      },

      success: BuildActions.savedBuild, // (required)
      error: BuildActions.saveBuildFailed // (required)
    };
  },
  createBuild() {
    return {
      // remotely fetch something (required)
      remote(state, buildVersion) {
        return axios.post("/build/" + buildVersion.user + "/" + buildVersion.branch + ".json", null, {"buildVersion": buildVersion});
      },

      // this function checks in our local cache first
      // if the value is present it'll use that instead (optional).
      local(state, buildVersion) {
        if (state.builds[buildVersion.key] &&
            state.builds[buildVersion.key].state !== "does-not-exist") {
          return state.builds[buildVersion.key];
        }
        return null;
      },

      // here we setup some actions to handle our response
      success: BuildActions.createdBuild, // (required)
      error: BuildActions.createBuildFailed // (required)
    };
  },
  loadSettingsFile() {
    return {
      // remotely fetch something (required)
      remote(state, settingInfo, filename) {
        return axios.get("/build/" + settingInfo.buildVersion.user + "/" + settingInfo.buildVersion.branch + "/" + filename,
                        {"settingInfo": settingInfo});
      },

      // here we setup some actions to handle our response
      success: BuildActions.loadedSettings, // (required)
      error: BuildActions.loadSettingsFailed // (required)
    };
  }
};
