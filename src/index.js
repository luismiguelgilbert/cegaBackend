import express from 'express'
import bodyParser from 'body-parser'
import userRouter from './routes/users.js'
import orderRouter from './routes/orders.js'

const app = express();
const port = process.env.APPLICATION_PORT || 3000;
const baseApiRoute = '/api';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
})
app.use(`${baseApiRoute}/users`, userRouter);
app.use(`${baseApiRoute}/orders`, orderRouter);

app.listen(port, () => {
  console.log(`Cega backend server running on port: ${port}`);
})