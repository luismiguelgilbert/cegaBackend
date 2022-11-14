import express from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { formatResponse } from '../utils/responseHandler.js';
import {Blob} from 'buffer';
import { parse } from 'dotenv';
const prisma = new PrismaClient();

const orderRouter = express.Router();

orderRouter.route('/byUser/:id').get(async (request, response) => {
  try {
    const responsableID = request.params.id
    const responseData = await prisma.$queryRaw`
      select
      A.id
      ,A.cliente
      ,A.direccion
      ,A.description as detalle_actividad
      ,A.start_date
      ,DATE_FORMAT(A.start_date, '%d %b %Y') as start_date_format
      ,A.start_time
      ,DATE_FORMAT(A.start_time, '%T') as start_time_format
      ,A.responsable
      ,case 
          when A.orden_trabajo is not null then 'ot'
          else null
        end as tipo_trabajo
      ,COALESCE(A.informe_inicial, A.orden_trabajo) as orden_trabajo_id
      ,COALESCE(Aii.correlativo, Aot.correlativo) as correlativo
      ,COALESCE(AiiDir.direccion, AotDir.direccion) as direccion
      ,COALESCE(AiiContact.nombre, AotContact.nombre) as contacto
      ,COALESCE(Aii.detalle_trabajo, Aot.detalle_trabajo) as detalle_trabajo
      ,COALESCE(AiiCli.nombre_cliente, AotCli.nombre_cliente) as customerName
      ,COALESCE(AiiCli.direccion, AotCli.direccion) as customerAddress
      ,COALESCE(AiiCli.telefono, AotCli.telefono) as customerPhone
      ,COALESCE(AiiCli.telefono_contacto, AotCli.telefono_contacto) as customerContactPhone
      ,COALESCE(AiiCli.correo, AotCli.correo) as customerMail
      ,COALESCE(AiiCli.area, AotCli.area) as customerArea
      /*,'xxxxxxxxxxxxxxxxxxxx' as temp
      ,D.orden_trabajo_estado
      ,E.nombre as contactName
      ,E.cargo as contactArea
      ,E.telefono_contacto as contactPhone
      ,E.correo as contactMail*/
      from orden_trabajo_actividades A
      /*Informe Inicial*/
      left join informe_inicial Aii on A.informe_inicial = Aii.informe_inicial_id
      left join direcciones AiiDir ON Aii.direccion = AiiDir.direcciones_id
      left join contactos AiiContact ON Aii.contacto  = AiiContact.contactos_id
      left join clientes AiiCli ON Aii.cliente = AiiCli.clientes_id
      /*Orden Trabajo*/
      left join orden_trabajo Aot on A.orden_trabajo = Aot.orden_trabajo_id
      left join direcciones AotDir ON Aot.direccion  = AotDir.direcciones_id
      left join contactos AotContact ON Aot.contacto  = AotContact.contactos_id  
      left join clientes AotCli ON Aot.cliente = AotCli.clientes_id
      where A.responsable = ${Prisma.raw(responsableID ? ` ${responsableID}` : ' ')}
      and (Aii.estado_informe_inicial = 1 or Aot.orden_trabajo_estado = 1)
      order by A.start_date, A.start_time
    `
    response.json(responseData);
  } catch(err) {
    console.error(`Error in route: "${request.url}" =>  ${err}}`);
    response.status(500).send(err.message);
  }
})

orderRouter.route('/equipos').get(async (request, response) => {
  try {
    const responseData = await prisma.$queryRaw`
      select distinct
       A.equipos_id
      ,B.cliente 
      ,A.descripcion_equipo
      ,A.capacidad_btu
      ,A.codigo_equipo
      ,A.codigo_equipo
      ,A.marca_equipo
      ,A.modelo
      ,A.serie
      ,B.area
      ,'' as informeTecnico
      ,'' as archivo
      from equipos A
      inner join clientes_equipos B on A.equipos_id = B.equipo
      where B.cliente in (select c.clientes_id from clientes c)
      order by A.equipos_id
    `
    response.json(responseData);
  } catch(err) {
    console.error(`Error in route: "${request.url}" =>  ${err}}`);
    response.status(500).send(err.message);
  }
})

