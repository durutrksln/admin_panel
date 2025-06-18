require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL bağlantısı
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Veritabanı tablolarını oluştur
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    application_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    application_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by_user_id INTEGER REFERENCES users(user_id),
    applicant_name VARCHAR(100) NOT NULL,
    applicant_id_document_type VARCHAR(50),
    property_address TEXT NOT NULL,
    installation_number VARCHAR(50),
    dask_policy_number VARCHAR(50),
    is_tenant BOOLEAN DEFAULT false,
    landlord_full_name VARCHAR(100),
    landlord_id_type VARCHAR(50),
    landlord_id_number VARCHAR(50),
    landlord_company_name VARCHAR(100),
    landlord_representative_name VARCHAR(100),
    power_of_attorney_provided BOOLEAN DEFAULT false,
    signature_circular_provided BOOLEAN DEFAULT false,
    termination_iban VARCHAR(50),
    ownership_document_type VARCHAR(50),
    notes TEXT,
    old_bill_file_data BYTEA,
    proxy_document_data BYTEA,
    dask_policy_file_data BYTEA,
    ownership_document_data BYTEA
  );

  CREATE TABLE IF NOT EXISTS evacuation_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applicant_name VARCHAR(100) NOT NULL,
    property_address TEXT NOT NULL,
    installation_number VARCHAR(50),
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS connection_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    full_name VARCHAR(100) NOT NULL,
    tckn VARCHAR(11) NOT NULL,
    requires_license BOOLEAN NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        userId: user.user_id,
        email: user.email,
        role: user.role 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    res.json({ 
      token,
      user: {
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, fullName } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING user_id',
      [email, passwordHash, fullName]
    );
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') { // unique violation
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Get applications endpoint
app.get('/api/applications', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching applications...');
    const result = await pool.query(`
      SELECT 
        a.*,
        u.email as processed_by_email,
        u.full_name as processed_by_name
      FROM applications a
      LEFT JOIN users u ON a.processed_by_user_id = u.user_id
      WHERE a.application_type = 'new_installation'
      ORDER BY a.submitted_at DESC
    `);
    console.log('Query result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error in /api/applications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get application details endpoint
app.get('/api/applications/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        u.email as processed_by_email,
        u.full_name as processed_by_name
      FROM applications a
      LEFT JOIN users u ON a.processed_by_user_id = u.user_id
      WHERE a.application_id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get file endpoint
app.get('/api/applications/:id/files/:fileType', authenticateToken, async (req, res) => {
  try {
    const { id, fileType } = req.params;
    let fileColumn;
    
    switch (fileType) {
      case 'old_bill':
        fileColumn = 'old_bill_file_data';
        break;
      case 'proxy':
        fileColumn = 'proxy_document_data';
        break;
      case 'dask':
        fileColumn = 'dask_policy_file_data';
        break;
      case 'ownership':
        fileColumn = 'ownership_document_data';
        break;
      default:
        return res.status(400).json({ message: 'Invalid file type' });
    }

    const result = await pool.query(
      `SELECT ${fileColumn} FROM applications WHERE application_id = $1`,
      [id]
    );

    if (!result.rows[0] || !result.rows[0][fileColumn]) {
      return res.status(404).json({ message: 'File not found' });
    }

    const fileData = result.rows[0][fileColumn];
    res.setHeader('Content-Type', 'application/pdf');
    res.send(fileData);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected route örneği
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Protected route accessed successfully',
    user: req.user
  });
});

// JWT token doğrulama middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // if there's no token, return unauthorized

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.sendStatus(403); // if token is not valid, return forbidden
    }
    req.user = user;
    next(); // proceed to the next middleware/route handler
  });
}

