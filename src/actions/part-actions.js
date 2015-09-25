var alt = require("../alt");

class PartActions {
  constructor() {
    this.generateActions("loadCategories", "loadedCategories", "loadCategoriesFailed",
                         "loadIndices",
                         "loadedSupportedPartIndex", "loadSupportedPartIndexFailed",
                         "loadedUnsupportedPartIndex", "loadUnsupportedPartIndexFailed");
  }
}

module.exports = alt.createActions(PartActions);
