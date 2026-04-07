'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getUsers,
  updateUser,
  deleteUser,
  UserResponse,
  UserListResponse,
} from '@/lib/admin-api'

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('')
  
  // Modal states
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: {
        page: number
        page_size: number
        search?: string
        role?: string
        is_active?: boolean
      } = {
        page,
        page_size: pageSize,
      }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      if (activeFilter !== '') params.is_active = activeFilter === 'true'

      const data: UserListResponse = await getUsers(params)
      setUsers(data.users)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch (err) {
      setError('Không thể tải danh sách người dùng')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, search, roleFilter, activeFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleUpdateUser = async (userId: string, data: { role?: string; is_active?: boolean }) => {
    setIsSubmitting(true)
    try {
      await updateUser(userId, data)
      await fetchUsers()
      setEditingUser(null)
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } }
      alert(axiosError.response?.data?.detail || 'Cập nhật thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setIsSubmitting(true)
    try {
      await deleteUser(userId)
      await fetchUsers()
      setDeletingUser(null)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý người dùng</h1>
        <span className="text-sm text-slate-500">Tổng cộng: {total} người dùng</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tìm kiếm</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Username hoặc email..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
            <select
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="true">Hoạt động</option>
              <option value="false">Vô hiệu hóa</option>
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
                    Người dùng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{user.username}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        user.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
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

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Chỉnh sửa người dùng: {editingUser.username}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={editingUser.is_active ? 'true' : 'false'}
                  onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Hoạt động</option>
                  <option value="false">Vô hiệu hóa</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={() => handleUpdateUser(editingUser.id, {
                  role: editingUser.role,
                  is_active: editingUser.is_active,
                })}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Xác nhận xóa</h2>
            <p className="text-slate-600 mb-4">
              Bạn có chắc chắn muốn xóa người dùng <strong>{deletingUser.username}</strong>?
              Tất cả dữ liệu của người dùng này (uploads, observations) sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteUser(deletingUser.id)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Đang xóa...' : 'Xóa người dùng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