// Test endpoint to check database structure
app.get('/api/test-db', async (req, res) => {
  try {
    // Test database connection
    const [timeResult] = await pool.query('SELECT NOW()');
    console.log('Database connection test:', timeResult);

    // Get table structure
    const [columns] = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'applications'
    `);
    console.log('Table structure:', columns);

    // Get all applications
    const [applications] = await pool.query('SELECT * FROM applications LIMIT 1');
    console.log('Sample application:', applications);

    res.json({
      connectionTest: timeResult,
      tableStructure: columns,
      sampleApplication: applications
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get evacuation applications endpoint
app.get('/api/evacuation-applications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        user_id,
        user_type,
        full_name,
        tckn,
        address,
        phone_number,
        email,
        evacuation_reason,
        evacuation_date,
        tesisat_numarasi,
        dask_police_numarasi,
        zorunlu_deprem_sigortasi,
        iban,
        landlord_type,
        mulk_sahibi_ad_soyad,
        vergi_numarasi,
        tuzel_kisi_ad,
        tuzel_kisi_soyad,
        unvan,
        requires_license,
        status,
        created_at,
        updated_at,
        nufus_cuzdani_data,
        mulkiyet_belgesi_data
      FROM evacuation_applications 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching evacuation applications:', error);
    res.status(500).json({ message: 'Tahliye başvuruları getirilirken bir hata oluştu.' });
  }
});

// Get evacuation application details endpoint
app.get('/api/evacuation-applications/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM evacuation_applications
      WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching evacuation application details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update evacuation application status endpoint
app.put('/api/evacuation-applications/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  console.log('Updating status for application:', { id, status }); // Debug log

  // Geçerli durumları kontrol et
  const validStatuses = ['pending', 'in_review', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Geçersiz durum değeri.' });
  }

  try {
    // Önce başvurunun var olup olmadığını kontrol et
    const checkResult = await pool.query(
      'SELECT * FROM evacuation_applications WHERE id = $1',
      [id]
    );

    console.log('Check result:', checkResult.rows); // Debug log

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Başvuru bulunamadı.' });
    }

    // Durumu güncelle
    const result = await pool.query(`
      UPDATE evacuation_applications 
      SET status = $1, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING 
        id,
        user_id,
        user_type,
        full_name,
        tckn,
        address,
        phone_number,
        email,
        evacuation_reason,
        evacuation_date,
        tesisat_numarasi,
        dask_police_numarasi,
        zorunlu_deprem_sigortasi,
        iban,
        landlord_type,
        mulk_sahibi_ad_soyad,
        vergi_numarasi,
        tuzel_kisi_ad,
        tuzel_kisi_soyad,
        unvan,
        requires_license,
        status,
        created_at,
        updated_at
    `, [status, id]);

    console.log('Update result:', result.rows); // Debug log

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating evacuation application status:', error);
    res.status(500).json({ message: 'Durum güncellenirken bir hata oluştu.' });
  }
});

// Update application status
app.put('/api/applications/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  console.log('Updating application status:', { id, status }); // Debug log

  // Validate status
  const validStatuses = ['pending', 'in_review', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Geçersiz durum değeri' });
  }

  try {
    // Check if application exists
    const applicationResult = await pool.query(
      'SELECT * FROM applications WHERE application_id = $1',
      [id]
    );

    console.log('Found application:', applicationResult.rows); // Debug log

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({ message: 'Başvuru bulunamadı' });
    }

    // Update status
    const updateResult = await pool.query(
      'UPDATE applications SET status = $1, processed_at = NOW() WHERE application_id = $2 RETURNING *',
      [status, id]
    );

    console.log('Update result:', updateResult.rows); // Debug log

    if (!updateResult.rows || updateResult.rows.length === 0) {
      throw new Error('Update did not affect any rows');
    }

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error updating application status:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      where: error.where
    });
    res.status(500).json({ 
      message: 'Durum güncellenirken bir hata oluştu',
      error: error.message,
      details: error.detail
    });
  }
});

// GET endpoint to fetch details for a single connection application
app.get('/api/connection-applications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching details for connection application ID: ${id}`);

    const result = await pool.query(
      `SELECT 
        ca.* 
      FROM connection_applications ca
      WHERE ca.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`Connection application with ID ${id} not found.`);
      return res.status(404).json({ message: 'Connection application not found.' });
    }

    console.log('Connection application details fetched:', result.rows[0]);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching connection application details:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Add new endpoint to get connection application files
app.get('/api/connection-applications/:id/files/:fileType', authenticateToken, async (req, res) => {
  try {
    const { id, fileType } = req.params;
    let fileColumn;
    
    switch (fileType) {
      case 'id_document':
        fileColumn = 'id_document_data';
        break;
      case 'address_document':
        fileColumn = 'address_document_data';
        break;
      case 'ownership_document':
        fileColumn = 'ownership_document_data';
        break;
      // Add other file types here as needed based on the provided columns
      case 'deed':
          fileColumn = 'deed_file_data';
          break;
      case 'electrical_project':
          fileColumn = 'electrical_project_data';
          break;
      case 'building_permit':
          fileColumn = 'building_permit_data';
          break;
      case 'permit_document':
          fileColumn = 'permit_document_data';
          break;
       case 'law_6292':
          fileColumn = 'law_6292_data';
          break;
       case 'law_3194':
          fileColumn = 'law_3194_data';
          break;
      default:
        return res.status(400).json({ message: 'Invalid file type' });
    }

    // Check if the selected column exists in the table (optional but good practice)
    const columnCheck = await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'connection_applications' AND column_name = $1`, [fileColumn]);
    if (columnCheck.rows.length === 0) {
        console.error(`Column ${fileColumn} does not exist in connection_applications table.`);
        return res.status(400).json({ message: 'Invalid file type' });
    }


    const result = await pool.query(
      `SELECT ${fileColumn} FROM connection_applications WHERE id = $1`,
      [id]
    );

    const fileData = result.rows[0]?.[fileColumn];

    if (!fileData) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Assuming files are PDFs
    res.setHeader('Content-Type', 'application/pdf');
    res.send(fileData);
  } catch (error) {
    console.error('Error fetching connection application file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get connection applications endpoint
app.get('/api/connection-applications', authenticateToken, async (req, res) => {
   try {
    console.log('Fetching connection applications...');
    // Removed join with users table as processed_by_user_id does not exist in connection_applications
    const result = await pool.query(`
      SELECT 
        ca.* 
      FROM connection_applications ca
      ORDER BY ca.created_at DESC
    `);
    console.log('Connection applications query result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error in /api/connection-applications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT endpoint to update connection application status
app.put('/api/connection-applications/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  // Removed processedByUserId as the column does not exist in connection_applications
  // const processedByUserId = req.user.userId; // Get user ID from authenticated token

  // Validate status
  const validStatuses = ['pending', 'in_review', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    console.log(`Updating status for connection application ${id} to ${status}`); // Updated log
    const result = await pool.query(
      `UPDATE connection_applications SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Connection application not found.' });
    }

    console.log('Status update successful:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating connection application status:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Update user role to admin
app.put('/api/users/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Update user role to admin
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING *',
      ['admin', userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    console.log('User role updated:', result.rows[0]);
    res.json({ message: 'Kullanıcı rolü başarıyla güncellendi', user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Kullanıcı rolü güncellenirken bir hata oluştu' });
  }
});

// Temporary endpoint to update user role (remove after use)
app.get('/update-role', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING *',
      ['admin', 4]
    );
    res.json({ message: 'Role updated', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get evacuation application files endpoint
app.get('/api/evacuation-applications/:id/files/:fileType', authenticateToken, async (req, res) => {
  try {
    const { id, fileType } = req.params;
    let fileColumn;
    
    switch (fileType) {
      case 'nufus_cuzdani':
        fileColumn = 'nufus_cuzdani_data';
        break;
      case 'mulkiyet_belgesi':
        fileColumn = 'mulkiyet_belgesi_data';
        break;
      default:
        return res.status(400).json({ message: 'Invalid file type' });
    }

    const result = await pool.query(
      `SELECT ${fileColumn} FROM evacuation_applications WHERE id = $1`,
      [id]
    );

    if (!result.rows[0] || !result.rows[0][fileColumn]) {
      return res.status(404).json({ message: 'File not found' });
    }

    const fileData = result.rows[0][fileColumn];
    res.setHeader('Content-Type', 'application/pdf');
    res.send(fileData);
  } catch (error) {
    console.error('Error fetching evacuation application file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 