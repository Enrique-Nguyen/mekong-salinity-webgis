/**
 * Admin API functions for user management, upload management, and system statistics
 */

import api from './api'

// Types for admin API responses
export interface UserResponse {
  id: string
  username: string
  email: string
  role: string
  created_at: string
  is_active: boolean
}

export interface UserListResponse {
  users: UserResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface UserUpdateRequest {
  role?: string
  is_active?: boolean
}

export interface UploadAdminResponse {
  id: string
  user_id: string
  username: string
  file_name: string
  file_type: string
  uploaded_at: string
  status: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
}

export interface UploadListResponse {
  uploads: UploadAdminResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AdminStatsResponse {
  total_users: number
  active_users: number
  admin_users: number
  total_uploads: number
  pending_uploads: number
  completed_uploads: number
  failed_uploads: number
  total_observations: number
  min_salinity: number | null
  max_salinity: number | null
  earliest_date: string | null
  latest_date: string | null
}

export interface ColumnInfo {
  name: string
  data_type: string
  required: boolean
  description: string
  aliases: string[]
  example: string
  validation?: string
}

export interface FileFormatGuideResponse {
  accepted_formats: string[]
  max_file_size_mb: number
  encoding: string
  required_columns: ColumnInfo[]
  optional_columns: ColumnInfo[]
  sample_csv_full: string
  sample_csv_minimal: string
  notes: string[]
}

// ============== USER MANAGEMENT ==============

export async function getUsers(params: {
  page?: number
  page_size?: number
  search?: string
  role?: string
  is_active?: boolean
}): Promise<UserListResponse> {
  const response = await api.get<UserListResponse>('/api/admin/users', { params })
  return response.data
}

export async function getUser(userId: string): Promise<UserResponse> {
  const response = await api.get<UserResponse>(`/api/admin/users/${userId}`)
  return response.data
}

export async function updateUser(userId: string, data: UserUpdateRequest): Promise<UserResponse> {
  const response = await api.put<UserResponse>(`/api/admin/users/${userId}`, data)
  return response.data
}

export async function deleteUser(userId: string): Promise<{ message: string; user_id: string }> {
  const response = await api.delete(`/api/admin/users/${userId}`)
  return response.data
}

// ============== UPLOAD MANAGEMENT ==============

export async function getUploads(params: {
  page?: number
  page_size?: number
  status?: string
  user_id?: string
}): Promise<UploadListResponse> {
  const response = await api.get<UploadListResponse>('/api/admin/uploads', { params })
  return response.data
}

export async function deleteUpload(uploadId: string): Promise<{
  message: string
  upload_id: string
  deleted_observations: number
}> {
  const response = await api.delete(`/api/admin/uploads/${uploadId}`)
  return response.data
}

// ============== OBSERVATION MANAGEMENT ==============

export async function deleteObservation(observationId: string): Promise<{
  message: string
  observation_id: string
}> {
  const response = await api.delete(`/api/admin/observations/${observationId}`)
  return response.data
}

export async function deleteObservationsByUpload(uploadId: string): Promise<{
  message: string
  upload_id: string
  deleted_count: number
}> {
  const response = await api.delete(`/api/admin/observations/by-upload/${uploadId}`)
  return response.data
}

// ============== ADMIN STATISTICS ==============

export async function getAdminStats(): Promise<AdminStatsResponse> {
  const response = await api.get<AdminStatsResponse>('/api/admin/stats')
  return response.data
}

// ============== FILE FORMAT GUIDE ==============

export async function getFileFormatGuide(): Promise<FileFormatGuideResponse> {
  const response = await api.get<FileFormatGuideResponse>('/api/admin/file-format-guide')
  return response.data
}
