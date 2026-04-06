"""Parser service for CSV/XLSX file processing."""
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
from sqlalchemy.orm import Session

from .validation_service import validate_dataframe, ValidationResult
from ..repositories.observation_repository import ObservationRepository


# Column name mappings (source -> target)
COLUMN_MAPPINGS = {
    # timestamp variations
    "timestamp": "timestamp",
    "time": "timestamp",
    "datetime": "timestamp",
    "date_time": "timestamp",
    "measured_at": "timestamp",
    # latitude variations
    "latitude": "latitude",
    "lat": "latitude",
    # longitude variations
    "longitude": "longitude",
    "lon": "longitude",
    "lng": "longitude",
    # salinity
    "salinity": "salinity",
    # station_id
    "station_id": "station_id",
    "stationid": "station_id",
    "station": "station_id",
    # station_name
    "station_name": "station_name",
    "stationname": "station_name",
    "name": "station_name",
    # ph
    "ph": "ph",
    "pH": "ph",
    # dissolved_oxygen variations
    "dissolved_oxygen": "dissolved_oxygen",
    "dissolvedoxygen": "dissolved_oxygen",
    "do": "dissolved_oxygen",
    "DO": "dissolved_oxygen",
    # temperature variations
    "temperature": "temperature",
    "temp": "temperature",
}


class ParseResult:
    """Result of parsing a file."""
    
    def __init__(self):
        self.total_rows: int = 0
        self.valid_rows: int = 0
        self.invalid_rows: int = 0
        self.inserted_rows: int = 0
        self.errors: list = []
        self.warnings: list = []
        self.success: bool = False


