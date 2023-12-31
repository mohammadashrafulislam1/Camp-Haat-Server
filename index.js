const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
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
    const coursesCollections = client.db('campDb').collection('courses');
    const cartsCollections = client.db('campDb').collection('carts');
    const paymentsCollections = client.db('campDb').collection('payments');

    app.post('/jwt', (req, res)=>{
      const user=req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn:'1h'
      })
      res.send({token})
    })
// Admin middleware
    const verifyAdmin = async(req, res, next)=>{
     const email = req.decoded.email;
     const query ={email: email}
     const user = await usersCollections.findOne(query);
     if(user?.role !== 'admin'){
      return res.status(403).send({error:true, message: 'forbidden message'})
     }
     next();
    }
  
// Instructor MiddleWare
const verifyInstructor = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await usersCollections.findOne(query);
  
  if (user?.role !== 'Instructor') {
    return res.status(403).send({ error: true, message: 'Forbidden' });
  }

  next();
};


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
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }
    
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    });
    
    app.patch('/users/Instructor/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
       $set:{
         role: 'Instructor'
       },
      };
      const result = await usersCollections.updateOne(filter, updateDoc);
      res.send(result)
   })
   app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;
    if (req.decoded.email !== email) {
      return res.send({ Instructor: false });
    }
  
    const query = { email: email };
    const user = await usersCollections.findOne(query);
    const result = { Instructor: user?.role === 'Instructor' };
    res.send(result);
  });
  
    app.get('/users', verifyJWT, verifyAdmin, async(req, res)=>{
        const result = await usersCollections.find().toArray();
        res.send(result)
    })
    
    app.delete('/users/:id', async(req, res)=>{
      const id = req.params.id;
     const query = {_id: new ObjectId(id)}
      const result = await usersCollections.deleteOne(query);
      res.send(result)
    })
    // courses Related API
    app.post('/courses', async(req, res)=>{
     const newItem = req.body;
     const result = await coursesCollections.insertOne(newItem)
     res.send(result)
    })
    app.get('/courses', async(req, res)=>{
      const result = await coursesCollections.find().toArray();
      res.send(result)
    })
    app.get('/courses/:id', async (req, res) => {
      const courseId = req.params.id;
      const id = { _id: new ObjectId(courseId)};
      const result = await coursesCollections.findOne(id);
        res.send(result); 
    }),
    app.patch('/courses/:id', async (req, res) => {
      const courseId = req.params.id;
      const { seats, enroll } = req.body;
    
      try {
        const id = { _id: new ObjectId(courseId) };
        const result = await coursesCollections.updateOne(id, { $set: { seats, enroll } });
    
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send('Failed to update the course.');
      }
    });
    app.patch('/courses/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
       $set:{
         status: 'approved'
       },
      };
      const result = await coursesCollections.updateOne(filter, updateDoc);
      res.send(result)
   })
    
    app.get('/mycourses', async(req, res)=>{
      let query = {};
      if(req.query?.email){
        query = { email: req.query.email}
      }
      const result = await coursesCollections.find(query).toArray();
      res.send(result)
    })
    app.delete('/mycourses/:id', async(req, res)=>{
      const id = req.params.id;
     const query = {_id: new ObjectId(id)}
      const result = await coursesCollections.deleteOne(query);
      res.send(result)
    })
    // cart related api
    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartsCollections.insertOne(item);
      res.send(result);
    });
    
    app.get('/carts', async (req, res) => {
      const result = await cartsCollections.find().toArray();
      res.send(result);
    });
    
    app.get('/mycarts', verifyJWT, async(req, res) => {
      let query = {};
      if(req.query?.enrollEmail){
        query = { enrollEmail: req.query.enrollEmail}
      }
      const decodedEmail = req.decoded.email;
      if(req.query.enrollEmail !== decodedEmail){
       return res.status(401).send({error: true, message: 'Forbidden access'})
      }
      const result = await cartsCollections.find(query).toArray();
      res.send(result);
    });
    // app.delete('/mycarts/:id', async(req, res)=>{
    //   const id = req.params.id;
    //  const query = {_id: new ObjectId(id)}
    //   const result = await cartsCollections.deleteOne(query);
    //   res.send(result)
    // })

    // Payment Related API
    app.post('/create-payment-intent', async(req, res)=>{
      const {price} = req.body;
      const amount = price*100;
      console.log(price, amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    app.post('/payments', async(req, res)=>{
      const payment = req.body;
      const insertResult = await paymentsCollections.insertOne(payment);

      const query ={_id: {$in: payment.cartItems.map(id => new ObjectId(id))}}

      const deleteResult = await cartsCollections.deleteMany(query)
      res.send({insertResult, deleteResult})
    })
    app.get('/payments', async (req, res) => {
      let query = {};
      if(req.query?.email){
        query = { email: req.query.email}
      }
      const result = await paymentsCollections.find(query).toArray();
      res.send(result);
    });
    app.get('/ordered', async (req, res) => {
      let query = {};
      if (req.query?.instructorEmail) {
        query = { instructorEmail: req.query.instructorEmail };
      }
      const result = await paymentsCollections.find(query).toArray();
      res.send(result);
    });
    app.patch('/ordered/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
       $set:{
         status: 'approved'
       },
      };
      const result = await paymentsCollections.updateOne(filter, updateDoc);
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