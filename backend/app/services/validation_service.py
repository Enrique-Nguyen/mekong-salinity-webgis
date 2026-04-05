from typing import List, Dict, Any, Tuple
from datetime import datetime
import pandas as pd


# ĐBSCL bounding box
DBSCL_BOUNDS = {
    "min_lat": 8.5,
    "max_lat": 11.5,
    "min_lon": 103.5,
    "max_lon": 107.5
}

REQUIRED_COLUMNS = ["timestamp", "latitude", "longitude", "salinity"]
OPTIONAL_COLUMNS = ["station_id", "station_name", "ph", "dissolved_oxygen", "temperature"]


class ValidationResult:
    def __init__(self):
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.valid_rows: int = 0
        self.invalid_rows: int = 0
    
    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0


def validate_file_type(filename: str) -> Tuple[bool, str]:
    """Validate file extension."""
    if filename.lower().endswith('.csv'):
        return True, "csv"
    elif filename.lower().endswith(('.xlsx', '.xls')):
        return True, "xlsx"
    return False, "Invalid file type. Only CSV and XLSX files are accepted."


def validate_file_size(size_bytes: int, max_mb: int = 10) -> Tuple[bool, str]:
    """Validate file size (max 10MB default)."""
    max_bytes = max_mb * 1024 * 1024
    if size_bytes > max_bytes:
        return False, f"File size exceeds {max_mb}MB limit"
    return True, ""


def validate_dataframe(df: pd.DataFrame) -> ValidationResult:
    """Validate DataFrame content."""
    result = ValidationResult()
    
    # Check required columns
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        result.errors.append({
            "row": 0,
            "message": f"Missing required columns: {', '.join(missing_cols)}"
        })
        return result
    
    # Validate each row
    for idx, row in df.iterrows():
        row_num = idx + 2  # Account for header and 0-indexing
        row_valid = True
        
        # Validate timestamp
        try:
            if pd.isna(row['timestamp']):
                result.errors.append({"row": row_num, "message": "Missing timestamp"})
                row_valid = False
        except:
            result.errors.append({"row": row_num, "message": "Invalid timestamp format"})
            row_valid = False
        
        # Validate coordinates
        try:
            lat = float(row['latitude'])
            lon = float(row['longitude'])
            
            # Check bounds (warn, don't reject)
            if not (DBSCL_BOUNDS['min_lat'] <= lat <= DBSCL_BOUNDS['max_lat']):
                result.warnings.append({
                    "row": row_num,
                    "message": f"Latitude {lat} outside ĐBSCL bounds"
                })
            if not (DBSCL_BOUNDS['min_lon'] <= lon <= DBSCL_BOUNDS['max_lon']):
                result.warnings.append({
                    "row": row_num,
                    "message": f"Longitude {lon} outside ĐBSCL bounds"
                })
        except (ValueError, TypeError):
            result.errors.append({"row": row_num, "message": "Invalid coordinate values"})
            row_valid = False
        
        # Validate salinity
        try:
            salinity = float(row['salinity'])
            if salinity < 0:
                result.errors.append({"row": row_num, "message": "Salinity cannot be negative"})
                row_valid = False
        except (ValueError, TypeError):
            result.errors.append({"row": row_num, "message": "Invalid salinity value"})
            row_valid = False
        
        # Validate optional pH
        if 'ph' in df.columns and pd.notna(row.get('ph')):
            try:
                ph = float(row['ph'])
                if not (0 <= ph <= 14):
                    result.warnings.append({"row": row_num, "message": f"pH {ph} outside valid range 0-14"})
            except (ValueError, TypeError):
                result.warnings.append({"row": row_num, "message": "Invalid pH value"})
        
        # Validate optional temperature
        if 'temperature' in df.columns and pd.notna(row.get('temperature')):
            try:
                temp = float(row['temperature'])
                if not (-10 <= temp <= 50):
                    result.warnings.append({"row": row_num, "message": f"Temperature {temp} outside valid range"})
            except (ValueError, TypeError):
                result.warnings.append({"row": row_num, "message": "Invalid temperature value"})
        
        if row_valid:
            result.valid_rows += 1
        else:
            result.invalid_rows += 1
    
    return result
