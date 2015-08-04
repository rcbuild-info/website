var alt = require("../alt");

class PartActions {
  constructor() {
    this.generateActions("loadCategories", "loadedCategories", "loadCategoriesFailed",
                         "loadIndices",
                         "loadedSupportedPartIndex", "loadSupportedPartIndexFailed",
                         "loadedUnsupportedPartIndex", "loadUnsupportedPartIndexFailed",
                         "loadPart", "loadedPart", "loadPartFailed");
  }
}

module.exports = alt.createActions(PartActions);
