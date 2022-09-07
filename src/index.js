require('dotenv').config();
const express = require('express')
const app = express();
const bodyParser = require('body-parser')
const port = process.env.APPLICATION_PORT || 3000;
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', async (request, response) => {
  try {
    const allUsers = await prisma.sec_users.findMany();
    response.json(allUsers);
  } catch(err) {
    console.log(`Error in route: "${request.url}" =>  ${err}}`);
    response.status(500).send(err.message);
  }
})

app.listen(port, () => {
  console.log(`Cega backend server running on port: ${port}`);
})