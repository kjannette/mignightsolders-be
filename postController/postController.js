const { postReelToFacebook } = require("../postServices/facebookReelPost.js");

class PostController {
  constructor() {
    const reelDataMock = { mock: true };
    postReelToFacebook(reelDataMock);
  }
}

module.exports = new PostController();
