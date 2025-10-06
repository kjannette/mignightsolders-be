const {
  postReelToFacebook,
} = require("../postServices/facebookPostService.js");

class PostController {
  constructor() {
    const reelDataMock = { mock: true };
    postReelToFacebook(reelDataMock);
  }
}

module.exports = new PostController();
