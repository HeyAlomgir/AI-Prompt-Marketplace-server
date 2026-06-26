const express = require('express');
const app = express()
const PORT = 5000

app.get("/", (req,res)=>{
    res.send("Server is runnig fine AI prompts!")
})

app.listen(PORT,()=>{
    console.log(`Server runnig on port ${PORT}`)
})