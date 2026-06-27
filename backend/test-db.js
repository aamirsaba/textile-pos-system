const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_DATABASE || 'textile_pos',
  process.env.DB_USERNAME || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: false
  }
);

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully!');
    console.log('📊 Database:', process.env.DB_DATABASE || 'textile_pos');
    console.log('🔌 Host:', process.env.DB_HOST || 'localhost');
    console.log('👤 User:', process.env.DB_USERNAME || 'postgres');
    
    // Test query
    const result = await sequelize.query('SELECT NOW() as current_time');
    console.log('🕐 Server time:', result[0][0].current_time);
  } catch (error) {
    console.error('❌ Unable to connect:', error.message);
  }
}

testConnection();
