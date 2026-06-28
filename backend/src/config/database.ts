import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Not set ❌');

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    family: 4,
    // Explicitly set the application name
    application_name: 'textile-pos'
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