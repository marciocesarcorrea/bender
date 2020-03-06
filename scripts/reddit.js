const socket = require('./config/socket')
module.exports = async (robot) => {
  socket.on('onRedditUpdates', update => {
    robot.send(
      { user: {}, room: 'nata' },
      `${update.reddit}\n${update.url}`
    )
  })
  socket.on('disconnect', () => {
    console.log('disconnect')
  })

  robot.respond(/quem (voce|você) segue no reddit/i, async msg => {
    socket.emit('subscriptions', null, (users, error) => {
      if (error) msg.reply(error.message)
      else {
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
      }
    })
  })

  robot.respond(/seguir (\/)?(u|r)\/[A-Za-z0-9_-]*(\/)? no reddit/i, async msg => {
    const match = String(msg.match[0]).match(/(u|r)\/[A-Za-z0-9_-]*/i)
    if (match && match[0]) {
      msg.reply('Perai 🤞')
      socket.emit('subscribe', match[0], (user, error) => {
        if (error) msg.reply(error.message)
        else {
          msg.reply({
            text: `seguindo ${user.name}`,
            attachments: [{
              title: `seguindo ${user.name}`,
              title_link: user.link,
              image_url: user.imge
            }]
          })
        }
      })
    } else {
      msg.reply(`não achei nada em '''${msg.match[0]}'''`)
    }
  })

  robot.respond(/sair de (\/)?(u|r)\/[A-Za-z0-9_-]*(\/)? no reddit/i, async msg => {
    const match = String(msg.match[0]).match(/(u|r)\/[A-Za-z0-9_-]*/i)
    if (match && match[0]) {
      msg.reply('Perai 🤞')
      socket.emit('unsubscribe', match[0], user => {
        msg.reply({
          text: `sai de ${user.name}`,
          attachments: [{
            title: `sai de ${user.name}`,
            title_link: user.link,
            image_url: user.imge
          }]
        })
      })
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
