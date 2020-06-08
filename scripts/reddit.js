require('../database');
const CronJob = require('cron').CronJob;
const reddit = require('../config/reddit');
const gfycat = require('../config/gfycat');
const jobTime = require('../config/jobTime');
const LastUpdates = require('../schemas/LastUpdates');

const hasLastUpdates = async (submissionId, subredditId) => {
  const lastSubmission = await LastUpdates.findOne({ submissionId, subredditId })
  return lastSubmission && (lastSubmission.length > 0 || lastSubmission._id)
}

const persistLastUpdates = async (submission, subreddit, isSubmissions = false) => {
  await LastUpdates.deleteMany({ subredditId: subreddit.id, isSubmissions })
  await LastUpdates.create({
    submissionId: submission.id,
    submissionUrl: submission.url,
    subredditId: subreddit.id,
    isSubmissions
  })
}

const hubotSendSubmission = async (robot, submission, user) => {
  const attachment = {
    title: submission.permalink,
    title_link: `https://reddit.com${submission.permalink}`,
    author_icon: submission.thumbnail,
    author_link: `https://reddit.com/${user}`,
    author_name: user,
    message_link: `https://reddit.com${submission.permalink}`,
    text: submission.title,
    title: submission.title,
    title_link: `https://reddit.com${submission.permalink}`,
    title_link_download: true,
    ts: submission.created_utc ? new Date(submission.created_utc * 1000) : new Date(),
  };
  if (String(submission.url).search('gfycat') !== -1) {
    const url = new URL(submission.url);
    const video = await gfycat.detailsGif(url.pathname.substr(1));
    if (video) attachment.video_url = video.mp4Url;
  } else if (submission.url.match(/\.(gif|jpe?g|tiff|png|webp|bmp)$/i)) {
    attachment.image_url = submission.url;
  }

  if (attachment.video_url || attachment.image_url) {
    robot.send(
      { user: {}, room: 'nata' }, {
      avatar: submission.thumbnail,
      text: submission.title,
      attachments: [attachment]
    });
  } else {
    robot.send(
      { user: {}, room: 'nata' },
      `${submission.title}\n${submission.url}`
    );
  }
}

const hubotRespond = async (msg, submission, user) => {
  const attachment = {
    title: submission.permalink,
    title_link: `https://reddit.com${submission.permalink}`,
    author_icon: submission.thumbnail,
    author_link: `https://reddit.com/${user}`,
    author_name: user,
    message_link: `https://reddit.com${submission.permalink}`,
    text: submission.title,
    title: submission.title,
    title_link: `https://reddit.com${submission.permalink}`,
    title_link_download: true,
    ts: new Date(submission.created_utc * 1000),
  };
  if (String(submission.url).search('gfycat') !== -1) {
    const url = new URL(submission.url);
    const video = await gfycat.detailsGif(url.pathname.substr(1));
    if (video) attachment.video_url = video.mp4Url;
  } else {
    attachment.image_url = submission.url;
  }

  if (attachment.video_url || attachment.image_url) {
    msg.reply({
      avatar: submission.thumbnail,
      text: submission.title,
      attachments: [attachment]
    });
  } else {
    msg.reply(`${submission.title}\n${submission.url}`);
  }
}

