var alt = require("../alt");

import PartActions from "../actions/part-actions";
import PartSource from "../sources/part-source";
import SiteActions from "../actions/site-actions";
import SiteStore from "./site-store";

class PartStore {
  constructor() {
    this.on("error", (err) => {
      console.log(err);
    });

    this.categories = null;
    this.parts = {};

    this.supportedParts = {};
    this.unsupportedParts = {};

    this.registerAsync(PartSource);
    this.bindListeners({
      handleNavigateToPage: SiteActions.navigateToPage,
      handleLoadedCategories: PartActions.loadedCategories,
      handleLoadCategoriesFailed: PartActions.loadCategoriesFailed,
      handleLoadedPart: PartActions.loadedPart,
      handleLoadPartFailed: PartActions.loadPartFailed,
      handleLoadedSupportedPartIndex: PartActions.loadedSupportedPartIndex,
      handleLoadSupportedPartIndexFailed: PartActions.loadSupportedPartIndexFailed,
      handleLoadedUnsupportedPartIndex: PartActions.loadedUnsupportedPartIndex,
      handleLoadUnsupportedPartIndexFailed: PartActions.loadUnsupportedPartIndexFailed
    });
  }

  handleNavigateToPage() {
    this.waitFor(SiteStore);
    let page = SiteStore.getState().page;
    if (page === "build" || page === "editbuild") {
      this.getInstance().loadCategories();
    }
    if (page === "editbuild") {
      this.getInstance().loadSupportedPartIndex();
    }
  }

  static expandParts(parts) {
    for (let manufacturerID of Object.keys(parts)) {
      for (let partID of Object.keys(parts[manufacturerID])) {
        let part = parts[manufacturerID][partID];
        part.fullName = (part.manufacturer + " " + part.name).trim();
        part.id = manufacturerID + "/" + partID;
      }
    }
  }

  static filterOutSupportedParts(parts) {
    for (let manufacturerID of Object.keys(parts)) {
      for (let partID of Object.keys(parts[manufacturerID])) {
        let part = parts[manufacturerID][partID];
        if (part.category !== "") {
          delete parts[manufacturerID][partID];
        }
      }
    }
  }
  handleLoadedSupportedPartIndex(response) {
    let parts = response.data;
    for(let category of Object.keys(parts)) {
      PartStore.expandParts(parts[category]);
    }
    this.supportedParts = parts;
    this.getInstance().loadUnsupportedPartIndex();
  }
  handleLoadSupportedPartIndexFailed(response) {
    console.log(response);
  }
  handleLoadedUnsupportedPartIndex(response) {
    let unsupportedParts = response.data;
    PartStore.filterOutSupportedParts(unsupportedParts);
    PartStore.expandParts(unsupportedParts);
    this.unsupportedParts = unsupportedParts;
  }
  handleLoadUnsupportedPartIndexFailed(response) {
    console.log(response);
  }
  handleLoadedCategories(response) {
    this.categories = response.data.categories;
  }
  handleLoadCategoriesFailed(response) {
    console.log(response);
  }
  handleLoadedPart(response) {
    this.parts[response.config.partID] = response.data;
  }
  handleLoadPartFailed(response) {
    console.log(response);
  }
}

module.exports = alt.createStore(PartStore, "PartStore");
