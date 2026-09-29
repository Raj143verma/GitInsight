import api from './api.js';

/**
 * Health service to query system operational status.
 */
export const healthService = {
  async getHealth() {
    const response = await api.get('/health');
    return response.data;
  },
};

export default healthService;
