const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { Sequelize, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Database connection
const sequelize = new Sequelize(
  process.env.DB_DATABASE || 'textile_pos',
  process.env.DB_USERNAME || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// ============================================
// MIDDLEWARE - CRITICAL: Must be before routes
// ============================================
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// MODELS
// ============================================
const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  code: { type: DataTypes.STRING(50), allowNull: true },
  category: { type: DataTypes.STRING(100), allowNull: true },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  roll_length: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 22.86 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'products', timestamps: true });

const Sale = sequelize.define('Sale', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoiceNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  customerId: { type: DataTypes.STRING(50), allowNull: true },
  customerName: { type: DataTypes.STRING(255), allowNull: true },
  items: { type: DataTypes.JSONB, allowNull: false },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paymentMethod: { type: DataTypes.STRING(20), allowNull: false },
  saleDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'sales', timestamps: true });

// ============================================
// AUTH ROUTES
// ============================================

// POST /api/v1/auth/login
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    const [users] = await sequelize.query(query, {
      bind: [username]
    });
    
    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role
        }
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
});

// GET /api/v1/auth/me
app.get('/api/v1/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const query = 'SELECT id, username, full_name, role FROM users WHERE id = $1';
    const [users] = await sequelize.query(query, {
      bind: [decoded.userId]
    });
    
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: users[0] });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// GET /api/v1/auth/users
app.get('/api/v1/auth/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }
    
    const query = 'SELECT id, username, full_name, role, is_active FROM users ';
    const [users] = await sequelize.query(query);
    res.json({ success: true, data: users, count: users.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
});

// ============================================
// PRODUCTS API
// ============================================
app.get('/api/v1/products', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
  }
});

app.post('/api/v1/products', async (req, res) => {
  try {
    const product = await Product.create({
      id: uuidv4(),
      name: req.body.name,
      category: req.body.category || null,
      price: req.body.price || 0,
cost: req.body.cost || 0,
roll_length: req.body.roll_length || 22.86,
      isActive: true
    });
    res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating product', error: error.message });
  }
});

