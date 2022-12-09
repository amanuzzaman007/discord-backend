const Notification = require("../models/notification");
const { USER_NOTIFICATION_FROM__SERVER_TO_CLIENT } = require("../subTypes");

/*
PACKET
{
  cmd: 'publish',
  brokerId: undefined,
  brokerCounter: 0,
  topic: 'channel/directMessage/client',
  payload: <Buffer 7b 22 73 65 6e 64 65 72 22 3a 22 36 33 38 33 34 63 62 61 64 37 39 65 33 36 65 33 37 31 37 32 35 62 63 66 22 2c 22 63 68 61 6e 6e 65 6c 49 64 22 3a 22 ... 56 more bytes>,
  qos: 2,
  retain: false,
  dup: false,
  messageId: 1
}
*/

const saveAndNotifyUser = async (packet, aedes) => {
  if (!packet || !aedes) return;
  try {
    let payload = packet.payload.toString();
    payload = JSON.parse(payload);
    const { from, to, type, serverId, content = "" } = payload;

    let notification = await Notification.create({
      from,
      to,
      type,
      server: serverId,
      content,
    });

    notification = await notification.populate("from", "-password");
    notification = await notification.populate("server");
    console.log(notification);
    aedes.publish({
      topic: USER_NOTIFICATION_FROM__SERVER_TO_CLIENT,
      payload: JSON.stringify(notification),
    });
  } catch (err) {
    console.log("Error saving notifications", err);
  }
};

module.exports = {
  saveAndNotifyUser,
};
