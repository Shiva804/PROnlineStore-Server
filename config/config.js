const fs = require("fs");

module.exports = {
    development: {
        username: process.env.PROD_DB_USERNAME,
        password: process.env.PROD_DB_PASSWORD,
        database: process.env.PROD_DB_NAME,
        storage: "./database/PRFURNITURE.sqlite",
        dialect: "sqlite",
        logging: false,
    },
    test: {
        username: process.env.PROD_DB_USERNAME,
        password: process.env.PROD_DB_PASSWORD,
        database: process.env.PROD_DB_NAME,
        storage: "./database/PRFURNITURE.sqlite",
        dialect: "sqlite",
        logging: false,
    },
    production: {
        username: process.env.PROD_DB_USERNAME,
        password: process.env.PROD_DB_PASSWORD,
        database: process.env.PROD_DB_NAME,
        storage: "./database/PRFURNITURE.sqlite",
        dialect: "sqlite",
        logging: false,
    },
};
