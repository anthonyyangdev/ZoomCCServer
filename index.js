const express = require('express');
const mongodb = require('mongodb');
const bodyParser = require('body-parser');

const ObjectId = mongodb.ObjectID;
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

async function prepareDb() {
    let collection;
    let db;
    const uri = process.env.PROD_MONGODB || 'mongodb://localhost:27017/'
    console.log(true, uri, true);
    const client = await mongodb.MongoClient.connect(uri,{
        useUnifiedTopology: true,
        useNewUrlParser: true
    });
    try {
        await client.connect();
        db = client.db("zoom");
        try {
            collection = await db.createCollection('ids');
        } catch {
            console.log("Collection already exists");
            collection = await db.collection('ids');
        }
        console.log("Collection ready");
    } catch (e) {
        console.log(e, false);
        return;
    }

    app.get('/', (req, res) => {
        return res.send({message: "Connection works"});
    });

    app.get('/session/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const doc = await collection.findOneAndUpdate({
                _id: new ObjectId(id)
            }, {
                $inc: {
                    seq: 1
                }
            });
            const value = doc.value;
            return res.send({
                url: `${value.url}&seq=${value.seq}&lang=${value.lang}`
            });
        } catch (e) {
            return res.send({
                message: "Error",
                error: e
            });
        }
    });

    app.post('/session/create', async (req, res) => {
        const token = req.body.token;
        const doc = await collection.findOne({
            url: token
        })
        if (doc != null) {
            return res.status(200).send({
                message: "Already exists",
                id: doc._id
            });
        } else {
            const doc = await collection.insertOne({
                url: token,
                seq: 1,
                lang: 'en-US'
            });
            return res.status(201).send(
                {
                    message: "Session created",
                    id: doc.insertedId
                });
        }
    });

    const port = process.env.PORT || 8080;
    app.listen(port, () => {
        console.log(true);
        console.log("Listening on port " + port);
    }).on('close', (err) => {
        db != null && db.close();
    })
}

prepareDb()