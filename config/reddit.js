const Snoowrap = require('snoowrap')
const _ = require('lodash')

const reddit = new Snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USER,
  password: process.env.REDDIT_PASS
});

const getSubreddit = async subreddit => {
  const submissions = await reddit.getSubreddit(subreddit).getNew({ limit: 10, sort: 'new' });
  if (submissions.length > 0) {
    const submissionsOrder = _.orderBy(submissions, ['created_utc'], ['desc']);
    return submissionsOrder[0];
  }
  return null
}

const getSubmissions = async name => {
  const user = await reddit.getUser(name)
  const submissions = await user.getSubmissions({ limit: 10, sort: 'new' })
  if (submissions.length > 0) {
    const submissionsOrder = _.orderBy(submissions, ['created_utc'], ['desc']);
    return submissionsOrder[0];
  }
  return null
}

const getSubscriptions = async () => {
  try {
    const subs = await reddit.getSubscriptions()
    if (subs && Array.isArray(subs) && subs.length > 0) {
      const ret = subs.map(sub => ({
        id: sub.id,
        link: `https://reddit.com${sub.url}`,
        description: sub.public_description,
        name: sub.display_name,
        image: sub.icon_img
      }))
      return ret
    } else {
      throw new Error('Você não segue ninguem ainda')
    }
  } catch (err) {
    throw new Error(err)
  }
}
const subscribe = async (name) => {
  console.log('user: ' + name)
  try {
    const sub = await reddit.getSubreddit(name).subscribe()
    return {
      name: await sub.display_name,
      image: await sub.icon_img,
      link: `https://reddit.com/${name}`
    };
  } catch (err) {
    throw new Error(err);
  }
}
const unSubscribe = async (name) => {
  console.log('user: ' + name)
  try {
    const sub = await reddit.getSubreddit(name).unsubscribe()
    return {
      name: await sub.display_name,
      image: await sub.icon_img,
      link: `https://reddit.com/${name}`
    }
  } catch (err) {
    throw new Error(err);
  }
}

module.exports = {
  client: reddit,
  getSubreddit,
  getSubmissions,
  getSubscriptions,
  subscribe,
  unSubscribe,
}