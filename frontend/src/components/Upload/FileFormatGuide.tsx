'use client'

import { useState, useEffect } from 'react'
import { getFileFormatGuide, FileFormatGuideResponse, ColumnInfo } from '@/lib/admin-api'

interface FileFormatGuideProps {
  isOpen: boolean
  onClose: () => void
}

export default function FileFormatGuide({ isOpen, onClose }: FileFormatGuideProps) {
  const [guide, setGuide] = useState<FileFormatGuideResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'required' | 'optional' | 'sample'>('required')

  useEffect(() => {
    if (isOpen && !guide) {
      fetchGuide()
    }
  }, [isOpen, guide])

  const fetchGuide = async () => {
    try {
      const data = await getFileFormatGuide()
      setGuide(data)
    } catch (err) {
      console.error('Failed to load format guide:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadSampleCSV = () => {
    if (!guide) return
    const blob = new Blob([guide.sample_csv_full], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_salinity_data.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Hướng dẫn định dạng file upload
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : guide ? (
            <div className="space-y-6">
              {/* File info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Thông tin chung</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li><strong>Định dạng chấp nhận:</strong> {guide.accepted_formats.join(', ')}</li>
                  <li><strong>Kích thước tối đa:</strong> {guide.max_file_size_mb} MB</li>
                  <li><strong>Mã hóa:</strong> {guide.encoding}</li>
                </ul>
              </div>

              {/* Tabs */}
              <div className="border-b border-slate-200">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('required')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'required'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Cột bắt buộc ({guide.required_columns.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('optional')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'optional'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Cột tùy chọn ({guide.optional_columns.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('sample')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'sample'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Ví dụ mẫu
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'required' && (
                <div className="space-y-4">
                  {guide.required_columns.map((col) => (
                    <ColumnCard key={col.name} column={col} />
                  ))}
                </div>
              )}

              {activeTab === 'optional' && (
                <div className="space-y-4">
                  {guide.optional_columns.map((col) => (
                    <ColumnCard key={col.name} column={col} />
                  ))}
                </div>
              )}

              {activeTab === 'sample' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">File đầy đủ:</h4>
                    <pre className="bg-slate-100 rounded-lg p-4 text-sm overflow-x-auto text-slate-700">
                      {guide.sample_csv_full}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">File tối thiểu (chỉ cột bắt buộc):</h4>
                    <pre className="bg-slate-100 rounded-lg p-4 text-sm overflow-x-auto text-slate-700">
                      {guide.sample_csv_minimal}
                    </pre>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-medium text-amber-900 mb-2">Lưu ý quan trọng</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  {guide.notes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Không thể tải hướng dẫn định dạng
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={downloadSampleCSV}
            disabled={!guide}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Tải file mẫu CSV
            </span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

function ColumnCard({ column }: { column: ColumnInfo }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono text-slate-800">
              {column.name}
            </code>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              column.required
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {column.required ? 'Bắt buộc' : 'Tùy chọn'}
            </span>
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
              {column.data_type}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-2">{column.description}</p>
          {column.aliases.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              <strong>Tên thay thế:</strong> {column.aliases.join(', ')}
            </p>
          )}
          {column.validation && (
            <p className="text-xs text-amber-600 mt-1">
              <strong>Kiểm tra:</strong> {column.validation}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500">Ví dụ:</span>
          <code className="block px-2 py-1 bg-green-50 rounded text-sm text-green-700 mt-1">
            {column.example}
          </code>
        </div>
      </div>
    </div>
  )
}
