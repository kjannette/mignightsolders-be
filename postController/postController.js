const { postReelToFacebook } = require("../postServices/facebookApiService.js");

class PostController {
  constructor() {
    const reelDataMock = { mock: true };
    postReelToFacebook(reelDataMock);
  }
}

module.exports = new PostController();
