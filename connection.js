const mysql = require("mysql");

require("dotenv").config();

const con = mysql.createConnection({
  host: process.env.DB_HOST, 
  user: process.env.DB_USERNAME, 
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DBNAME,
});

module.exports = con;
