'use client'

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/lib/auth'

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['.csv', '.xlsx']
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

interface UploadError {
  row?: number
  message: string
}

interface UploadWarning {
  row?: number
  message: string
}

interface UploadResultResponse {
  upload: {
    id: string
    file_name: string
    uploaded_at: string
    status: string
    total_rows: number
    valid_rows: number
    invalid_rows: number
  }
  total_rows: number
  valid_rows: number
  invalid_rows: number
  inserted_rows: number
  errors: UploadError[]
  warnings: UploadWarning[]
  success: boolean
}

interface UploadResult {
  success: boolean
  message: string
  validRows?: number
  warnings?: UploadWarning[]
  errors?: UploadError[]
}

export default function UploadForm() {
  const { isAuthenticated } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate file type and size
  const validateFile = useCallback((selectedFile: File): string | null => {
    const extension = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
    const isValidType =
      ALLOWED_TYPES.includes(extension) || ALLOWED_MIME_TYPES.includes(selectedFile.type)

    if (!isValidType) {
      return 'Chỉ chấp nhận file CSV hoặc XLSX'
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2)
      return `File quá lớn (${sizeMB}MB). Kích thước tối đa là 10MB`
    }

    return null
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
      setValidationError(null)
      setUploadResult(null)

      if (!selectedFile) {
        setFile(null)
        return
      }

      const error = validateFile(selectedFile)
      if (error) {
        setValidationError(error)
        setFile(null)
        return
      }

      setFile(selectedFile)
    },
    [validateFile]
  )

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFile = e.dataTransfer.files[0]
      handleFileSelect(droppedFile || null)
    },
    [handleFileSelect]
  )

  // File input change handler
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      handleFileSelect(selectedFile || null)
    },
    [handleFileSelect]
  )

  // Trigger file input click
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Upload file to API
  const handleUpload = useCallback(async () => {
    if (!file || !isAuthenticated) return

    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post<UploadResultResponse>('/api/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const result = response.data
      setUploadResult({
        success: result.success,
        message: `Đã tải lên ${result.valid_rows} dòng dữ liệu`,
        validRows: result.valid_rows,
        warnings: result.warnings,
        errors: result.errors,
      })

      // Clear file after successful upload
      if (result.success) {
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (err: unknown) {
      let errorMessage = 'Đã xảy ra lỗi khi tải lên. Vui lòng thử lại.'

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } }
        if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail
        }
      }

      setUploadResult({
        success: false,
        message: errorMessage,
      })
    } finally {
      setIsUploading(false)
    }
  }, [file, isAuthenticated])

  // Clear selection
  const handleClear = useCallback(() => {
    setFile(null)
    setValidationError(null)
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-blue-900">Tải lên dữ liệu</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-slate-600">Vui lòng đăng nhập để tải lên dữ liệu</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-blue-900">Tải lên dữ liệu</h2>
        <p className="text-sm text-slate-600 mt-1">
          Chấp nhận file CSV hoặc XLSX (tối đa 10MB)
        </p>
      </div>

      {/* Upload Area */}
      <div className="p-6">
        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${
              isDragging
                ? 'border-cyan-500 bg-cyan-50 scale-[1.02]'
                : file
                  ? 'border-green-400 bg-green-50'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Icon */}
          <div
            className={`
              w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4
              transition-colors duration-200
              ${
                isDragging
                  ? 'bg-cyan-100'
                  : file
                    ? 'bg-green-100'
                    : 'bg-blue-100'
              }
            `}
          >
            {file ? (
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className={`w-8 h-8 ${isDragging ? 'text-cyan-600' : 'text-blue-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            )}
          </div>

          {/* Text */}
          {file ? (
            <div>
              <p className="text-sm font-medium text-green-700">{file.name}</p>
              <p className="text-xs text-slate-500 mt-1">{formatFileSize(file.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-700">
                {isDragging ? 'Thả file vào đây' : 'Kéo thả file vào đây'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                hoặc <span className="text-blue-600 font-medium">chọn file</span> từ máy tính
              </p>
            </div>
          )}
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div
            className={`mt-4 p-4 rounded-lg border ${
              uploadResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {uploadResult.success ? (
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    uploadResult.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {uploadResult.message}
                </p>

                {/* Warnings */}
                {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">
                      Cảnh báo ({uploadResult.warnings.length}):
                    </p>
                    <ul className="text-xs text-amber-600 space-y-1 max-h-24 overflow-y-auto">
                      {uploadResult.warnings.map((warning, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-amber-500">•</span>
                          {warning.row !== undefined && (
                            <span className="font-medium">Dòng {warning.row}:</span>
                          )}
                          <span>{warning.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Errors */}
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-red-700 mb-1">
                      Lỗi ({uploadResult.errors.length}):
                    </p>
                    <ul className="text-xs text-red-600 space-y-1 max-h-24 overflow-y-auto">
                      {uploadResult.errors.map((error, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-red-500">•</span>
                          {error.row !== undefined && (
                            <span className="font-medium">Dòng {error.row}:</span>
                          )}
                          <span>{error.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          {file && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 
                         rounded-lg hover:bg-slate-200 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
          )}
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r 
                       from-blue-600 to-cyan-600 rounded-lg shadow-md
                       hover:from-blue-700 hover:to-cyan-700 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang tải lên...
              </span>
            ) : (
              'Tải lên'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
