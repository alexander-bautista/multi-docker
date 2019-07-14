const keys = require('./keys');

// express set app
const express = require('express');
const bodyParser  = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

//postgres client setup
const {Pool} = require('pg');
const pgClient = new Pool({
    user : keys.pgUser,
    password : keys.pgPassword,
    database : keys.pgDatabase,
    host: keys.pgHost,
    port: keys.pgPort
});

pgClient.on('error', ()=> {
    console.log('Lost PG Connection'); 
});

pgClient
    .query('CREATE TABLE IF NOT EXISTS values(number INT)')
    .catch(err => console.log(err));

// redis client setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

// express routes
app.get('/', (req,res) => {
    res.send('hi');
});

app.get('/values/all', async (req, res)=> {
    const values =  await pgClient.query('SELECT * FROM values');
    res.send(values.rows);
});

app.get('/values/current', (req, res)=> {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index  = req.body.index;

    if (parseInt(index)>40){
        res.status(422).send('index value too high');
    }

    redisClient.hset('values', index, 'Nothing yet!!');
    redisPublisher.publish('insert', index);

    pgClient.query('INSERT INTO values(number) VALUES ($1)', [index]);

    res.send({working: true});
});

app.listen(5000, err => {
    console.log('listening');
    
})