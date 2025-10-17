import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const backendService = {
  async healthCheck() {
    const response = await axios.get(`${API_URL}/`);
    return response.data;
  },

  async getSeasons() {
    const response = await axios.get(`${API_URL}/api/seasons`);
    return response.data;
  },

  async getSchedule(year: number) {
    const response = await axios.get(`${API_URL}/api/schedule/${year}`);
    return response.data;
  },

  async getDrivers(year: number, round: number, sessionType: string) {
    const response = await axios.post(`${API_URL}/api/session/drivers`, null, {
      params: { year, round, session_type: sessionType }
    });
    return response.data;
  },

  async getTelemetry(year: number, round: number, sessionType: string, driver: string) {
    const response = await axios.post(`${API_URL}/api/telemetry`, null, {
      params: { year, round, session_type: sessionType, driver }
    });
    return response.data;
  },

  async compareTelemetry(year: number, round: number, sessionType: string, driver1: string, driver2: string) {
    const response = await axios.post(`${API_URL}/api/telemetry/compare`, null, {
      params: { year, round, session_type: sessionType, driver1, driver2 }
    });
    return response.data;
  },

  async getDelta(year: number, round: number, sessionType: string, driver1: string, driver2: string) {
    const response = await axios.post(`${API_URL}/api/telemetry/delta`, null, {
      params: { year, round, session_type: sessionType, driver1, driver2 }
    });
    return response.data;
  },

  async getCircuitTelemetry(year: number, round: number, sessionType: string, driver: string) {
    const response = await axios.post(`${API_URL}/api/telemetry/circuit`, null, {
      params: { year, round, session_type: sessionType, driver }
    });
    return response.data;
  },

  async getLapTimes(year: number, round: number, sessionType: string) {
    const response = await axios.post(`${API_URL}/api/session/laptimes`, null, {
      params: { year, round, session_type: sessionType }
    });
    return response.data;
  },

  async getTelemetryStats(year: number, round: number, sessionType: string, driver: string) {
    const response = await axios.post(`${API_URL}/api/telemetry/stats`, null, {
      params: { year, round, session_type: sessionType, driver }
    });
    return response.data;
  },

  async getRaceResults(year: number, round: number) {
    const response = await axios.get(`${API_URL}/api/results/${year}/${round}`);
    return response.data;
  },

  async getDriverStandings(year: number) {
    const response = await axios.get(`${API_URL}/api/standings/${year}/drivers`);
    return response.data;
  },

  async getRaceAnimation(year: number, round: number, sessionType: string, driver1: string, driver2: string) {
    const response = await axios.post(`${API_URL}/api/telemetry/race-animation`, null, {
      params: { year, round, session_type: sessionType, driver1, driver2 }
    });
    return response.data;
  },
};
