const express = require("express");

const ws = require("websocket-stream");
const cluster = require("cluster");
const mqemitter = require("mqemitter");
const mongopersistence = require("aedes-persistence-mongodb");

require("dotenv").config();

const broker = require("aedes")({
  id: `BROKER_${cluster.Worker.id}`,
  mq: mqemitter({
    url: process.env.MONGO_URI,
  }),
  persistence: mongopersistence({
    url: process.env.MONGO_URI,
    // Optional ttl settings
    ttl: {
      packets: 300, // Number of seconds
      subscriptions: 300,
    },
  }),
});

const server = require("net").createServer(broker.handle);

const app = express();

const ports = {
  mqtt: 1883,
  ws: 8080,
  wss: 8081,
};

const host = "0.0.0.0"; // localhost

server.listen(ports.mqtt, function () {
  console.log(`MQTT Broker running on port: ${ports.mqtt}`);
});

// -------- non-SSL websocket port -------------
var wsServer = require("http").createServer(app);
ws.createServer({ server: wsServer }, broker.handle);
wsServer.listen(ports.ws, host, function () {
  console.log("WS server listening on port", ports.ws);
  broker.publish({ topic: "broker/hello", payload: "I'm broker " + broker.id });
});

//events

broker.on("subscribe", function (subscriptions, client) {
  console.log(subscriptions);
});

broker.on("unsubscribe", function (subscriptions, client) {
  console.log({ subscriptions });
});

// fired when a client connects
broker.on("client", function (client) {
  console.log("client connected", client.id);
});

// fired when client is ready
broker.on("clientReady", (client) => {
  console.log("client is ready", client.id);
  // client.subscribe(client.id, (err) => {
  //   if (err) {
  //     console.log("Error is subscribe", err);
  //     return;
  //   }
  //   console.log("Subscribed", client.id);
  //   // broker.publish({ topic: client.id, payload: client });
  // });
});

// fired when a client disconnects
broker.on("clientDisconnect", function (client) {
  console.log("Client disconnected");
});

// fired when a message is published
broker.on("publish", async function (packet, client) {
  const { topic, payload } = packet;
  console.log({ topic, payload: payload.toString() });
});
