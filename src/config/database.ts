import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Validate database environment variables
const validateDbConfig = () => {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`WARNING: Missing database environment variables: ${missing.join(', ')}`);
    console.warn('Using default values which may not work in production!');
  }
};

validateDbConfig();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mydb',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  timestamps: true,
  underscored: true,  // Changed to true for consistency with snake_case column names
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Safe log that doesn't expose credentials
console.log('Database configuration:', {
  host: dbConfig.host,
  username: dbConfig.username,
  database: dbConfig.database,
  port: dbConfig.port,
  password: '****', // Hide password in logs
});

// Connection pool configuration
const poolConfig = {
  max: 10,                // Maximum number of connection instances
  min: 0,                 // Minimum number of connection instances
  acquire: 30000,         // Max time in ms to get a connection before throwing error
  idle: 10000,            // Max time in ms that a connection can be idle before being released
  evict: 1000 * 60 * 60,  // Remove connections older than 1 hour
};

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: dbConfig.host,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: {
    timestamps: dbConfig.timestamps,
    underscored: dbConfig.underscored,
    createdAt: dbConfig.createdAt,
    updatedAt: dbConfig.updatedAt,
  },
  pool: poolConfig,
  // SSL configuration for production
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false // Only set to false if you're using a self-signed certificate
    }
  } : {}
});

export const initDatabase = async () => {
  let retries = 5;
  while (retries) {
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');

      // Sync models - using { alter: false } to prevent table modifications
      // This will only check the connection but not modify table schemas
      await sequelize.sync({ alter: false });
      console.log('Database models synchronized successfully.');
      return;
    } catch (error) {
      console.error(`Unable to connect to the database (attempts left: ${retries}):`, error);
      retries -= 1;
      if (retries === 0) {
        console.error('Maximum database connection retry attempts reached. Exiting.');
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = 1000 * Math.pow(2, 5 - retries);
      console.log(`Retrying database connection in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default sequelize;
