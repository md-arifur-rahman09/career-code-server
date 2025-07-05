require("dotenv").config()

const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require("cors");
const jwt = require('jsonwebtoken');
const app = express();
const cookieParser = require('cookie-parser');

const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://career-code-client-14ed8.web.app',
        'https://career-code-client-14ed8.firebaseapp.com'
    ],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ messsage: "unauthorize access" })
        }
        req.decoded = decoded;
        next();
    })
}


const emailVerification = (req, res, next) => {
    if (req.query.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
    }

    next();
}











const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.n1yvnuo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // await client.connect();

        // DB collection
        const jobsCollection = client.db("careerCode").collection("jobs");
        const applicationsCollection = client.db('careerCode').collection('applications');

        //node  >>  require("crypto").randomBytes(64).toString("hex")
        // jwt api
        app.post('/jwt', async (req, res) => {
            const userData = req.body;
            const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1y' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None'
            })
            res.send({ success: true })
        })




        // job api
        app.get('/allJobs', async (req, res) => {
            const result = await jobsCollection.find().toArray();
            res.send(result)
        })

        app.get("/jobs", verifyToken, emailVerification, async (req, res) => {

            const email = req.query.email;
            const query = { hr_email: email }
            const result = await jobsCollection.find(query).toArray();
            res.send(result)
        })




        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await jobsCollection.findOne(query);
            res.send(result)
        })



        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        })









        //  application api


        app.get('/applications', verifyToken, emailVerification, async (req, res) => {
            const email = req.query.email;


            const query = { applicant: email };
            const result = await applicationsCollection.find(query).toArray();

            // adding  job api data with applications api 
            for (const application of result) {
                const jobId = application.jobId;
                const query = { _id: new ObjectId(jobId) };
                const job = await jobsCollection.findOne(query);
                application.company = job.company;
                application.title = job.title;
                application.company_logo = job.company_logo

            }


            res.send(result)

        });

        app.get('/application/job/:id', async (req, res) => {
            const id = req.params.id;
            const query = { jobId: id }
            const result = await applicationsCollection.find(query).toArray();
            res.send(result)
        })




        app.post('/applications', async (req, res) => {
            const application = req.body;
            const result = await applicationsCollection.insertOne(application)
            res.send(result)
        })


        app.patch('/application/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: status
            }
            const options = { upsert: true }
            const result = await applicationsCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("hello Career Code server")
})



app.listen(port, () => {
    console.log(`My port is ${port}`)
})