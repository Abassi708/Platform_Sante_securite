const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à MySQL');
  } catch (error) {
    console.error('❌ Erreur MySQL:', error);
  }
};

testConnection();
module.exports = sequelize;