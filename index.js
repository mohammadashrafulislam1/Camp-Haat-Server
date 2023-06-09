const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'Unauthorized access'})
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded)=>{
    if(err){
      return res.status(403).send({error: true, message: 'Forbidden access'})
    }
    req.decoded = decoded;
    next();
  })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.g2lboph.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Collections
    const usersCollections = client.db('campDb').collection('users');

    app.post('/jwt', (req, res)=>{
      const user=req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn:'1h'
      })
      res.send({token})
    })

    // users related api:
    app.post('/users', async(req, res)=>{
        const user = req.body;
        const query = {email: user.email}
        const existingUser =await usersCollections.findOne(query);
        console.log('existing user', existingUser)
        if(existingUser){
            return res.send({message: 'User Already Exist'})
        }
        const result = await usersCollections.insertOne(user);
        res.send(result)
    })
    app.patch('/users/admin/:id', async(req, res)=>{
       const id = req.params.id;
       const filter = {_id: new ObjectId(id)};
       const updateDoc = {
        $set:{
          role: 'admin'
        },
       };
       const result = await usersCollections.updateOne(filter, updateDoc);
       res.send(result)
    })
    app.get('/users', async(req, res)=>{
        const result = await usersCollections.find().toArray();
        res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Camp is Standing')
  })
  
  app.listen(port, () => {
    console.log(`Camp Haat is Standing on port ${port}`);
  })