class ParserService:
    """Service for parsing CSV/XLSX files."""
    
    BATCH_SIZE = 100
    
    def __init__(self, db: Session):
        self.db = db
        self.observation_repo = ObservationRepository(db)
    
    def parse_file(
        self,
        file_path: str,
        file_type: str,
        upload_id: UUID
    ) -> ParseResult:
        """Parse a CSV or XLSX file and insert observations."""
        result = ParseResult()
        
        try:
            # Read file into DataFrame
            if file_type == "csv":
                df = self._parse_csv(file_path)
            elif file_type in ("xlsx", "xls"):
                df = self._parse_xlsx(file_path)
            else:
                result.errors.append({"message": f"Unsupported file type: {file_type}"})
                return result
            
            if df.empty:
                result.errors.append({"message": "File is empty"})
                return result
            
            result.total_rows = len(df)
            
            # Normalize column names
            df = self._normalize_columns(df)
            
            # Validate DataFrame
            validation_result = validate_dataframe(df)
            result.errors.extend(validation_result.errors)
            result.warnings.extend(validation_result.warnings)
            result.valid_rows = validation_result.valid_rows
            result.invalid_rows = validation_result.invalid_rows
            
            # If validation has errors (missing columns, etc.), stop here
            if not validation_result.is_valid and validation_result.valid_rows == 0:
                return result
            
            # Convert valid rows to observation dicts and insert in batches
            observations = self._convert_to_observations(df, validation_result)
            
            if observations:
                inserted = self.observation_repo.create_batch(observations, upload_id)
                result.inserted_rows = inserted
            
            result.success = result.inserted_rows > 0
            
        except pd.errors.EmptyDataError:
            result.errors.append({"message": "File is empty or has no data"})
        except pd.errors.ParserError as e:
            result.errors.append({"message": f"Failed to parse file: {str(e)}"})
        except Exception as e:
            result.errors.append({"message": f"Unexpected error: {str(e)}"})
        
        return result
    
    def _parse_csv(self, file_path: str) -> pd.DataFrame:
        """Parse CSV file with UTF-8 encoding and comma delimiter."""
        return pd.read_csv(
            file_path,
            encoding="utf-8",
            delimiter=",",
            header=0,  # First row is header
            dtype=str,  # Read all as string initially for proper validation
            na_values=["", "NA", "N/A", "null", "NULL", "None"],
        )
    
    def _parse_xlsx(self, file_path: str) -> pd.DataFrame:
        """Parse XLSX file (first sheet only)."""
        return pd.read_excel(
            file_path,
            sheet_name=0,  # First sheet only
            header=0,  # First row is header
            dtype=str,  # Read all as string initially
            na_values=["", "NA", "N/A", "null", "NULL", "None"],
        )
    
    def _normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize column names to standard names."""
        # Create mapping for this DataFrame's columns
        rename_map = {}
        for col in df.columns:
            col_lower = col.strip().lower()
            if col_lower in COLUMN_MAPPINGS:
                rename_map[col] = COLUMN_MAPPINGS[col_lower]
            elif col.strip() in COLUMN_MAPPINGS:
                rename_map[col] = COLUMN_MAPPINGS[col.strip()]
        
        return df.rename(columns=rename_map)
    
    def _convert_to_observations(
        self,
        df: pd.DataFrame,
        validation_result: ValidationResult
    ) -> list:
        """Convert valid DataFrame rows to observation dictionaries."""
        observations = []
        
        # Get row indices with errors
        error_rows = {err.get("row", 0) for err in validation_result.errors}
        
        for idx, row in df.iterrows():
            row_num = idx + 2  # Account for header and 0-indexing
            
            # Skip rows with validation errors
            if row_num in error_rows:
                continue
            
            try:
                obs = self._row_to_observation(row)
                if obs:
                    observations.append(obs)
            except Exception:
                # Skip rows that fail conversion
                continue
        
        return observations
    
    def _row_to_observation(self, row: pd.Series) -> Optional[Dict[str, Any]]:
        """Convert a DataFrame row to an observation dictionary."""
        # Parse timestamp to UTC
        timestamp = self._parse_timestamp(row.get("timestamp"))
        if timestamp is None:
            return None
        
        # Parse required numeric fields
        try:
            latitude = float(row["latitude"])
            longitude = float(row["longitude"])
            salinity = float(row["salinity"])
        except (ValueError, TypeError, KeyError):
            return None
        
        # Build observation dict
        obs = {
            "measured_at": timestamp,
            "latitude": latitude,
            "longitude": longitude,
            "salinity": salinity,
            "station_id": self._get_station_id(row),
        }
        
        # Add optional fields if present and valid
        if "station_name" in row and pd.notna(row["station_name"]):
            obs["station_name"] = str(row["station_name"]).strip()
        
        if "ph" in row and pd.notna(row["ph"]):
            try:
                obs["ph"] = float(row["ph"])
            except (ValueError, TypeError):
                pass
        
        if "dissolved_oxygen" in row and pd.notna(row["dissolved_oxygen"]):
            try:
                obs["dissolved_oxygen"] = float(row["dissolved_oxygen"])
            except (ValueError, TypeError):
                pass
        
        if "temperature" in row and pd.notna(row["temperature"]):
            try:
                obs["temperature"] = float(row["temperature"])
            except (ValueError, TypeError):
                pass
        
        return obs
    
    def _parse_timestamp(self, value: Any) -> Optional[datetime]:
        """Parse timestamp string to UTC datetime."""
        if pd.isna(value):
            return None
        
        try:
            # Try pandas datetime parsing (handles many formats)
            dt = pd.to_datetime(value, utc=True)
            return dt.to_pydatetime()
        except Exception:
            pass
        
        # Try common formats manually
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y/%m/%d %H:%M:%S",
            "%d/%m/%Y %H:%M:%S",
            "%m/%d/%Y %H:%M:%S",
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(str(value), fmt)
                # Assume UTC if no timezone
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        
        return None
    
    def _get_station_id(self, row: pd.Series) -> str:
        """Get station_id or generate one from coordinates."""
        if "station_id" in row and pd.notna(row["station_id"]):
            return str(row["station_id"]).strip()
        
        # Generate from coordinates
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            return f"LOC_{lat:.4f}_{lon:.4f}"
        except (ValueError, TypeError, KeyError):
            return "UNKNOWN"


def get_parser_service(db: Session) -> ParserService:
    """Factory function for ParserService."""
    return ParserService(db)
