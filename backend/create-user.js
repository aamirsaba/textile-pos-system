const bcrypt = require('bcryptjs');
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

async function createUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    console.log('Generated hash:', hashedPassword);
    
    // Delete existing admin user if exists
    await sequelize.query("DELETE FROM users WHERE username = 'admin'");
    
    // Create admin user
    await sequelize.query(`
      INSERT INTO users (id, username, password, full_name, role, is_active) 
      VALUES (gen_random_uuid(), 'admin', $1, 'Administrator', 'admin', true)
    `, {
      bind: [hashedPassword]
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    // Create cashier user
    const salt2 = await bcrypt.genSalt(10);
    const hashedPassword2 = await bcrypt.hash('cashier123', salt2);
    
    await sequelize.query("DELETE FROM users WHERE username = 'cashier'");
    await sequelize.query(`
      INSERT INTO users (id, username, password, full_name, role, is_active) 
      VALUES (gen_random_uuid(), 'cashier', $1, 'Cashier User', 'cashier', true)
    `, {
      bind: [hashedPassword2]
    });
    
    console.log('✅ Cashier user created successfully!');
    console.log('Username: cashier');
    console.log('Password: cashier123');
    
    // Verify users
    const [users] = await sequelize.query("SELECT username, full_name, role FROM users");
    console.log('\n📋 Users in database:');
    console.table(users);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createUser();