// ============================================
// INVENTORY API
// ============================================
app.get('/api/v1/inventory', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id as product_id, p.name as product_name, p.category, p.price,
        COUNT(r.id) as total_rolls,
        SUM(CASE WHEN r.is_full_roll = true AND r.remaining_length > 0 AND r.is_active = true THEN 1 ELSE 0 END) as full_rolls,
        SUM(CASE WHEN r.is_full_roll = false AND r.remaining_length > 0 AND r.is_active = true THEN 1 ELSE 0 END) as partial_rolls,
        SUM(CASE WHEN r.is_active = true THEN r.remaining_length ELSE 0 END) as total_meters
      FROM products p
      LEFT JOIN inventory_rolls r ON p.id = r.product_id
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.category, p.price
      ORDER BY p.name
    `;
    const [results] = await sequelize.query(query);
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching inventory', error: error.message });
  }
});

app.post('/api/v1/inventory', async (req, res) => {
  try {
    const { productId, totalLength, purchasePrice, purchaseDate } = req.body;
    const productQuery = 'SELECT name, "purchasePrice" FROM products WHERE id = $1 AND "isActive" = true';
    const [productResult] = await sequelize.query(productQuery, { bind: [productId] });
    
    if (!productResult || productResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const product = productResult[0];
    const countQuery = 'SELECT COUNT(*) as count FROM inventory_rolls WHERE product_id = $1';
    const [countResult] = await sequelize.query(countQuery, { bind: [productId] });
    const count = parseInt(countResult[0].count) + 1;
    const rollNumber = 'ROLL-' + product.name.substring(0, 3).toUpperCase() + '-' + String(count).padStart(3, '0');
    
    const insertQuery = `
      INSERT INTO inventory_rolls (
        id, product_id, roll_number, total_length, remaining_length, 
        is_full_roll, purchase_price, purchase_date, is_active,
        createdat, updatedat
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW()
      ) RETURNING *
    `;
    const [result] = await sequelize.query(insertQuery, {
      bind: [productId, rollNumber, totalLength, totalLength, true, purchasePrice || product.purchasePrice || 0, purchaseDate || new Date()]
    });
    res.status(201).json({ success: true, data: result[0], message: 'Inventory roll added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding inventory roll', error: error.message });
  }
});

// ============================================
// SALES API
// ============================================
app.post('/api/v1/sales', async (req, res) => {
  try {
    const { customerId, customerName, items, totalAmount, paymentMethod } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in sale' });
    }
    const invoiceNumber = 'INV-' + Date.now().toString().slice(-8);
    const sale = await Sale.create({
      id: uuidv4(),
      invoiceNumber: invoiceNumber,
      customerId: customerId || 'walk-in',
      customerName: customerName || 'Walk-in Customer',
      items: items,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod || 'cash',
      saleDate: new Date()
    });
    res.status(201).json({ success: true, data: sale, message: 'Sale recorded successfully', invoiceNumber: invoiceNumber });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving sale', error: error.message });
  }
});

app.get('/api/v1/sales', async (req, res) => {
  try {
    const sales = await Sale.findAll({ order: [['saleDate', 'DESC']] });
    res.json({ success: true, data: sales, count: sales.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching sales', error: error.message });
  }
});

app.get('/api/v1/sales/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sales = await Sale.findAll({
      where: { saleDate: { [Sequelize.Op.gte]: today, [Sequelize.Op.lt]: tomorrow } },
      order: [['saleDate', 'DESC']]
    });
    const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    res.json({ success: true, data: sales, count: sales.length, total: totalAmount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching today\'s sales', error: error.message });
  }
});

// ============================================

// ============================================
// SUPPLIER API
// ============================================

// GET all suppliers
app.get('/api/v1/suppliers', async (req, res) => {
  try {
    const query = 'SELECT * FROM suppliers WHERE is_active = true ORDER BY name';
    const [suppliers] = await sequelize.query(query);
    res.json({ success: true, data: suppliers, count: suppliers.length });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, message: 'Error fetching suppliers', error: error.message });
  }
});

// GET supplier by ID
app.get('/api/v1/suppliers/:id', async (req, res) => {
  try {
    const query = 'SELECT * FROM suppliers WHERE id = $1';
    const [suppliers] = await sequelize.query(query, { bind: [req.params.id] });
    if (!suppliers || suppliers.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.json({ success: true, data: suppliers[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching supplier', error: error.message });
  }
});

// POST create supplier
app.post('/api/v1/suppliers', async (req, res) => {
  try {
    const { name, phone, email, address, contact_person, opening_balance } = req.body;
    
    const query = `
      INSERT INTO suppliers (id, name, phone, email, address, contact_person, current_balance) 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *
    `;
    const [result] = await sequelize.query(query, {
      bind: [name, phone || null, email || null, address || null, contact_person || null, opening_balance || 0]
    });
    
    res.status(201).json({ success: true, data: result[0], message: 'Supplier created successfully' });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ success: false, message: 'Error creating supplier', error: error.message });
  }
});

// PUT update supplier
app.put('/api/v1/suppliers/:id', async (req, res) => {
  try {
    const { name, phone, email, address, contact_person, is_active } = req.body;
    
    const query = `
      UPDATE suppliers 
      SET name = $1, phone = $2, email = $3, address = $4, contact_person = $5, is_active = $6, "updatedAt" = NOW()
      WHERE id = $7 RETURNING *
    `;
    const [result] = await sequelize.query(query, {
      bind: [name, phone || null, email || null, address || null, contact_person || null, is_active !== undefined ? is_active : true, req.params.id]
    });
    
    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    res.json({ success: true, data: result[0], message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ success: false, message: 'Error updating supplier', error: error.message });
  }
});

// DELETE supplier
app.delete('/api/v1/suppliers/:id', async (req, res) => {
  try {
    const query = 'UPDATE suppliers SET is_active = false WHERE id = $1 RETURNING *';
    const [result] = await sequelize.query(query, { bind: [req.params.id] });
    
    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ success: false, message: 'Error deleting supplier', error: error.message });
  }
});

// POST supplier payment
app.post('/api/v1/suppliers/:id/payment', async (req, res) => {
  try {
    const { amount, payment_method, remarks } = req.body;
    const supplierId = req.params.id;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }
    
    const updateQuery = `
      UPDATE suppliers 
      SET current_balance = current_balance - $1, total_payments = total_payments + $1, "updatedAt" = NOW()
      WHERE id = $2 RETURNING *
    `;
    const [result] = await sequelize.query(updateQuery, {
      bind: [amount, supplierId]
    });
    
    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    res.json({
      success: true,
      data: result[0],
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: 'Error recording payment', error: error.message });
  }
});


// ============================================
// REPORTS API
// ============================================

// GET /api/v1/reports/daily-sales - Daily Sales Report
app.get('/api/v1/reports/daily-sales', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        "invoiceNumber" as invoice,
        "customerName" as customer,
        "totalAmount" as amount,
        "paymentMethod" as payment,
        "saleDate" as date
      FROM sales 
      WHERE DATE("saleDate") = $1
      ORDER BY "saleDate" DESC
    `;
    
    const [sales] = await sequelize.query(query, {
      bind: [date]
    });
    
    const total = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    
    res.json({
      success: true,
      data: sales,
      summary: {
        date: date,
        total_sales: sales.length,
        total_amount: total,
        average_sale: sales.length > 0 ? total / sales.length : 0
      }
    });
  } catch (error) {
    console.error('Daily sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating daily sales report',
      error: error.message
    });
  }
});

