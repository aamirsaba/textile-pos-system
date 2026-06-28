import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 DB_HOST:', process.env.DB_HOST || 'Not set');
console.log('🔍 DB_PORT:', process.env.DB_PORT || 'Not set');

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE || 'textile_pos',
  username: process.env.DB_USERNAME || 'textile_user',
  password: process.env.DB_PASSWORD || '',
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    family: 4
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export default sequelize;