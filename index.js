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
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const db = client.db("ai-prompt-marketplace")
        const promptsCollection = db.collection("prompts");
        const usersCollection = db.collection("user")
        const bookmarksCollection = db.collection("bookmarks");
        const reportsCollection = db.collection("reports");
        const reviewsCollection = db.collection("reviews");




        // Featured prompts


        app.get("/api/featured-prompts", async (req, res) => {
            try {

                const featured = await promptsCollection
                    .find({ status: "approved" })
                    .sort({ _id: -1 })
                    .limit(6)
                    .toArray();

                if (!featured || featured.length === 0) {
                    return res.status(200).json([]);
                }


                return res.status(200).json(featured);
            } catch (error) {
                console.error("Native MongoDB Featured Prompts Error:", error);
                return res.status(500).json([]);
            }
        });



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
        app.patch("/api/admin/users/role/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const { role } = req.body;
                const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
                const updateDoc = { $set: { role: role } };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result)
            } catch {
                res.status(500).send({ success: false, message: error.message });
            }
        })


        // user delete
        app.delete("/api/admin/users/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const filter = { _id: new ObjectId(id) };
                const result = await usersCollection.deleteOne(filter);
                res.send(result)
            } catch (error) {
                res.status(500).send({ success: false, message: error.message })
            };
        })


        // admin all prompt

        app.get("/api/admin/prompts", async (req, res) => {
            try {
                const result = await promptsCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message })
            }
        })


        // prompt stats and rejection feedback update

        app.patch("/api/admin/prompts/status/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const { status, feedback } = req.body;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        status: status,
                        feedback: feedback || ""
                    },
                };
                const result = await promptsCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        })


        // propt featured true/false


        app.patch("/api/admin/prompts/featured/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const { isFeatured } = req.body;
                const filter = { _id: new ObjectId(id) }
                const prompt = await promptsCollection.findOne(filter);

                if (!prompt) {
                    return res.status(404).send({ success: false, message: "Prompt not found" });

                }
                if (prompt.status !== "approved" && isFeatured === true) {
                    return res.status(400).send({ success: false, message: "Only approved prompts can be featured!" });
                }
                const updateDoc = {
                    $set: { isFeatured: isFeatured }
                };
                const result = await promptsCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message })
            }
        })

        // prompt delte api

        app.delete("/api/admin/prompts/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const filter = { _id: new ObjectId(id) };
                const result = await promptsCollection.deleteOne(filter);
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message })
            }
        })

        // admin analytics

        app.get("/api/admin/analytics", async (req, res) => {
            try {

                const totalUsers = await usersCollection.countDocuments();
                const totalPrompts = await promptsCollection.countDocuments();
                const totalReviews = await reviewsCollection.countDocuments();

                const promptsWithCopies = await promptsCollection.find({}, { projection: { copyCount: 1 } }).toArray();
                const totalCopies = promptsWithCopies.reduce(
                    (sum, p) => sum + (p.copyCount || 0),
                    0
                );

                res.status(200).json({
                    totalUsers,
                    totalPrompts,
                    totalReviews,
                    totalCopies
                });

            } catch (error) {
                console.error("Analytics Error:", error.message);
                res.status(500).json({ message: "Internal Server Error" });
            }
        });


        // prompt copy count

        app.patch("/api/prompts/copy/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $inc: { copyCount: 1 }
                };
                const result = await promptsCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                res.send(500).send({ success: false, message: error.message })
            }
        })


        // single prompt get api
        app.get("/api/prompts/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const query = { _id: new ObjectId(id) };
                const result = await promptsCollection.findOne(query);
                if (!result) {
                    return res.status(404).send({ success: false, message: error.message })
                };
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message })
            }
        })

        // bookmark api

        app.post("/api/bookmarks", async (req, res) => {
            try {
                const { promptId, userEmail, promptTitel } = req.body;

                // duplicated check
                const alredyBookmarkde = await bookmarksCollection.findOne({ promptId, userEmail });
                if (alredyBookmarkde) {
                    return res.status(400).send({ success: false, message: "Alrdy bookmarkded!" });
                }
                const result = await bookmarksCollection.insertOne({
                    promptId,
                    userEmail,
                    promptTitel,
                    createdAt: new Date()
                });
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message })
            }
        });


        // repot post api


        app.post("/api/reports", async (req, res) => {
            try {
                const { promptId, userEmail, promptTitle, reason } = req.body;

                const result = await reportsCollection.insertOne({
                    promptId,
                    userEmail,
                    promptTitle,
                    reason: reason || "Inappropriate content",
                    createdAt: new Date()
                });

                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });

        // all report get api
        app.get("/api/admin/reports", async (req, res) => {
            try {

                const result = await reportsCollection.find().sort({ createdAt: -1 }).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });





        // 
        app.post("/api/reviews", async (req, res) => {
            try {
                const { promptId, userName, userEmail, rating, comment } = req.body;

                if (!promptId || !userName || !comment) {
                    return res.status(400).send({ success: false, message: "Missing required fields" });
                }

                const newReview = {
                    promptId,
                    userName,
                    userEmail,
                    rating: parseInt(rating) || 5,
                    comment,
                    createdAt: new Date()
                };

                const result = await reviewsCollection.insertOne(newReview);


                newReview._id = result.insertedId;
                res.status(201).send(newReview);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });

        app.get("/api/reviews/:promptId", async (req, res) => {
            try {
                const { promptId } = req.params;


                const result = await reviewsCollection
                    .find({ promptId: promptId })
                    .sort({ createdAt: -1 })
                    .toArray();

                res.send(result);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });

        // homepage latest review
        app.get("/api/home-reviews", async (req, res) => {
            try {
                const latestReviews = await reviewsCollection
                    .find()
                    .sort({ createdAt: -1 })
                    .limit(4)
                    .toArray();

                res.send(latestReviews);
            } catch (error) {
                res.status(500).send({ success: false, message: error.message });
            }
        });



    // top creator API
   app.get("/api/top-creators", async (req, res) => {
  try {
    const prompts = await promptsCollection
      .find({ status: "approved" })
      .toArray();

    const creators = {};

    prompts.forEach((prompt) => {
      const email = prompt.userEmail;

      if (!email) return;

      if (!creators[email]) {
        creators[email] = {
          creatorName: prompt.creatorName || email.split("@")[0],
          userEmail: email,
          totalPrompts: 0,
          totalCopies: 0,
        };
      }

      creators[email].totalPrompts += 1;
      creators[email].totalCopies += prompt.copyCount || 0;
    });

    const topCreators = Object.values(creators)
      .sort((a, b) => b.totalCopies - a.totalCopies)
      .slice(0, 4);

    res.send(topCreators);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server Error" });
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