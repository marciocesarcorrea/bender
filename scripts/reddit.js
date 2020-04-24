require('../database')
const CronJob = require('cron').CronJob
const reddit = require('../config/reddit')
const jobTime = require('../config/jobTime')
const LastUpdates = require('../schemas/LastUpdates')

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

const onRedditUpdates = (robot, submission, sub) => {
  const reddit = `https://reddit.com/${sub.display_name_prefixed}`;
  // const name = sub.display_name_prefixed;
  const url = submission.url;

  robot.send(
    { user: {}, room: 'nata' },
    `${reddit}\n${url}`
  )
}

module.exports = async (robot) => {
  const job = new CronJob(jobTime, async () => {
    try {
      console.log('=========' + new Date().toString() + '=========');
      const subs = await reddit.client.getSubscriptions();
      if (subs && Array.isArray(subs) && subs.length > 0) {
        for await (sub of subs) {
          if (sub.url.match(/\/user\//)) {
            const submission = await reddit.getSubmissions(sub.display_name_prefixed)
            if (submission) {
              if (!await hasLastUpdates(submission.id, sub.id)) {
                onRedditUpdates(robot, submission, sub)
                await persistLastUpdates(submission, sub, true)
                console.log(
                  new Date(submission.created_utc * 1000).toString() + '--->' + sub.url + '===' + submission.id + '--->getSubmissions',
                  submission.url
                )
              } else {
                console.log(`---> Sem atualizações do usuário: https://reddit.com/${sub.display_name_prefixed}`);
              }
            }
          }
          const newSubmissions = await sub.getNew({ limit: 1 })
          if (newSubmissions.length > 0) {
            if (!await hasLastUpdates(newSubmissions[0].id, sub.id)) {
              onRedditUpdates(robot, newSubmissions[0], sub)
              await persistLastUpdates(newSubmissions[0], sub)
              console.log(
                new Date(newSubmissions[0].created_utc * 1000).toString() + '--->' + sub.url + '--->' + newSubmissions[0].id + '--->getNew',
                newSubmissions[0].url
              )
            } else {
              console.log(`---> sem atualizações no subreddit: https://reddit.com${sub.url}`);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }, null, true, 'UTC')

  robot.respond(/quem (voce|você) segue no reddit/i, async msg => {
    try {
      const users = await reddit.getSubscriptions()
      users.map(user => {
        msg.reply({
          text: user.name,
          attachments: [{
            title: user.name,
            title_link: user.link,
            image_url: user.image
          }]
        })
      })
    } catch (err) {
      msg.reply(error)
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

  robot.respond(/(mostrar |mostra )?(u|ú)ltimo post( de)? (\/)?(u|r)\/[A-Za-z0-9_-]*(\/)?/i, async msg => {

  })

  robot.respond(/get (roomId|roomID)/i, async msg => {
    robot.send({ user: {}, room: 'nata' }, 'Olá mundo')
    msg.reply(`ta ai: ${msg.message.room}`)
  })
}
