const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

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
    const paymentCollection = db.collection("payments");

    // artwork related api
    app.get("/artwork", async (req, res) => {
      const artwork = await artCollection
        .find()
        .limit(12)
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
      const artwork = req.body;
      artwork.createdAt = new Date();
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

    app.get("/gallery", async (req, res) => {
      const user = req.query.user;
      const gallery = await artCollection.find({ created_by: user }).toArray();
      res.send(gallery);
    });

    // payment related api
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.price) * 100;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "USD",
              unit_amount: amount,
              product_data: {
                name: paymentInfo.name,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: paymentInfo.userEmail,
        mode: "payment",
        metadata: {
          artId: paymentInfo.artId,
        },
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
      });

      console.log(session);
      res.send({ url: session.url });
    });

    app.patch("/payment-success", async (req, res) => {
      const sessionId = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log("session retrieve", session);
      if (session.payment_status === "paid") {
        const id = session.metadata.artId;
        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            paymentStatus: "paid",
          },
        };
        const result = await artCollection.updateOne(query, update);

        const payment = {
          amount: session.amount_total / 100,
          currency: session.currency,
          email: session.email,
          artId: session.metadata.artId,
          transactionId: session.payment_intent,
          paymentStatus: session.payment_status,
          paidAt: new Date(),
        };

        if (session.payment_status === "paid") {
          const resultPayment = await paymentCollection.insertOne(payment);
          res.send({
            success: true,
            modifyArtwork: result,
            paymentInfo: resultPayment,
          });
        }
      }

      res.send({ success: false });
    });

    console.log("MongoDB Connected!");
  } catch (err) {
    console.log(err);
  }
}

run();

app.get("/", (req, res) => res.send("Server is now running"));

app.listen(port, () => console.log(`Server running on port ${port}`));
