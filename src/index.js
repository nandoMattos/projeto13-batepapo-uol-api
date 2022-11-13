import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Joi from "joi";
import { MongoClient } from "mongodb";
import participantSchema from "./schemas/participantSchema.js";
import messageSchema from "./schemas/messageSchema.js";
import dayjs from "dayjs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db("chatUol");
const participants = db.collection("participants");
const messages = db.collection("messages");

function verifyNameOccurrence(names, userName) {
  for (let name of names) {
    if (
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-zA-Z\s]/g, "") ===
      userName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-zA-Z\s]/g, "")
    ) {
      return true;
    }
  }
  return false;
}

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const validation = participantSchema.validate({ name });

  if (validation.error) {
    res.status(422).send(validation.error.details.map((d) => d.message));
    return;
  }

  const allNames = await participants.distinct("name");
  const isNameExist = verifyNameOccurrence(allNames, name);
  if (isNameExist) {
    res.status(409).send({ message: "Usuário já existente" });
    return;
  }

  try {
    await participants.insertOne({ name, lastStatus: Date.now() });
    messages.insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("hh:mm:ss"),
    });
    res.send(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
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
  const { user } = req.headers;
  const message = { from: user, to, text, type };
  const validation = messageSchema.validate(message, { abortEarly: false });

  if (validation.error) {
    res.status(422).send(validation.error.details.map((d) => d.message));
    return;
  }

  try {
    await messages.insertOne({ from, to, text, type });
    res.send({ message: "Mensagem enviada." });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/messages", async (req, res) => {
  try {
    res.send(await messages.find().toArray());
    return;
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.listen(5000);
