require('dotenv/config');
const express = require('express');
const staticMiddleware = require('./static-middleware');
const errorMiddleware = require('./error-middleware');
const jsonMiddleware = express.json();
const pg = require('pg');
const path = require('path');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const ClientError = require('./client-error');
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const app = express();
const publicPath = path.join(__dirname, 'public');

app.use(jsonMiddleware);
app.use(staticMiddleware);

app.post('/api/restaurants', (req, res) => {
  const sql = `
  insert into "restaurants" ("restaurantName", "userId")
  values ($1, $2)
  returning *
  `;
  const values = [req.body.restaurant, req.body.currUser];

  db.query(sql, values)
    .then(result => {
      res.status(201);
      res.json(result.rows);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: 'An unexpected error has occured' });
    }
    );
});

app.delete('/api/restaurants/:userId', (req, res) => {
  const userId = req.params.userId;
  const restaurantName = req.body.restaurant;
  const sql = `
  delete from "restaurants"
  where "restaurantName" = $1
  and "userId" = $2
  returning *
  `;
  const values = [restaurantName, userId];
  db.query(sql, values)
    .then(result => {
      if (!result.rows[0]) {
        res.status(404).json({ error: `cannot find restaraunt ${restaurantName}` });
      } else {
        res.sendStatus(204);
      }
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: 'An unexpected error occured.' });
    });
});

app.post('/api/meals', (req, res) => {
  const sql = `
  insert into "meals" ("userId", "mealName", "servingSize", "calories", "protein", "fat", "carbohydrates", "restaurantName", "img")
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  returning *
  `;
  const values = [
    req.body.userId,
    req.body.mealName,
    req.body.servingSize,
    req.body.calories,
    req.body.protein,
    req.body.fat,
    req.body.carbohydrates,
    req.body.restaurantName,
    req.body.img
  ];

  db.query(sql, values)
    .then(result => {
      res.status(201);
      res.json(result.rows);
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: 'An unexpected error has occured' });
    }
    );
});

app.delete('/api/meals/:userId', (req, res) => {
  const userId = req.params.userId;
  const mealName = req.body.mealName;
  const sql = `
  delete from "meals"
  where "mealName" = $1
  and "userId" = $2
  returning *
  `;
  const values = [mealName, userId];
  db.query(sql, values)
    .then(result => {
      if (!result.rows[0]) {
        res.status(404).json({ error: `cannot find meal ${mealName}` });
      } else {
        res.sendStatus(204);
      }
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: 'An unexpected error occured.' });
    });
});

app.get('/api/restaurants/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const sql = `
  select * from "restaurants"
  where "userId" = $1

  `;
  const params = [userId];
  db.query(sql, params)
    .then(result => {
      const [user] = result.rows;
      if (!user) {
        throw new ClientError(401, 'invalid user');
      }
      res.json(result.rows);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: 'an unexpected error occurred'
      });
    });
});

app.get('/api/meals/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const sql = `
  select * from "meals"
  where "userId" = $1
  `;
  const params = [userId];
  db.query(sql, params)
    .then(result => {
      const [user] = result.rows;
      if (!user) {
        throw new ClientError(401, 'invalid user');
      }
      res.json(result.rows);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: 'an unexpected error occurred'
      });
    });
});

app.delete('/api/profile/restaurants/:userId', (req, res) => {
  const userId = req.params.userId;
  const restaurant = req.body.restaurant;
  const sql = `
  delete from "restaurants"
  where "userId" = $1
  and "restaurantName" = $2
  returning *
  `;
  const values = [userId, restaurant];
  db.query(sql, values)
    .then(result => {
      if (!result.rows[0]) {
        res.status(404).json({ error: `cannot find restaraunt ${restaurant}` });
      } else {
        res.sendStatus(204);
      }
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: 'An unexpected error occured.' });
    });
});

app.delete('/api/profile/meals/:mealId', (req, res) => {
  const mealId = req.params.mealId;
  const sql = `
  delete from "meals"
  where "mealId" = $1
  returning *
  `;
  const values = [mealId];
  db.query(sql, values)
    .then(result => {
      if (!result.rows[0]) {
        res.status(404).json({ error: `cannot find meal ${mealId}` });
      } else {
        res.sendStatus(204);
      }
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({ error: 'An unexpected error occured.' });
    });
});

app.use(express.static(publicPath));
app.use(express.json());

app.post('/api/auth/sign-up', (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ClientError(400, 'username and password are required fields');
  }
  argon2
    .hash(password)
    .then(hashedPassword => {
      const sql = `
        insert into "users" ("username", "hashedPassword")
        values ($1, $2)
        returning "userId", "username"
      `;
      const params = [username, hashedPassword];
      return db.query(sql, params);
    })
    .then(result => {
      const [user] = result.rows;
      res.status(201).json(user);
    })
    .catch(err => next(err));
});

app.post('/api/auth/sign-in', (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ClientError(401, 'invalid login');
  }
  const sql = `
    select "userId",
           "hashedPassword"
      from "users"
     where "username" = $1
  `;
  const params = [username];
  db.query(sql, params)
    .then(result => {
      const [user] = result.rows;
      if (!user) {
        throw new ClientError(401, 'Invalid username or password');
      }
      const { userId, hashedPassword } = user;
      return argon2
        .verify(hashedPassword, password)
        .then(isMatching => {
          if (!isMatching) {
            throw new ClientError(401, 'Invalid username or password');
          }
          const payload = { userId, username };
          const token = jwt.sign(payload, process.env.TOKEN_SECRET);
          res.json({ token, user: payload });
        });
    })
    .catch(err => next(err));
});

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  process.stdout.write(`\n\napp listening on port ${process.env.PORT}\n\n`);
});
