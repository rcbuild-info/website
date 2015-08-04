import PartActions from "../actions/part-actions";

import axios from "axios";

export default {
  loadCategories() {
    return {
      // remotely fetch something (required)
      remote() {
        return axios.get("/partCategories.json");
      },

      // this function checks in our local cache first
      // if the value is present it'll use that instead (optional).
      local(state) {
        return state.categories ? state.categories : null;
      },

      // here we setup some actions to handle our response
      success: PartActions.loadedCategories, // (required)
      error: PartActions.loadCategoriesFailed // (required)
    };
  },
  loadPart() {
    return {
      // remotely fetch something (required)
      remote(state, partID) {
        return axios.get("/part/" + partID + ".json", {"partID": partID});
      },

      // this function checks in our local cache first
      // if the value is present it'll use that instead (optional).
      local(state, partID) {
        return state.parts[partID] ? state.parts[partID] : null;
      },

      // here we setup some actions to handle our response
      success: PartActions.loadedPart, // (required)
      error: PartActions.loadPartFailed // (required)
    };
  },
  loadSupportedPartIndex() {
    return {
      // remotely fetch something (required)
      remote() {
        return axios.get("/partIndex/by/category.json");
      },

      // this function checks in our local cache first
      // if the value is present it'll use that instead (optional).
      local(state) {
        return Object.keys(state.supportedParts).length > 0 ? state.supportedParts : null;
      },

      // here we setup some actions to handle our response
      success: PartActions.loadedSupportedPartIndex, // (required)
      error: PartActions.loadSupportedPartIndexFailed // (required)
    };
  },
  loadUnsupportedPartIndex() {
    return {
      // remotely fetch something (required)
      remote() {
        return axios.get("/partIndex/by/id.json");
      },

      // this function checks in our local cache first
      // if the value is present it'll use that instead (optional).
      local(state) {
        return Object.keys(state.unsupportedParts).length > 0 ? state.unsupportedParts : null;
      },

      // here we setup some actions to handle our response
      success: PartActions.loadedUnsupportedPartIndex, // (required)
      error: PartActions.loadedUnsupportedPartIndexFailed // (required)
    };
  }
};