// GET /api/v1/reports/monthly-sales - Monthly Sales Report
app.get('/api/v1/reports/monthly-sales', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    
    const query = `
      SELECT 
        DATE("saleDate") as date,
        COUNT(*) as transactions,
        SUM("totalAmount") as total,
        SUM(CASE WHEN "paymentMethod" = 'cash' THEN "totalAmount" ELSE 0 END) as cash_sales,
        SUM(CASE WHEN "paymentMethod" = 'credit' THEN "totalAmount" ELSE 0 END) as credit_sales
      FROM sales 
      WHERE DATE_TRUNC('month', "saleDate") = $1::date
      GROUP BY DATE("saleDate")
      ORDER BY date
    `;
    
    const [results] = await sequelize.query(query, {
      bind: [`${month}-01`]
    });
    
    const summary = {
      month: month,
      total_transactions: results.reduce((sum, r) => sum + parseInt(r.transactions), 0),
      total_sales: results.reduce((sum, r) => sum + parseFloat(r.total), 0),
      cash_sales: results.reduce((sum, r) => sum + parseFloat(r.cash_sales), 0),
      credit_sales: results.reduce((sum, r) => sum + parseFloat(r.credit_sales), 0),
      days: results.length
    };
    
    res.json({
      success: true,
      data: results,
      summary: summary
    });
  } catch (error) {
    console.error('Monthly sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating monthly sales report',
      error: error.message
    });
  }
});

// GET /api/v1/reports/best-selling - Best Selling Products
app.get('/api/v1/reports/best-selling', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 30;
    
    const query = `
      SELECT 
        item->>'name' as product,
        item->>'unit' as unit,
        COUNT(*) as times_sold,
        SUM((item->>'meters')::numeric) as total_meters,
        SUM((item->>'totalPrice')::numeric) as total_revenue,
        ROUND(AVG((item->>'totalPrice')::numeric), 2) as average_price
      FROM sales,
        jsonb_array_elements(items) as item
      WHERE "saleDate" >= NOW() - INTERVAL '${days} days'
      GROUP BY item->>'name', item->>'unit'
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `;
    
    const [results] = await sequelize.query(query);
    
    res.json({
      success: true,
      data: results,
      summary: {
        days: days,
        total_products: results.length
      }
    });
  } catch (error) {
    console.error('Best selling error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating best selling report',
      error: error.message
    });
  }
});

// GET /api/v1/reports/customer-outstanding - Customer Outstanding Report
app.get('/api/v1/reports/customer-outstanding', async (req, res) => {
  try {
    const query = `
      SELECT 
        "customerName" as customer,
        COUNT(*) as transactions,
        SUM("totalAmount") as total_spent,
        SUM(CASE WHEN "paymentMethod" = 'credit' THEN "totalAmount" ELSE 0 END) as outstanding
      FROM sales 
      WHERE "customerName" != 'Walk-in Customer'
      GROUP BY "customerName"
      HAVING SUM(CASE WHEN "paymentMethod" = 'credit' THEN "totalAmount" ELSE 0 END) > 0
      ORDER BY outstanding DESC
    `;
    
    const [results] = await sequelize.query(query);
    
    const totalOutstanding = results.reduce((sum, r) => sum + parseFloat(r.outstanding), 0);
    
    res.json({
      success: true,
      data: results,
      summary: {
        total_customers: results.length,
        total_outstanding: totalOutstanding
      }
    });
  } catch (error) {
    console.error('Customer outstanding error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating customer outstanding report',
      error: error.message
    });
  }
});

