import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Joi from "joi";
import { MongoClient, ObjectId } from "mongodb";
import participantSchema from "./schemas/participantSchema.js";
import messageSchema from "./schemas/messageSchema.js";
import dayjs from "dayjs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
await mongoClient.connect();
const participants = mongoClient.db("chatUol").collection("participants");
const messages = mongoClient.db("chatUol").collection("messages");

setInterval(async () => {
  try {
    const disconnectedParticipants = await participants
      .find({
        lastStatus: { $lt: Date.now() - 10000 },
      })
      .toArray();

    if (disconnectedParticipants.length !== 0) {
      disconnectedParticipants.forEach(
        async (p) =>
          await messages.insertOne({
            from: p.name,
            to: "Todos",
            text: "sai da sala...",
            type: "status",
            time: dayjs().format("hh:mm:ss"),
          })
      );
      await participants.deleteMany({
        lastStatus: { $lt: Date.now() - 10000 },
      });
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
}, 15000);

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const validation = participantSchema.validate({ name });

  if (validation.error) {
    res.status(422).send(validation.error.details.map((d) => d.message));
    return;
  }

  try {
    const user = await participants.findOne({ name });
    if (user) {
      res.status(409).send({ message: "Usuário já existente" });
      return;
    }
    await participants.insertOne({ name, lastStatus: Date.now() });
    await messages.insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("hh:mm:ss"),
    });
    return res.sendStatus(201);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

app.get("/participants", async (req, res) => {
  try {
    res.send(await participants.find().toArray());
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user: username } = req.headers;
  const message = {
    from: username,
    to,
    text,
    type,
  };
  const validation = messageSchema.validate(message, { abortEarly: false });

  if (validation.error) {
    res.status(422).send(validation.error.details.map((d) => d.message));
    return;
  }

  try {
    const user = await participants.findOne({ name: username });
    if (!user) {
      res.status(422).send({ message: "O usuário não está logado" });
      return;
    }
    message.time = dayjs().format("hh:mm:ss");
    await messages.insertOne(message);
    return res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/messages", async (req, res) => {
  const { limit } = req.query;
  try {
    if (!limit) {
      res.send(await messages.find().toArray());
      return;
    }
    res.send(
      (
        await messages.find().sort({ _id: -1 }).limit(Number(limit)).toArray()
      ).reverse()
    );
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/status", async (req, res) => {
  const { user: username } = req.headers;
  try {
    const user = await participants.findOne({ name: username });
    if (!user) {
      return res.sendStatus(404);
    }
    await participants.updateOne(
      { name: username },
      { $set: { name: username, lastStatus: Date.now() } }
    );
    res.status(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.listen(5000);
