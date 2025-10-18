import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const backendService = {
  async getSchedule(year: number) {
    const response = await axios.get(`${API_URL}/api/schedule`, {
      params: { year }
    });
    return response.data;
  },

  async getDrivers(year: number, round: number, sessionType: string) {
    const response = await axios.get(`${API_URL}/api/drivers`, {
      params: { year, round, session: sessionType }
    });
    return response.data;
  },

  async getTelemetry(year: number, round: number, sessionType: string, driver: string) {
    const response = await axios.get(`${API_URL}/api/telemetry`, {
      params: { year, round, session: sessionType, driver }
    });
    return response.data;
  },

  async compareTelemetry(year: number, round: number, sessionType: string, driver1: string, driver2: string) {
    const response = await axios.get(`${API_URL}/api/compare-telemetry`, {
      params: { year, round, session: sessionType, driver1, driver2 }
    });
    return response.data;
  },

  async getDelta(year: number, round: number, sessionType: string, driver1: string, driver2: string) {
    const response = await axios.get(`${API_URL}/api/delta`, {
      params: { year, round, session: sessionType, driver1, driver2 }
    });
    return response.data;
  },

  async getCircuit(year: number, round: number, sessionType: string, driver: string) {
    const response = await axios.get(`${API_URL}/api/circuit`, {
      params: { year, round, session: sessionType, driver }
    });
    return response.data;
  },

  async getLapTimes(year: number, round: number, sessionType: string) {
    const response = await axios.get(`${API_URL}/api/lap-times`, {
      params: { year, round, session: sessionType }
    });
    return response.data;
  },

  async getStats(year: number, round: number, sessionType: string) {
    const response = await axios.get(`${API_URL}/api/stats`, {
      params: { year, round, session: sessionType }
    });
    return response.data;
  },

  async getResults(year: number, round: number) {
    const response = await axios.get(`${API_URL}/api/results`, {
      params: { year, round }
    });
    return response.data;
  },

  async getAnimation(year: number, round: number, sessionType: string, driver1: string, driver2: string) {
    const response = await axios.get(`${API_URL}/api/animation`, {
      params: { year, round, session: sessionType, driver1, driver2 }
    });
    return response.data;
  },
};

export default backendService;