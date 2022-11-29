const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const ws = require("websocket-stream");
const cluster = require("cluster");
const userRoutes = require("./routes/userRoutes");
const channelRoutes = require("./routes/channelRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { saveMessageToDB } = require("./dbUtilities/message");
const { CHANNEL_DIRECT_MESSAGES_CLIENT } = require("./subTypes");

const app = express();
require("dotenv").config();

// configurations
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/build")));

// db connection
mongoose
  .connect(process.env.MONGO_URI)
  .then((res) => {
    console.log("DB connected");
  })
  .catch((err) => {
    console.log(err);
  });

// // routes
// app.use("/api/users", userRoutes);
// app.use("/api/channel", channelRoutes);

// function startAedes() {
//   const port = 8080;

//   const aedes = require("aedes")();

//   // const aedes = require("aedes")({
//   //   id: "BROKER_" + cluster.worker.id,
//   // });

//   // const server = require("net").createServer(aedes.handle);

//   // server.listen(port, function () {
//   //   console.log("Aedes listening on port:", port);
//   //   aedes.publish({ topic: "aedes/hello", payload: "I'm broker " + aedes.id });
//   // });

//   // -------- non-SSL websocket port -------------
//   var wsServer = require("http").createServer(app);
//   ws.createServer({ server: wsServer }, aedes.handle);
//   wsServer.listen(port, function () {
//     console.log("WS server listening on port", port);
//   });

//   aedes.on("subscribe", function (subscriptions, client) {
//     // client.id, aedes.id,
//     console.log({ subscriptions, clientId: client.id });
//   });

//   aedes.on("unsubscribe", function (subscriptions, client) {
//     console.log({ subscriptions, clientId: client.id });
//   });

//   // fired when a client connects
//   aedes.on("client", function (client) {
//     console.log("client connected");
//   });

//   // fired when a client disconnects
//   aedes.on("clientDisconnect", function (client) {
//     console.log("client disconnected");
//   });

//   // fired when a message is published
//   aedes.on("publish", async function (packet, client) {
//     console.log(packet);

//     // console.log({
//     //   payload: packet.payload.toString(),
//     //   topic: packet.topic,
//     //   aedesID: aedes.id,
//     //   // client: client.id,
//     // });
//   });
// }

// if (cluster.isMaster) {
//   const numWorkers = require("os").cpus().length;
//   for (let i = 0; i < numWorkers; i++) {
//     cluster.fork();
//   }

//   cluster.on("online", function (worker) {
//     console.log("Worker " + worker.process.pid + " is online");
//   });

//   cluster.on("exit", function (worker, code, signal) {
//     console.log(
//       "Worker " +
//         worker.process.pid +
//         " died with code: " +
//         code +
//         ", and signal: " +
//         signal
//     );
//     console.log("Starting a new worker");
//     cluster.fork();
//   });
// } else {
//   startAedes();
// }

const aedes = require("aedes")({
  id: `BROKER_${cluster.Worker.id}`,
  // mq: mqemitter({
  //   url: process.env.MONGO_URI,
  // }),
  // persistence: mongoPersistence({
  //   url: process.env.MONGO_URI,
  //   // Optional ttl settings
  //   ttl: {
  //     packets: 300, // Number of seconds
  //     subscriptions: 300,
  //   },
  // }),
});

const ports = {
  mqtt: 1883,
  ws: 8080,
  wss: 8081,
};

// routes
app.use("/api/users", userRoutes);
app.use("/api/channel", channelRoutes);
app.use("/api/messages", messageRoutes);
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build/index.html"));
});

// -------- non-SSL websocket port -------------
var wsServer = require("http").createServer(app);
ws.createServer({ server: wsServer }, aedes.handle);
wsServer.listen(ports.ws, function () {
  console.log("WS server listening on port", ports.ws);
});

// fired when a client connects
aedes.on("client", function (client) {
  console.log("client connected", client.id);
});

aedes.on("subscribe", function (subscriptions, client) {
  // client.id, aedes.id,
  console.log({ subscriptions, clientId: client.id });
});

aedes.on("unsubscribe", function (subscriptions, client) {
  console.log({ subscriptions, clientId: client.id });
});

// fired when a client connects
aedes.on("client", function (client) {
  console.log("client connected");
});

// fired when a client disconnects
aedes.on("clientDisconnect", function (client) {
  console.log("client disconnected");
});

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

// fired when a message is published
aedes.on("publish", async function (packet, client) {
  console.log(packet);
  switch (packet.topic) {
    case CHANNEL_DIRECT_MESSAGES_CLIENT:
      // save direct message to mongodb
      saveMessageToDB(packet, aedes);
      break;

    default:
      break;
  }

  // console.log({
  //   payload: packet.payload.toString(),
  //   topic: packet.topic,
  //   aedesID: aedes.id,
  //   // client: client.id,
  // });
});