module.exports = async (robot) => {
  if (process.env.START_JOB === 'true') {
    const job = new CronJob(jobTime, async () => {
      try {
        console.log('=========' + new Date().toString() + '=========');
        let all;
        const users = await reddit.client.getSubscriptions();
        if (!users.isFinished) {
          const more = await users.fetchAll();
          all = users.concat(more);
        } else {
          all = users;
        }
        if (all && Array.isArray(all) && all.length > 0) {
          console.log(`---> ${new Date().toString()} - Total: ${all.length}`);
          for await (user of all) {
            if (user.url.match(/\/user\//) || user.url.match(/\/u\//)) {
              submission = await reddit.getSubmissions(user.display_name_prefixed);
              if (submission) {
                if (!await hasLastUpdates(submission.id, user.id)) {
                  await hubotSendSubmission(robot, submission, user.display_name_prefixed)
                  await persistLastUpdates(submission, user, true)
                  console.log(`---> ${new Date(submission.created_utc * 1000).toISOString()} - Atualização do usuário: https://reddit.com/${user.display_name_prefixed}`, submission.url)
                } else {
                  console.log(`---> ${new Date().toISOString()} - Sem atualizações do usuário: https://reddit.com/${user.display_name_prefixed}`);
                }
              }
            } else if (user.url.match(/\/r\//)) {
              submission = await reddit.getSubreddit(user.display_name_prefixed);
              if (submission) {
                if (!await hasLastUpdates(submission.id, user.id)) {
                  await hubotSendSubmission(robot, submission, user.display_name_prefixed)
                  await persistLastUpdates(submission, user)
                  console.log(`---> ${new Date(submission.created_utc * 1000).toISOString()} - Atualização no subreddit: https://reddit.com/${user.display_name_prefixed}`, submission.url)
                } else {
                  console.log(`---> ${new Date().toISOString()} - Sem atualizações no subreddit: https://reddit.com/${user.display_name_prefixed}`);
                }
              }
            }
          }
          console.log(`---> ${new Date().toString()} - Acabou`);
        }
      } catch (err) {
        robot.send({ user: {}, room: 'nata' }, err);
        console.log(err);
      }
    }, null, true, 'UTC')
  }
  robot.respond(/quem (voce|você) segue no reddit/i, async msg => {
    try {
      let all;
      const users = await reddit.client.getSubscriptions();
      if (!users.isFinished) {
        const more = await users.fetchAll();
        all = users.concat(more);
      } else {
        all = users;
      }
      for await (user of all) {
        msg.reply({
          text: user.name,
          attachments: [{
            title: user.name,
            title_link: `https://reddit.com${user.url}`,
            image_url: user.icon_img
          }]
        });
      }
    } catch (err) {
      msg.reply(err)
    }
  })

  robot.respond(/seguir (\/)?(u|r)\/[A-Za-z0-9_-]*(\/)? no reddit/i, async msg => {
    const match = String(msg.match[0]).match(/(u|r)\/[A-Za-z0-9_-]*/i)
    if (match && match[0]) {
      msg.reply('Perai 🤞')
      try {
        const user = await reddit.subscribe(match[0])
        msg.reply({
          text: `seguindo ${user.name}`,
          attachments: [{
            title: `seguindo ${user.name}`,
            title_link: user.link,
            image_url: user.imge
          }]
        })
      } catch (err) {
        msg.reply(err)
      }
    } else {
      msg.reply(`não achei nada em '''${msg.match[0]}'''`)
    }
  })

  robot.respond(/sair de (\/)?(u|r)\/[A-Za-z0-9_-]*(\/)? no reddit/i, async msg => {
    const match = String(msg.match[0]).match(/(u|r)\/[A-Za-z0-9_-]*/i)
    if (match && match[0]) {
      msg.reply('Perai 🤞')
      try {
        const user = await reddit.unSubscribe(match[0])
        msg.reply({
          text: `sai de ${user.name}`,
          attachments: [{
            title: `sai de ${user.name}`,
            title_link: user.link,
            image_url: user.image
          }]
        })
      } catch (err) {
        msg.reply(err)
      }
    } else {
      msg.reply(`não achei nada em '''${msg.match[0]}'''`)
    }
  })

  robot.respond(/(mostrar |mostra )?(u|ú)ltimo post( de)? (\/)?(u|user|r)\/[A-Za-z0-9_-]*(\/)?/i, async msg => {
    const match = String(msg.match[0]).match(/(u|user|r)\/[A-Za-z0-9_-]*/i)
    try {
      msg.reply('Perai...');

      let submission;
      if (match && match[1].toLocaleLowerCase() === 'r') {
        submission = await reddit.getSubreddit(match[0]);
      } else if (match && (match[1].toLocaleLowerCase() === 'u' || match[1].toLocaleLowerCase() === 'user')) {
        let user = match[0];
        if (match[1].toLocaleLowerCase() === 'user') user = match[0].replace('user/', 'u/');
        submission = await reddit.getSubmissions(user);
      }

      await hubotRespond(msg, submission, match[0]);

    } catch (error) {
      msg.reply(error.toString())
      console.log(error);
    }
  })

  robot.respond(/get (roomId|roomID)/i, async msg => {
    robot.send({ user: {}, room: 'nata' }, 'Olá mundo')
    msg.reply(`ta ai: ${msg.message.room}`)
  })
}
