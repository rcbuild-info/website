import SearchActions from "../actions/search-actions";

import axios from "axios";

export default {
  loadBuildList() {
    return {
      // remotely fetch something (required)
      remote(state, parts, listPage, passthrough) {
        return axios.post("/list/builds/" + listPage, parts, passthrough);
      },

      // here we setup some actions to handle our response
      success: SearchActions.loadedBuildList, // (required)
      error: SearchActions.loadBuildListFailed // (required)
    };
  }
};