// GET /api/v1/reports/cash-collection - Cash Collection Report
app.get('/api/v1/reports/cash-collection', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    const query = `
      SELECT 
        DATE("saleDate") as date,
        COUNT(*) as transactions,
        SUM("totalAmount") as total_collected
      FROM sales 
      WHERE "paymentMethod" = 'cash'
        AND "saleDate" >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE("saleDate")
      ORDER BY date DESC
    `;
    
    const [results] = await sequelize.query(query);
    
    const total = results.reduce((sum, r) => sum + parseFloat(r.total_collected), 0);
    
    res.json({
      success: true,
      data: results,
      summary: {
        days: days,
        total_transactions: results.reduce((sum, r) => sum + parseInt(r.transactions), 0),
        total_collected: total
      }
    });
  } catch (error) {
    console.error('Cash collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating cash collection report',
      error: error.message
    });
  }
});

// GET /api/v1/reports/stock-movement - Stock Movement Report
app.get('/api/v1/reports/stock-movement', async (req, res) => {
  try {
    const productId = req.query.productId;
    
    let query = `
      SELECT 
        p.name as product,
        r.roll_number,
        r.total_length,
        r.remaining_length,
        r.is_full_roll,
        r.purchase_date,
        r.createdat as added_date
      FROM inventory_rolls r
      JOIN products p ON r.product_id = p.id
      WHERE r.is_active = true
    `;
    
    if (productId) {
      query += ` AND r.product_id = '${productId}'`;
    }
    
    query += ` ORDER BY r.createdat DESC`;
    
    const [results] = await sequelize.query(query);
    
    const totalStock = results.reduce((sum, r) => sum + parseFloat(r.remaining_length), 0);
    const fullRolls = results.filter(r => r.is_full_roll).length;
    const partialRolls = results.filter(r => !r.is_full_roll && parseFloat(r.remaining_length) > 0).length;
    
    res.json({
      success: true,
      data: results,
      summary: {
        total_rolls: results.length,
        full_rolls: fullRolls,
        partial_rolls: partialRolls,
        total_meters: totalStock
      }
    });
  } catch (error) {
    console.error('Stock movement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating stock movement report',
      error: error.message
    });
  }
});

// GET /api/v1/reports/export-excel - Export Report as Excel
app.get('/api/v1/reports/export-excel', async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    let data = [];
    let reportName = '';
    
    switch(type) {
      case 'daily-sales':
        const dailyResult = await sequelize.query(`
          SELECT 
            "invoiceNumber", "customerName", "totalAmount", 
            "paymentMethod", "saleDate"
          FROM sales 
          WHERE DATE("saleDate") = $1
          ORDER BY "saleDate" DESC
        `, { bind: [startDate || new Date().toISOString().split('T')[0]] });
        data = dailyResult[0];
        reportName = 'Daily_Sales_Report';
        break;
        
      case 'monthly-sales':
        const monthlyResult = await sequelize.query(`
          SELECT 
            DATE("saleDate") as date,
            COUNT(*) as transactions,
            SUM("totalAmount") as total_sales
          FROM sales 
          WHERE DATE_TRUNC('month', "saleDate") = $1::date
          GROUP BY DATE("saleDate")
          ORDER BY date
        `, { bind: [startDate || new Date().toISOString().slice(0, 7) + '-01'] });
        data = monthlyResult[0];
        reportName = 'Monthly_Sales_Report';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }
    
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);
      headers.forEach((h, i) => {
        worksheet.getCell(1, i + 1).font = { bold: true };
      });
      
      data.forEach(row => {
        worksheet.addRow(Object.values(row));
      });
    }
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${reportName}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting report',
      error: error.message
    });
  }
});

// HEALTH CHECK
// ============================================
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', message: 'Textile POS Backend is running', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Textile POS API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/v1/health',
      products: '/api/v1/products',
      inventory: '/api/v1/inventory',
      sales: '/api/v1/sales',
      'today-sales': '/api/v1/sales/today',
      'auth-login': '/api/v1/auth/login',
      api: '/api/v1'
    }
  });
});

// ============================================
// START SERVER
// ============================================
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    console.log('✅ Database ready');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
      console.log(`📍 Products API: http://localhost:${PORT}/api/v1/products`);
      console.log(`📍 Inventory API: http://localhost:${PORT}/api/v1/inventory`);
      console.log(`📍 Sales API: http://localhost:${PORT}/api/v1/sales`);
      console.log(`📍 Auth Login: http://localhost:${PORT}/api/v1/auth/login`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();




