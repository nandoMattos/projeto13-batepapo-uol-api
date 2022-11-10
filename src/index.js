import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
let participants;
let messages;

await mongoClient.connect();
db = mongoClient.db("chatUol");
participants = db.collection("participants");
messages = db.collection("messages");

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(422).send({ message: "Campo nome é obrigatório." });
    return;
  }
  try {
    await participants.insertOne({ name, lastStatus: Date.now() });
    res.send({ message: "Usuário logado" });
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
  const { from } = req.headers;
  if (!to || !text || !type || !from) {
    res.status(422).send({ message: "Todo os campos são obrigatórios." });
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
