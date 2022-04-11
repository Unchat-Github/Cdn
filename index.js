const app = require("express")();
const express = require("express");
const uniqe = require("uniqid");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const sharp = require("sharp");

let cacheDB;
app.use(cors());
app.use(express.json());

/**
 *
 * @returns {import("mongodb").Db}
 */
async function dbConnect() {
  if (cacheDB) return cacheDB;

  const client = await MongoClient.connect(process.env.MONGODB);
  const db = client.db("test");
  cacheDB = db;
  return db;
}

app.get("/images/:id", async (req, res) => {
  const db = await dbConnect();

  const data = await db.collection("cdn").findOne({ avatar: req.params.id });
  if (!data) return res.status(400).send("Invalid Image");

  var img = Buffer.from(
    data.buffer.slice("data:image/png;base64,".length),
    "base64"
  );
  const validSizes = [32, 64, 128, 256, 512, 1024];
  if (req.query.size && !validSizes.includes(parseInt(req.query.size)))
    return res.status(400).send("Invalid image size");

  sharp(img)
    .resize({
      width: parseInt(req.query.size) || 128,
      height: parseInt(req.query.size) || 128,
    })
    .toBuffer()
    .then((buffer) => {
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": buffer.length,
      });
      res.end(buffer);
    });
});

app.post("/image/upload", async (req, res) => {
  if (!req.body.buffer) return res.status(400).send({ message: "Bad request" });
  const db = await dbConnect();
  const new_id = uniqe();

  const data = await db.collection("cdn").insertOne({
    id: req.body.id,
    avatar: new_id,
    buffer: req.body.buffer,
  });

  res
    .status(200)
    .send({ data: `http://localhost:5050/images/${new_id}`, res: data });
});
app.listen(5050, () => console.log(`Listening on PORT : 3000`));
