"""
Tests for file upload endpoint.

Tests:
- Valid CSV upload acceptance
- Valid XLSX upload acceptance
- Invalid file type rejection
- File size limit enforcement
- Authentication required
"""

import pytest
import io
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock


class TestUploadAuthentication:
    """Tests for upload endpoint authentication."""
    
    def test_upload_requires_authentication(self, client: TestClient):
        """Test upload endpoint requires authentication."""
        # Create a minimal CSV file
        csv_content = b"timestamp,latitude,longitude,salinity\n2024-03-15T08:00:00Z,10.24,106.38,15.5"
        files = {"file": ("test.csv", io.BytesIO(csv_content), "text/csv")}
        
        response = client.post("/api/uploads", files=files)
        
        assert response.status_code == 401
        assert "detail" in response.json()


class TestFileTypeValidation:
    """Tests for file type validation."""
    
    def test_upload_valid_csv(self, client: TestClient, auth_headers: dict, db, test_user):
        """Test uploading a valid CSV file."""
        csv_content = b"""timestamp,latitude,longitude,salinity,station_id,station_name,ph,dissolved_oxygen,temperature
2024-03-15T08:00:00Z,10.24,106.38,15.5,BT_001,Tram BT_001,7.2,6.5,28.5
2024-03-16T09:00:00Z,10.26,106.40,16.8,BT_002,Tram BT_002,7.3,6.3,29.0"""
        
        files = {"file": ("test_upload.csv", io.BytesIO(csv_content), "text/csv")}
        
        # Mock the file service to avoid actual file system operations
        with patch("app.services.upload_service.get_file_service") as mock_get_file_service:
            mock_file_service = MagicMock()
            mock_file_service.save_file = AsyncMock(return_value="/uploads/raw/test_upload.csv")
            mock_get_file_service.return_value = mock_file_service
            
            # Also mock parser service to avoid file reading
            with patch("app.services.parser_service.ParserService.parse_file") as mock_parse:
                from app.services.parser_service import ParseResult
                result = ParseResult()
                result.total_rows = 2
                result.valid_rows = 2
                result.invalid_rows = 0
                result.inserted_rows = 2
                result.errors = []
                result.warnings = []
                result.success = True
                mock_parse.return_value = result
                
                response = client.post("/api/uploads", files=files, headers=auth_headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["total_rows"] == 2
        assert data["valid_rows"] == 2
    
    def test_upload_valid_xlsx(self, client: TestClient, auth_headers: dict, db, test_user):
        """Test uploading a valid XLSX file."""
        # Create a minimal XLSX-like content (not actually valid but tests type check)
        xlsx_magic = b"PK\x03\x04"  # ZIP/XLSX magic bytes
        files = {"file": ("test_upload.xlsx", io.BytesIO(xlsx_magic + b"\x00" * 100), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        
        with patch("app.services.upload_service.get_file_service") as mock_get_file_service:
            mock_file_service = MagicMock()
            mock_file_service.save_file = AsyncMock(return_value="/uploads/raw/test_upload.xlsx")
            mock_get_file_service.return_value = mock_file_service
            
            with patch("app.services.parser_service.ParserService.parse_file") as mock_parse:
                from app.services.parser_service import ParseResult
                result = ParseResult()
                result.total_rows = 5
                result.valid_rows = 5
                result.invalid_rows = 0
                result.inserted_rows = 5
                result.errors = []
                result.warnings = []
                result.success = True
                mock_parse.return_value = result
                
                response = client.post("/api/uploads", files=files, headers=auth_headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["upload"]["file_type"] == "xlsx"
    
    def test_upload_invalid_file_type_txt(self, client: TestClient, auth_headers: dict, db, test_user):
        """Test uploading a .txt file is rejected."""
        txt_content = b"This is just a text file"
        files = {"file": ("test.txt", io.BytesIO(txt_content), "text/plain")}
        
        response = client.post("/api/uploads", files=files, headers=auth_headers)
        
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]
    
    def test_upload_invalid_file_type_pdf(self, client: TestClient, auth_headers: dict, db, test_user):
        """Test uploading a PDF file is rejected."""
        pdf_content = b"%PDF-1.4 fake pdf content"
        files = {"file": ("report.pdf", io.BytesIO(pdf_content), "application/pdf")}
        
        response = client.post("/api/uploads", files=files, headers=auth_headers)
        
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]
    
    def test_upload_invalid_file_type_json(self, client: TestClient, auth_headers: dict, db, test_user):
        """Test uploading a JSON file is rejected."""
        json_content = b'{"data": "test"}'
        files = {"file": ("data.json", io.BytesIO(json_content), "application/json")}
        
        response = client.post("/api/uploads", files=files, headers=auth_headers)
        
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]


class TestFileSizeLimit:
    """Tests for file size validation."""
    
    def test_upload_file_size_within_limit(self, client: TestClient, auth_headers: dict, db, test_user):
        """Test uploading a file within size limit."""
        # Create a 1MB file (within 10MB limit)
        csv_header = b"timestamp,latitude,longitude,salinity\n"
        csv_row = b"2024-03-15T08:00:00Z,10.24,106.38,15.5\n"
        csv_content = csv_header + (csv_row * 15000)  # About 600KB
        
        files = {"file": ("large_valid.csv", io.BytesIO(csv_content), "text/csv")}
        
        with patch("app.services.upload_service.get_file_service") as mock_get_file_service:
            mock_file_service = MagicMock()
            mock_file_service.save_file = AsyncMock(return_value="/uploads/raw/large_valid.csv")
            mock_get_file_service.return_value = mock_file_service
            
            with patch("app.services.parser_service.ParserService.parse_file") as mock_parse:
                from app.services.parser_service import ParseResult
                result = ParseResult()
                result.total_rows = 15000
                result.valid_rows = 15000
                result.invalid_rows = 0
                result.inserted_rows = 15000
                result.errors = []
                result.warnings = []
                result.success = True
                mock_parse.return_value = result
                
                response = client.post("/api/uploads", files=files, headers=auth_headers)
        
        assert response.status_code == 201
    
    def test_upload_file_size_exceeds_limit(self, client: TestClient, auth_headers: dict, db, test_user):
        """Test uploading a file exceeding 10MB limit is rejected."""
        # Create a file larger than 10MB
        large_content = b"timestamp,latitude,longitude,salinity\n" + (b"2024-03-15T08:00:00Z,10.24,106.38,15.5\n" * 300000)
        # This should be around 12MB
        
        files = {"file": ("too_large.csv", io.BytesIO(large_content), "text/csv")}
        
        response = client.post("/api/uploads", files=files, headers=auth_headers)
        
        assert response.status_code == 400
        assert "size exceeds" in response.json()["detail"].lower() or "limit" in response.json()["detail"].lower()


class TestUploadList:
    """Tests for listing uploads."""
    
    def test_get_uploads_empty(self, client: TestClient, auth_headers: dict, db, test_user):
        """Test getting uploads when none exist."""
        response = client.get("/api/uploads", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
    
    def test_get_uploads_with_data(self, client: TestClient, auth_headers: dict, sample_upload):
        """Test getting uploads with existing data."""
        response = client.get("/api/uploads", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1
        
        # Check upload structure
        upload = data["items"][0]
        assert "id" in upload
        assert "file_name" in upload
        assert "status" in upload
    
    def test_get_uploads_pagination(self, client: TestClient, auth_headers: dict, sample_upload):
        """Test upload pagination parameters."""
        response = client.get("/api/uploads?page=1&page_size=10", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10
    
    def test_get_uploads_requires_auth(self, client: TestClient):
        """Test getting uploads requires authentication."""
        response = client.get("/api/uploads")
        
        assert response.status_code == 401
