const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config();


const uri = process.env.MONGO_DB_URI;
const app = express()
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});




async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const db = client.db("ai-prompt-marketplace")
        const promptsCollection = db.collection("prompts");


        // creator prompt add

        app.post("/api/prompts", async (req, res) => {
            try {
                const newPrompt = req.body;
                newPrompt.createdAt = new Date();
                newPrompt.status = "pending";

                const result = await promptsCollection.insertOne(newPrompt);
                res.status(201).send(result)
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }

        })

        app.get("/api/prompts", async (req, res) => {
            try {
                const result = await promptsCollection.find().sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        })


        // 📊 Creator Dashboard Stats & Chart Data (একদম সিম্পল স্টাইল)
        app.get("/api/creator-analytics", async (req, res) => {
            try {
                const allPrompts = await promptsCollection.find().toArray();

                // ১. কার্ডের জন্য ছোট ছোট স্ট্যাটস ক্যালকুলেশন
                const totalPrompts = allPrompts.length;
                const pendingPrompts = allPrompts.filter(p => p.status === "pending").length;
                const approvedPrompts = allPrompts.filter(p => p.status === "approved").length;

                // টোটাল আর্নিং (যেগুলো সেল হয়েছে - ডেমো হিসেবে প্রাইসের সাম)
                const totalEarnings = allPrompts.reduce((sum, p) => sum + (p.price || 0), 0);

                // ২. Recharts গ্রাফের জন্য একদম রেডিমেড লাইটওয়েট ডেটা ফরম্যাট
                // (লাস্ট ৪/৫ টা প্রম্পটের নাম আর প্রাইস দিয়ে গ্রাফ বানানোর জন্য)
                const chartData = allPrompts.slice(0, 6).map(p => ({
                    name: p.title.substring(0, 10) + "...", // বড় নাম ছোট করার জন্য
                    price: p.price || 0,
                    copied: p.copyCount || 0
                })).reverse();

                res.send({
                    stats: { totalPrompts, pendingPrompts, approvedPrompts, totalEarnings },
                    chartData
                });
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });




    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }

}
run().catch(console.dir);









app.get("/", (req, res) => {
    res.send("Server is runnig fine AI prompts!")
})

app.listen(PORT, () => {
    console.log(`Server runnig on port ${PORT}`)
})