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

        app.post("/api/prompts",async(req,res)=>{
           try{
             const newPrompt = req.body;
            newPrompt.createdAt = new Date();
            newPrompt.status ="pending";
            
            const result=await promptsCollection.insertOne(newPrompt);
            res.status(201).send(result)
           }catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }

        })





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