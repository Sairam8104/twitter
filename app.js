const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const dbPath = path.join(__dirname, "twitterClone.db");
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let db = null;

const installDataBase = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server is Running on http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
  }
};

installDataBase();

const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { username } = request;
  const getUserFollowDetails = ` SELECT following_user_id, tweet , date_time as dateTime from 
    (user LEFT JOIN follower on user.user_id = follower.follower_user_id) as T inner join tweet on T.following_user_id = tweet.user_id
    where user.username = "${username}"`;
  const dbResponse = await db.all(getUserFollowDetails);
  response.send(dbResponse);
});

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const getUserDetails = `SELECT * FROM user WHERE username= "${username}";`;
  dbUser = await db.get(getUserDetails);
  if (password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  } else if (dbUser === undefined) {
    const createUserDetails = `INSERT INTO user (username,password,name,gender) 
            VALUES ("${username}","${hashedPassword}","${name}","${gender}");`;
    await db.run(createUserDetails);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserDetails = `SELECT * FROM user WHERE username= "${username}";`;
  dbUser = await db.get(getUserDetails);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordCorrect = await bcrypt.compare(password, dbUser.password);
    if (isPasswordCorrect) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;
