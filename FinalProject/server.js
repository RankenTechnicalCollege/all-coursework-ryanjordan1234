import express from 'express';
const app = express();
app.use (express.urlencoded({ extended: true }));
app.use(express.static('frontend'));

const port = process.env.PORT || 3000;

app.listen(port,() => {
    console.log(`Server running on port http://localhost:${port}`);
});

app.get('/api', (req, res) => {
    res.send(  'Hello from the server!');
});