orderRouter.route('/guardar-informe').post(async (request, response) => {
  try {
    const tipo_trabajo = request.body.orderData.tipo_trabajo;
    const cliente = request.body.orderData.cliente;
    const informe_orden_id = request.body.orderData.orden_trabajo_id;
    const cliente_equipo = request.body.equipoData.equipos_id;
    const informeTecnico = request.body.equipoData.informeTecnico;
    const userID = request.body.userID;
    let registrosEncontrados = null;
    let new_informe_equipo_id = null;


    registrosEncontrados = await prisma.$queryRaw`
      select count(*) as registrosEncontrados
      from informe_equipo a
      where 1 = 1 
      and a.cliente = ${Prisma.raw(cliente ? ` ${cliente}` : ' 0')}
      and a.clientes_equipos = ${Prisma.raw(cliente_equipo ? ` ${cliente_equipo}` : ' 0')}
      ${Prisma.raw(tipo_trabajo ?
        ` and a.orden_trabajo = ${informe_orden_id} `
        : ` and a.informe_inicial = ${informe_orden_id} `
      )}
    `
    const existingRows = parseInt(registrosEncontrados[0].registrosEncontrados);

    console.log({tipo_trabajo})
    console.log({cliente})
    console.log({informe_orden_id})
    console.log({cliente_equipo})
    console.log({informeTecnico})
    console.log({userID})
    console.log({existingRows})

    // Es Orden Trabajo
    if (tipo_trabajo === 'ot') {
      if(existingRows === 0){//Es Orden Trabajo + Nuevo
        console.log('Insertando nuevo Informe de OT')
        await prisma.$queryRaw`
          insert into informe_equipo
          (cliente, orden_trabajo, orden_trabajo_actividades, clientes_equipos, informe, usuario_creacion, fecha_creacion)
          select
          ${Prisma.raw(parseInt(cliente))},
          ${Prisma.raw(parseInt(informe_orden_id))},
          0,
          ${Prisma.raw(parseInt(cliente_equipo))},
          <p>${Prisma.raw(informeTecnico)}</p>,
          ${Prisma.raw(parseInt(userID))},
          NOW()
        `
      } else {
        console.log('Actualizando Informe de OT')
        await prisma.$queryRaw`
          update informe_equipo set
          informe = '<p>${Prisma.raw(informeTecnico)}</p>',
          usuario_modificacion = ${Prisma.raw(parseInt(userID))},
          fecha_modificacion = NOW()
          where
          cliente = ${Prisma.raw(parseInt(cliente))}
          and orden_trabajo = ${Prisma.raw(parseInt(informe_orden_id))}
          and clientes_equipos = ${Prisma.raw(parseInt(cliente_equipo))}
        `
      }

      new_informe_equipo_id = await prisma.$queryRaw`
        select informe_equipo_id
        from informe_equipo a
        where 1 = 1 
        and a.cliente = ${Prisma.raw(cliente ? ` ${cliente}` : ' 0')}
        and a.clientes_equipos = ${Prisma.raw(cliente_equipo ? ` ${cliente_equipo}` : ' 0')}
        ${Prisma.raw(tipo_trabajo ?
          ` and a.orden_trabajo = ${informe_orden_id} `
          : ` and a.informe_inicial = ${informe_orden_id} `
        )}
      `

      console.log(new_informe_equipo_id)
      response.json(new_informe_equipo_id)
      
    } else { 
      console.log('Informe Inicial...')
      if(existingRows === 0){//Es Informe Inicial + Nuevo
        console.log('Insertando nuevo Informe Inicial')
        await prisma.$queryRaw`
          insert into informe_equipo
          (cliente, informe_inicial, orden_trabajo_actividades, clientes_equipos, informe, usuario_creacion, fecha_creacion)
          select
          ${Prisma.raw(parseInt(cliente))},
          ${Prisma.raw(parseInt(informe_orden_id))},
          0,
          ${Prisma.raw(parseInt(cliente_equipo))},
          '<p>${Prisma.raw(informeTecnico)}</p>',
          ${Prisma.raw(parseInt(userID))},
          NOW()
        `
      } else {
        console.log('Actualizando Informe Inicial')
        await prisma.$queryRaw`
          update informe_equipo set
          informe = '<p>${Prisma.raw(informeTecnico)}</p>',
          usuario_modificacion = ${Prisma.raw(parseInt(userID))},
          fecha_modificacion = NOW()
          where
          cliente = ${Prisma.raw(parseInt(cliente))}
          and informe_inicial = ${Prisma.raw(parseInt(informe_orden_id))}
          and clientes_equipos = ${Prisma.raw(parseInt(cliente_equipo))}
        `
      }

      new_informe_equipo_id = await prisma.$queryRaw`
        select informe_equipo_id
        from informe_equipo a
        where 1 = 1 
        and a.cliente = ${Prisma.raw(cliente ? ` ${cliente}` : ' 0')}
        and a.clientes_equipos = ${Prisma.raw(cliente_equipo ? ` ${cliente_equipo}` : ' 0')}
        ${Prisma.raw(tipo_trabajo ?
          ` and a.orden_trabajo = ${informe_orden_id} `
          : ` and a.informe_inicial = ${informe_orden_id} `
        )}
      `

      console.log(new_informe_equipo_id)
      response.json(new_informe_equipo_id)
    }

  } catch(err) {
    console.log(err)
    result = formatResponse(500, err.message || 'Error no identificado', null);
    console.error(result)
    response.status(result.statusCode).send(result);
  }
})

orderRouter.route('/guardar-informe-imagen').post(async (request, response) => {
  try{
    console.log('FLAG 00')
    console.log(request.body.equipoData)
    console.log(JSON.stringify(request.body.equipoData.archivo))
    const informe_equipo = 0;
    const cargar = new Blob(request.body.equipoData.archivo)
    const nombre_archivo = 'imagen-0';
    const usuario = 1;
    console.log('FLAG 01')
    console.log(request.body.equipoData.archivo)
    const informe_equipo_imagenes = await prisma.informe_equipo_imagenes.create({
      data: {
        informe_equipo,
        cargar,
        nombre_archivo,
        usuario_creacion: 1
      }
    })
    return informe_equipo_imagenes;
  } catch(err) {
    console.log(err)
    result = formatResponse(500, err.message || 'Error no identificado', null);
    console.error(result)
    response.status(result.statusCode).send(result);
  }
})

// module.exports = { orderRouter };
export default orderRouter;