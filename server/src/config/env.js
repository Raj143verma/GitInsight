import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gitinsight',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  githubToken: process.env.GITHUB_TOKEN || '',
  githubApiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
};
