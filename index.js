const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.egme4zl.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("art-db");
    const artCollection = db.collection("artwork");

    app.get("/artwork", async (req, res) => {
      const result = await artCollection.find().toArray();
      res.send(result);
    });

    app.get("/artwork/:id", async (req, res) => {
      const { id } = req.params;
      console.log(id);

      const result = await artCollection.findOne({ _id: new ObjectId(id) });

      res.send({
        success: true,
        result,
      });
    });

    app.get("/featured-artwork-section", async (req, res) => {
      const result = await artCollection
        .find()
        .sort({ title: "desc" })
        .limit(6)
        .toArray();
      console.log(result);

      res.send(result);
    });

    app.post("/artwork", async (req, res) => {
      const data = req.body;
      const result = await artCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });

    app.patch("/artwork/:id/like", async (req, res) => {
      try {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $inc: { like: 1 },
        };

        const result = await artCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount > 0) {
          res.send({
            success: true,
            message: "Like increased successfully!",
          });
        } else {
          res.send({
            success: false,
            message: " No artwork found to update.",
          });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Internal Server Error",
        });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
