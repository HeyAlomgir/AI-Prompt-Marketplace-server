const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const usersCollection = db.collection("user")


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


        // Creator Dashboard Stats & Chart Dat
        app.get("/api/creator-analytics", async (req, res) => {
            try {
                const allPrompts = await promptsCollection.find().toArray();
                const totalPrompts = allPrompts.length;
                const pendingPrompts = allPrompts.filter(p => p.status === "pending").length;
                const approvedPrompts = allPrompts.filter(p => p.status === "approved").length;

                const totalEarnings = allPrompts.reduce((sum, p) => sum + (p.price || 0), 0);
                const chartData = allPrompts.slice(0, 6).map(p => ({
                    name: p.title.substring(0, 10) + "...",
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


        // all user get

        app.get("/api/admin/users", async (req, res) => {
            try {
                const result = await usersCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        })


        // user role update 
        app.patch("/api/admin/users/role/:id",async (req,res)=>{
            try{
                const{id}=req.params;
                const{role}=req.body;
                const filter=ObjectId.isValid(id)?{_id:new ObjectId(id)}:{_id:id};
                const updateDoc  = {$set: {role:role}};
                const result = await usersCollection.updateOne(filter,updateDoc);
                res.send(result)
            }catch{
                res.status(500).send({success:false,message:error.message});
            }
        })


        // user delete
        app.delete("/api/admin/users/:id",async(req,res)=>{
            try{
                const {id}=req.params;
                const filter={_id: new ObjectId(id)};
                const result=await usersCollection.deleteOne(filter);
                res.send(result)
            }catch(error){
                res.status(500).send({success:false,message:error.message})};
        })


        // admin all prompt

        app.get("/api/admin/prompts",async(req,res)=>{
            try{
                const result=await promptsCollection.find().toArray();
                res.send(result);
            }catch(error){
                res.status(500).send({success:false,message:error.message})
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