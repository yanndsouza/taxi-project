import 'dotenv/config'
import express from "express";
import {Express, Request, Response} from "express";
import { Client } from "@googlemaps/google-maps-services-js";
import { initializeDatabase } from './database';

const cors = require('cors');
const app: Express = express();
const PORT: Number = 8080;
const googleMapsClient = new Client({});

app.use(cors({
  origin: ['http://localhost', 'http://localhost:80'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

interface TripRequestBody {
  customer_id: string;
  origin: string;
  destination: string;
}

interface TripDetailsRequestBody {
  customer_id: string,
  origin: string,
  destination: string,
  distance: number,
  duration: string,
  driver: {
    id: number,
    name: string
  },
  value: number
}

const drivers = [
  {
    id: 1,
    name: "Homer Simpson",
    description: "Olá! Sou o Homer, seu motorista camarada! Relaxe e aproveite o passeio, com direito a rosquinhas e boas risadas (e talvez alguns desvios).",
    vehicle: "Plymouth Valiant 1973 rosa e enferrujado",
    review: {
      rating: 2,
      comment: "Motorista simpático, mas errou o caminho 3 vezes. O carro cheira a donuts."
    },
    fare: 2.5,
    minDistance: 1
  },
  {
    id: 2,
    name: "Dominic Toretto",
    description: "Ei, aqui é o Dom. Pode entrar, vou te levar com segurança e rapidez ao seu destino. Só não mexa no rádio, a playlist é sagrada.",
    vehicle: "Dodge Charger R/T 1970 modificado",
    review: {
      rating: 4,
      comment: "Que viagem incrível! O carro é um show à parte e o motorista, apesar de ter uma cara de poucos amigos, foi super gente boa. Recomendo!"
    },
    fare: 5,
    minDistance: 5
  },
  {
    id: 3,
    name: "James Bond",
    description: "Boa noite, sou James Bond. A seu dispor para um passeio suave e discreto. Aberto o cinto e aproveite a viagem.",
    vehicle: "Aston Martin DB5 clássico",
    review: {
      rating: 5,
      comment: "Serviço impecável! O motorista é a própriadefinição de classe e ocarro é simplesmentemagnífico. Umaexperiência digna de um agente secreto."
    },
    fare: 10,
    minDistance: 10
  }
];

app.post("/ride/estimate", async (req: Request, res: Response):Promise<any> => {
  const { customer_id, origin, destination } = req.body as TripRequestBody;

  if (!origin || !destination || !customer_id || origin === destination) {
    return res.status(400).json({
      error_code: "INVALID_DATA",
      error_description: "Os dados fornecidos no corpo da requisição são inválidos",
    });
  }

  try {
    const response = await googleMapsClient.directions({
      params: {
        origin: origin,
        destination: destination,
        key: process.env.GOOGLE_API_KEY || '',
      },
    });

    const route = response.data.routes[0];
    const leg = route.legs[0];

    const availableDrivers = drivers.filter(driver => leg.distance.value >= driver.minDistance * 1000)
      .map(driver => ({
        id: driver.id,
        name: driver.name,
        description: driver.description,
        vehicle: driver.vehicle,
        review: driver.review,
        value: Number((driver.fare * leg.distance.value / 1000).toFixed(2))
      }))
      .sort((a, b) => a.value - b.value);

    if (availableDrivers.length === 0) {
      return res.status(404).json({
        message: "Não há motoristas disponiveis",
      });
    }

    return res.status(200).json({
      origin: {
        latitude: leg.start_location.lat,
        longitude: leg.start_location.lng
      },
      destination: {
        latitude: leg.end_location.lat,
        longitude: leg.end_location.lng
      },
      distance: leg.distance.value,
      duration: leg.duration.text,
      options: availableDrivers,
      routeResponse: route
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error_description: "Erro ao calcular a rota.",
    });
  }
});

app.patch("/ride/confirm", async (req: Request, res: Response):Promise<any> => {
  const {
    customer_id,
    origin,
    destination,
    distance,
    duration,
    driver,
    value
  } = req.body as TripDetailsRequestBody;

  if (!origin || !destination || !customer_id || origin === destination) {
    return res.status(400).json({
      error_code: "INVALID_DATA",
      error_description: "Os dados fornecidos no corpo da requisição são inválidos",
    });
  }

  if (!driver || !driver.id || !driver.name || driver.name.trim() === "") {
    return res.status(404).json({
      error_code: "DRIVER_NOT_FOUND",
      error_description: "Motorista não encontrado ",
    });
  }

  const driverExists = drivers.find(d =>
    d.id === driver.id &&
    d.name.toLowerCase() === driver.name.toLowerCase().trim()
  );

  if (!driverExists) {
    return res.status(404).json({
      error_code: "DRIVER_NOT_FOUND",
      error_description: "Motorista não encontrado",
    });
  }

  const distanceInKm = distance / 1000;
  if (distanceInKm < driverExists.minDistance) {
    return res.status(406).json({
      error_code: "INVALID_DISTANCE",
      error_description: "Quilometragem inválida para o motorista",
    });
  }

  try {
    const db = await initializeDatabase();

    await db.run(
      'INSERT OR IGNORE INTO customers (customer_id) VALUES (?)',
      [customer_id]
    );

    const result = await db.run(
      `INSERT INTO rides (
                customer_id, origin, destination, distance, 
                duration, driver_id, driver_name, value
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        origin,
        destination,
        distance,
        duration,
        driver.id,
        driver.name,
        value
      ]
    );
    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error('Erro ao salvar no banco:', error);
    return res.status(500).json({
      error_code: "DATABASE_ERROR",
      error_description: "Erro ao salvar a viagem"
    });
  }
});

app.get("/ride/:customerId", async (req: Request, res:Response):Promise<any> => {
  const { customerId } = req.params;
  const { driver_id } = req.query;

  try {
    const db = await initializeDatabase();

    if (!customerId) {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description: "O id do cliente não é valido"
      });
    }

    if (driver_id) {
      const validDriver = drivers.some(driver => driver.id === Number(driver_id));

      if (!validDriver) {
        return res.status(400).json({
          error_code: "INVALID_DRIVER",
          error_description: "Motorista invalido"
        });
      }
    }

    let query = `
            SELECT id, date, origin, destination, distance, duration, 
                   driver_id as "driver.id", driver_name as "driver.name", value
            FROM rides 
            WHERE customer_id = ?
        `;

    const queryParams: any[] = [customerId];

    if (driver_id) {
      query += ` AND driver_id = ?`;
      queryParams.push(Number(driver_id));
    }

    query += ` ORDER BY date DESC`;

    const rides = await db.all(query, queryParams);

    if (rides.length === 0) {
      return res.status(404).json({
        error_code: "NO_RIDES_FOUND",
        error_description: "Nenhum registro encontrado"
      });
    }

    return res.status(200).json({
      customer_id: req.params.customerId,
      rides: rides.map(ride => ({
        id: ride.id,
        date: ride.date,
        origin: ride.origin,
        destination: ride.destination,
        distance: ride.distance,
        duration: ride.duration,
        driver: {
          id: ride["driver.id"],
          name: ride["driver.name"]
        },
        value: ride.value
      }))
    });
  } catch (error) {
    console.error('Erro ao consultar o banco:', error);
    return res.status(500).json({
      error_code: "DATABASE_ERROR",
      error_description: "Erro ao consultar as viagens"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
