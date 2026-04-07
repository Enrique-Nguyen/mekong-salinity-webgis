'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getUploads,
  deleteUpload,
  deleteObservationsByUpload,
  UploadAdminResponse,
  UploadListResponse,
} from '@/lib/admin-api'

export default function UploadManagementPage() {
  const [uploads, setUploads] = useState<UploadAdminResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  
  // Modal states
  const [deletingUpload, setDeletingUpload] = useState<UploadAdminResponse | null>(null)
  const [clearingUpload, setClearingUpload] = useState<UploadAdminResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUploads = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: {
        page: number
        page_size: number
        status?: string
      } = {
        page,
        page_size: pageSize,
      }
      if (statusFilter) params.status = statusFilter

      const data: UploadListResponse = await getUploads(params)
      setUploads(data.uploads)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch (err) {
      setError('Không thể tải danh sách uploads')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, statusFilter])

  useEffect(() => {
    fetchUploads()
  }, [fetchUploads])

  const handleDeleteUpload = async (uploadId: string) => {
    setIsSubmitting(true)
    try {
      await deleteUpload(uploadId)
      await fetchUploads()
      setDeletingUpload(null)
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } }
      alert(axiosError.response?.data?.detail || 'Xóa thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearObservations = async (uploadId: string) => {
    setIsSubmitting(true)
    try {
      const result = await deleteObservationsByUpload(uploadId)
      alert(`Đã xóa ${result.deleted_count} observations`)
      await fetchUploads()
      setClearingUpload(null)
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } }
      alert(axiosError.response?.data?.detail || 'Xóa thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Đang chờ' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đang xử lý' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Hoàn thành' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Thất bại' },
      cleared: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Đã xóa dữ liệu' },
    }
    const badge = badges[status] || { bg: 'bg-slate-100', text: 'text-slate-700', label: status }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Uploads</h1>
        <span className="text-sm text-slate-500">Tổng cộng: {total} uploads</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="pending">Đang chờ</option>
              <option value="processing">Đang xử lý</option>
              <option value="completed">Hoàn thành</option>
              <option value="failed">Thất bại</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Người tải
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Kết quả
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {uploads.map((upload) => (
                  <tr key={upload.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          upload.file_type === 'csv' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <span className={`text-xs font-bold ${
                            upload.file_type === 'csv' ? 'text-green-700' : 'text-blue-700'
                          }`}>
                            {upload.file_type.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 max-w-[200px] truncate">
                            {upload.file_name}
                          </div>
                          <div className="text-xs text-slate-500">ID: {upload.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-800">{upload.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(upload.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-slate-600">
                        <span className="text-green-600 font-medium">{upload.valid_rows}</span>
                        {' / '}
                        {upload.total_rows} dòng
                        {upload.invalid_rows > 0 && (
                          <span className="text-red-500 ml-1">
                            ({upload.invalid_rows} lỗi)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(upload.uploaded_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {upload.valid_rows > 0 && (
                          <button
                            onClick={() => setClearingUpload(upload)}
                            className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Xóa dữ liệu observations"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingUpload(upload)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa upload"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Trang {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Upload Modal */}
      {deletingUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Xác nhận xóa upload</h2>
            <p className="text-slate-600 mb-4">
              Bạn có chắc chắn muốn xóa upload <strong>{deletingUpload.file_name}</strong>?
              {deletingUpload.valid_rows > 0 && (
                <span className="block mt-2 text-red-600">
                  {deletingUpload.valid_rows} observations sẽ bị xóa vĩnh viễn.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingUpload(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteUpload(deletingUpload.id)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Đang xóa...' : 'Xóa upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Observations Modal */}
      {clearingUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Xóa dữ liệu observations</h2>
            <p className="text-slate-600 mb-4">
              Bạn có chắc chắn muốn xóa tất cả <strong>{clearingUpload.valid_rows} observations</strong> từ upload 
              <strong> {clearingUpload.file_name}</strong>?
              <span className="block mt-2 text-amber-600">
                Upload record sẽ được giữ lại nhưng dữ liệu sẽ bị xóa.
              </span>
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setClearingUpload(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={() => handleClearObservations(clearingUpload.id)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Đang xóa...' : 'Xóa dữ liệu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
