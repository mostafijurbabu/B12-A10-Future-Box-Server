// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.egme4zl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("art-db");
    const artCollection = db.collection("artwork");

    app.get("/artwork", async (req, res) => {
      const artwork = await artCollection
        .find()
        .limit(6)
        .sort({ title: -1 })
        .toArray();
      res.send(artwork);
    });

    app.get("/artwork/:id", async (req, res) => {
      const result = await artCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send({ success: !!result, result });
    });

    app.post("/artwork", async (req, res) => {
      const result = await artCollection.insertOne(req.body);
      res.send({ success: true, result });
    });

    app.put("/artwork/:id", async (req, res) => {
      const result = await artCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send({ success: result.modifiedCount > 0 });
    });

    app.delete("/artwork/:id", async (req, res) => {
      const result = await artCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send({ success: result.deletedCount > 0 });
    });

    app.patch("/artwork/:id/like", async (req, res) => {
      const result = await artCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $inc: { like: 1 } }
      );
      res.send({ success: result.modifiedCount > 0 });
    });

    app.patch("/artwork/:id/favorite", async (req, res) => {
      const result = await artCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $addToSet: { favorited_by: req.body.userEmail } }
      );
      res.send({ success: result.modifiedCount > 0 });
    });

    app.patch("/favorites/:id/remove", async (req, res) => {
      const result = await artCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $pull: { favorited_by: req.body.userEmail } }
      );
      res.send({ success: result.modifiedCount > 0 });
    });

    app.get("/favorites", async (req, res) => {
      const email = req.query.email;
      const favorites = await artCollection
        .find({ favorited_by: email })
        .toArray();
      res.send(favorites);
    });

    app.get("/my-gallery", async (req, res) => {
      const user = req.query.user;
      const gallery = await artCollection.find({ created_by: user }).toArray();
      res.send(gallery);
    });

    console.log("MongoDB Connected!");
  } catch (err) {
    console.log(err);
  }
}

run();

app.get("/", (req, res) => res.send("Server is running"));

app.listen(port, () => console.log(`Server running on port ${port}`));
