const Gfycat = require('gfycat-sdk');

const gfycat = new Gfycat({
  clientId: process.env.GFYCAT_CLIENT_ID,
  clientSecret: process.env.GFYCAT_CLIENT_SECRET,
});

const client = async () => {
  return gfycat.authenticate();
}

const detailsGif = async id => {
  try {
    const details = await gfycat.getGifDetails({ gfyId: id });
    if (details.gfyItem) return details.gfyItem;
    return null;

  } catch (error) {
    return null;
  }
}

module.exports = {
  client,
  detailsGif,
}