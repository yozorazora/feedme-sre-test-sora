const { MongoClient } = require("mongodb");
const express = require("express");
const cors = require("cors");

const app = express();

// ✅ 使用平台分配端口（Render / 云必须）
const port = process.env.PORT || 3000;

// ✅ 使用环境变量（安全）
const url = process.env.MONGODB_URL;

// ✅ DB 名称（可以保留）
const dbName = "DevOpsAssignment";

const client = new MongoClient(url);

// ⚠️ 用于模拟内存压力（SRE测试点）
const globalOrder = [];

async function main() {
  try {
    // ✅ 连接 MongoDB（加 error handling）
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(dbName);
    const counterCollection = db.collection("counters");
    const orderCollection = db.collection("orders");

    // ✅ 初始化 counter（避免 undefined）
    await counterCollection.updateOne(
      { _id: "orderSeq" },
      { $setOnInsert: { seq: 1 } },
      { upsert: true }
    );

    console.log("✅ MongoDB initialized");

    // ✅ Middleware
    app.use(cors());
    app.use(express.json());

    // ✅ Health Check（监控用）
    app.get("/health", (req, res) => {
      	  res.send("OK");
	//res.status(200).send("OK");
    });

    // ✅ 获取订单
    app.get("/orders", async (req, res) => {
      try {
        const orders = await orderCollection.find({}).toArray();
        res.send(orders);
      } catch (err) {
        console.error("❌ GET /orders error:", err);
        res.status(500).send("Internal Server Error");
      }
    });

    // ✅ 删除订单
    app.delete("/orders/:id", async (req, res) => {
      try {
        await orderCollection.deleteOne({ _id: Number(req.params.id) });
        res.send("ok");
      } catch (err) {
        console.error("❌ DELETE /orders error:", err);
        res.status(500).send("Internal Server Error");
      }
    });

    // ✅ 创建订单（含 memory stress）
    app.post("/orders", async (req, res) => {
      try {
        const orderSeq = await counterCollection.findOne({
          _id: "orderSeq",
        });

        await orderCollection.insertOne({
          _id: orderSeq.seq,
        });

        await counterCollection.updateOne(
          { _id: "orderSeq" },
          { $inc: { seq: 1 } }
        );

      //SRE-Test
     //globalOrder.push(Buffer.alloc(1000 * 1000 * 200, 1));

        res.send("ok");
      } catch (err) {
        console.error("❌ POST /orders error:", err);
        res.status(500).send("Internal Server Error");
      }
    });

    // ✅ 启动 server
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (err) {
    // ❌ MongoDB连接失败 → 直接退出（SRE标准做法）
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

// 启动应用
main();
