const Message = require("../models/message");
const Channel = require("../models/channel");
const User = require("../models/user");
const { CHANNEL_DIRECT_MESSAGES_SERVER } = require("../subTypes");

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

const saveMessageToDB = async (packet, aedes) => {
  if (!packet || !aedes) return;
  try {
    let payload = packet.payload.toString();
    payload = JSON.parse(payload);
    const { sender, channelId, content, isRawHtml = false } = payload;

    if (!channelId || !content) return;

    const newMessage = {
      sender: sender,
      content,
      channel: channelId,
      channelId,
      isRawHtml,
    };

    let message = await Message.create(newMessage);
    console.log({ message });
    message = await message.populate("sender", "-password");
    message = await message.populate("channel");

    message = await User.populate(message, {
      path: "channel.users",
      select: "-password",
    });

    await Channel.findByIdAndUpdate(channelId, {
      latestMessage: message,
    });

    const messageToPublish = await Message.aggregate([
      {
        $match: { _id: message._id },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          content: 1,
          isRawHtml: 1,
          createdAt: 1,
          user: {
            _id: 1,
            username: 1,
            active: 1,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          messageByDate: {
            $push: "$$ROOT",
          },
        },
      },
    ]);
    // aedes.publish({ topic: "aedes/hello", payload: "I'm broker " + aedes.id });

    aedes.publish({
      topic: CHANNEL_DIRECT_MESSAGES_SERVER,
      payload: JSON.stringify({ messageToPublish, channelId }),
    });
  } catch (err) {
    console.log("Error saving message", err);
  }
};

module.exports = {
  saveMessageToDB,
};
