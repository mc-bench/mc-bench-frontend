import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import settings from '../config/settings.ts'

export const api: AxiosInstance = axios.create({
  baseURL: `${settings.apiUrl}/api`,
})

export const adminAPI: AxiosInstance = axios.create({
  baseURL: `${settings.adminApiUrl}/api`,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminAPI.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
