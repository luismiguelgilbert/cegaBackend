import express from 'express'
import { PrismaClient } from '@prisma/client'
import { formatResponse } from '../utils/responseHandler.js';

const prisma = new PrismaClient();
const userRouter = express.Router();

userRouter.route('/login').post(async (request, response) => {
  let result;
  try {
    const username = request.body.username;
    const password = request.body.password;
    if(!username || !password) {
      result = formatResponse(401, 'Credenciales incorrecta', null);
    } else {
      const userData = await prisma.sec_users.findMany(
        { where: {
            login: username,
            pswd: password,
            active: 'Y',
          },
          select: {
            login_id: true,
            login: true,
            name: true,
            email: true
          },
        }
      );
      if(userData.length > 0) {
        result = formatResponse(200, 'OK', userData);
      } else {
        result = formatResponse(404, 'No se encontró usuario', null);
      }
    }
    response.status(result.statusCode).send(result);
  } catch(err) {
    result = formatResponse(500, err.message || 'Error no identificado', null);
    console.error(result)
    response.status(result.statusCode).send(result);
  }
})

userRouter.route('/users').get(async (request, response) => {
  try {
    console.log('users...')
    const allUsers = await prisma.sec_users.findMany();
    response.json(allUsers);
  } catch(err) {
    console.error(`Error in route: "${request.url}" =>  ${err}}`);
    response.status(500).send(err.message);
  }
})

export default userRouter;