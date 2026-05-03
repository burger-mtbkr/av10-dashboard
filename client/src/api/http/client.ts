import axios from "axios";

export const apiClient = axios.create({
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});
