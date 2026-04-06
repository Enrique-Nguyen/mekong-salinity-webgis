# Mekong Salinity WebGIS

## 1. Giới thiệu

Mekong Salinity WebGIS là hệ thống WebGIS theo dõi độ mặn tại Đồng bằng sông Cửu Long. Hệ thống cho phép người dùng đăng ký, đăng nhập, tải tệp dữ liệu quan trắc (CSV/XLSX), trực quan dữ liệu trên bản đồ tương tác và biểu đồ chuỗi thời gian.

Mục tiêu chính:

- Hỗ trợ giám sát xâm nhập mặn theo không gian và thời gian
- Chuẩn hóa quy trình thu thập, kiểm tra và lưu trữ dữ liệu quan trắc
- Cung cấp API bảo mật bằng JWT để tích hợp và khai thác dữ liệu

## 2. Tính năng chính

- Xác thực JWT:
  - Đăng ký tài khoản
  - Đăng nhập, lấy access token
  - Lấy thông tin người dùng hiện tại
- Upload dữ liệu quan trắc:
  - Hỗ trợ `.csv`, `.xlsx`
  - Giới hạn kích thước tệp tối đa 10MB
  - Kiểm tra cột bắt buộc, kiểu dữ liệu, phạm vi dữ liệu
- Bản đồ Leaflet:
  - Marker tô màu theo ngưỡng độ mặn
  - Popup chi tiết theo điểm đo
  - Bật hoặc tắt Heatmap
- Biểu đồ chuỗi thời gian:
  - Hiển thị xu hướng độ mặn theo thời gian
  - Lọc theo trạm
- API truy vấn dữ liệu:
  - Phân trang
  - Lọc theo khoảng thời gian
  - Lọc theo bounding box
  - Thống kê tổng hợp

## 3. Yêu cầu hệ thống

Tối thiểu:

- Docker Desktop (khuyến nghị để chạy nhanh toàn bộ hệ thống)
- Git

Tùy chọn:

- Node.js 20+ (nếu chạy frontend cục bộ)
- Python 3.11+ (nếu chạy backend cục bộ)
- PostgreSQL 15 + PostGIS (nếu không dùng Docker)
- kubectl + cụm Kubernetes (nếu deploy K8s)

## 4. Cài đặt và chạy với Docker Compose

### 4.1 Chuẩn bị biến môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Nếu dùng Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Bạn nên cập nhật ít nhất các biến sau trong `.env` trước khi chạy môi trường thật:

- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- `PGADMIN_PASSWORD`

### 4.2 Khởi động toàn bộ dịch vụ

```bash
docker-compose up -d
```

Các service mặc định:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- PgAdmin: `http://localhost:5050`
- PostgreSQL: `localhost:5432`

### 4.3 Theo dõi log

```bash
docker-compose logs -f
```

Theo dõi log riêng từng service:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### 4.4 Dừng hệ thống

```bash
docker-compose down
```

Xóa luôn volume dữ liệu (cẩn thận vì sẽ mất dữ liệu DB):

```bash
docker-compose down -v
```

### 4.5 Kiểm tra nhanh sau khi chạy

```bash
curl http://localhost:8000/api/health
```

Kết quả mong đợi:

```json
{
  "status": "ok",
  "database": "connected"
}
```

### 4.6 Chạy cục bộ không Docker (tùy chọn)

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Lưu ý:

- Frontend đọc API URL từ `NEXT_PUBLIC_API_URL`, mặc định fallback `http://localhost:8000`.
- Khi chạy không Docker, bạn cần tự chuẩn bị PostgreSQL + PostGIS và `DATABASE_URL` phù hợp.

## 5. Deploy với Kubernetes

Thư mục manifest: `k8s/`

### 5.1 Chuẩn bị image

Manifest hiện tại dùng:

- `mekong-salinity-backend:latest`
- `mekong-salinity-frontend:latest`

Bạn cần build và push lên registry mà cụm Kubernetes truy cập được.

Ví dụ:

```bash
# Tại thư mục gốc dự án
docker build -t <registry>/mekong-salinity-backend:latest ./backend
docker build -t <registry>/mekong-salinity-frontend:latest ./frontend

docker push <registry>/mekong-salinity-backend:latest
docker push <registry>/mekong-salinity-frontend:latest
```

Sau đó cập nhật `image:` trong:

- `k8s/backend-deployment.yaml`
- `k8s/frontend-deployment.yaml`

### 5.2 Đồng bộ lại manifest trước khi apply

Các file `k8s/*.yaml` hiện có một số chênh lệch tên tài nguyên. Bạn nên chỉnh lại trước khi deploy:

1. Đồng bộ tên `ConfigMap`:
   - `k8s/configmap.yaml` đang là `mekong-config`
   - `backend-deployment.yaml`, `frontend-deployment.yaml` đang tham chiếu `mekong-salinity-config`

2. Đồng bộ tên `Secret`:
   - `k8s/secrets.yaml` đang là `mekong-secrets`
   - `postgres-deployment.yaml`, `backend-deployment.yaml` đang tham chiếu `mekong-salinity-secrets`

3. Bổ sung key còn thiếu:
   - `DATABASE_URL` trong Secret cho backend
   - `NEXT_PUBLIC_API_URL` trong ConfigMap cho frontend
   - `POSTGRES_DB` trong ConfigMap hoặc sửa `postgres-deployment.yaml` dùng key phù hợp

4. Đồng bộ tên PVC upload:
   - `k8s/pvc.yaml` đang là `uploads-pvc`
   - `backend-deployment.yaml` đang dùng `backend-uploads-pvc`

5. Sửa health check backend:
   - Manifest đang probe `/health`
   - API thực tế là `/api/health`

### 5.3 Apply manifest

Thứ tự khuyến nghị:

```bash
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/services.yaml
```

### 5.4 Kiểm tra trạng thái

```bash
kubectl get pods
kubectl get svc
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

Frontend service đang cấu hình NodePort `30080`:

- Truy cập: `http://<node-ip>:30080`

### 5.5 Gỡ triển khai

```bash
kubectl delete -f k8s/services.yaml
kubectl delete -f k8s/frontend-deployment.yaml
kubectl delete -f k8s/backend-deployment.yaml
kubectl delete -f k8s/postgres-deployment.yaml
kubectl delete -f k8s/pvc.yaml
kubectl delete -f k8s/configmap.yaml
kubectl delete -f k8s/secrets.yaml
```

## 6. Hướng dẫn sử dụng

### 6.1 Đăng ký tài khoản

1. Truy cập trang đăng ký: `http://localhost:3000/register`
2. Nhập:
   - Tên đăng nhập (tối thiểu 3 ký tự)
   - Email hợp lệ
   - Mật khẩu (tối thiểu 6 ký tự)
   - Xác nhận mật khẩu
3. Nhấn **Đăng ký**
4. Sau khi thành công, hệ thống chuyển sang trang đăng nhập

Mô tả ảnh chụp màn hình đề xuất:

- Ảnh 1: Form đăng ký gồm 4 ô nhập và nút Đăng ký
- Ảnh 2: Thông báo lỗi khi email sai định dạng hoặc mật khẩu không khớp

### 6.2 Đăng nhập

1. Truy cập: `http://localhost:3000/login`
2. Nhập tên đăng nhập và mật khẩu
3. Nhấn **Đăng nhập**
4. Khi thành công, hệ thống điều hướng vào dashboard

Mô tả ảnh chụp màn hình đề xuất:

- Ảnh 3: Form đăng nhập
- Ảnh 4: Dashboard sau khi đăng nhập thành công

### 6.3 Upload dữ liệu

1. Tại dashboard, tìm khối **Tải lên dữ liệu**
2. Kéo thả tệp hoặc bấm để chọn tệp `.csv` hoặc `.xlsx`
3. Nhấn **Tải lên**
4. Hệ thống trả kết quả:
   - Số dòng hợp lệ
   - Số dòng lỗi
   - Danh sách cảnh báo, lỗi theo dòng

Mô tả ảnh chụp màn hình đề xuất:

- Ảnh 5: Khu vực kéo thả tệp
- Ảnh 6: Kết quả upload với số dòng hợp lệ và cảnh báo

### 6.4 Xem bản đồ và biểu đồ

1. Dùng bộ lọc thời gian ở đầu dashboard (Từ ngày, Đến ngày)
2. Quan sát marker trên bản đồ:
   - Xanh: an toàn
   - Vàng: trung bình
   - Cam: cao
   - Đỏ: nguy hiểm
3. Bấm marker để xem popup chi tiết (độ mặn, thời gian, pH, DO, nhiệt độ)
4. Bật hoặc tắt **Heatmap** để xem mật độ mức mặn
5. Ở panel biểu đồ, chọn trạm để xem chuỗi thời gian độ mặn

Mô tả ảnh chụp màn hình đề xuất:

- Ảnh 7: Bản đồ với marker màu theo độ mặn
- Ảnh 8: Popup chi tiết điểm đo
- Ảnh 9: Biểu đồ độ mặn theo thời gian theo trạm

## 7. API Documentation

Base URL mặc định:

```text
http://localhost:8000
```

Swagger UI:

```text
http://localhost:8000/docs
```

### 7.1 Cơ chế xác thực

Các endpoint protected yêu cầu header:

```http
Authorization: Bearer <access_token>
```

Token lấy từ endpoint đăng nhập `/auth/login`.

### 7.2 Danh sách endpoint

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | Public | Đăng ký tài khoản |
| POST | `/auth/login` | Public | Đăng nhập, trả `access_token` |
| GET | `/auth/me` | Protected | Lấy thông tin user hiện tại |
| GET | `/api/health` | Public | Health check API và DB |
| POST | `/api/uploads` | Protected | Upload tệp CSV/XLSX |
| GET | `/api/uploads` | Protected | Danh sách upload có phân trang |
| GET | `/api/observations` | Protected | Truy vấn dữ liệu quan trắc có lọc |
| GET | `/api/observations/stats` | Protected | Thống kê tổng hợp dữ liệu quan trắc |

### 7.3 Ví dụ curl

#### 7.3.1 Đăng ký

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo_user",
    "email": "demo@example.com",
    "password": "123456"
  }'
```

#### 7.3.2 Đăng nhập

Lưu ý: endpoint này dùng `application/x-www-form-urlencoded`.

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo_user&password=123456"
```

Ví dụ kết quả:

```json
{
  "access_token": "<jwt_token>",
  "token_type": "bearer"
}
```

#### 7.3.3 Lấy thông tin user hiện tại

```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer <jwt_token>"
```

#### 7.3.4 Health check

```bash
curl -X GET "http://localhost:8000/api/health"
```

#### 7.3.5 Upload file

```bash
curl -X POST "http://localhost:8000/api/uploads" \
  -H "Authorization: Bearer <jwt_token>" \
  -F "file=@sample_data/salinity_sample.csv"
```

#### 7.3.6 Danh sách upload

```bash
curl -X GET "http://localhost:8000/api/uploads?page=1&page_size=20" \
  -H "Authorization: Bearer <jwt_token>"
```

#### 7.3.7 Truy vấn quan trắc theo thời gian và phân trang

```bash
curl -G "http://localhost:8000/api/observations" \
  -H "Authorization: Bearer <jwt_token>" \
  --data-urlencode "start_date=2024-01-01T00:00:00Z" \
  --data-urlencode "end_date=2024-12-31T23:59:59Z" \
  --data-urlencode "page=1" \
  --data-urlencode "page_size=100"
```

#### 7.3.8 Truy vấn quan trắc theo bounding box

Lưu ý: để lọc bbox, cần truyền đủ 4 tham số `min_lat`, `max_lat`, `min_lon`, `max_lon`.

```bash
curl -G "http://localhost:8000/api/observations" \
  -H "Authorization: Bearer <jwt_token>" \
  --data-urlencode "min_lat=9.0" \
  --data-urlencode "max_lat=11.0" \
  --data-urlencode "min_lon=104.0" \
  --data-urlencode "max_lon=107.0" \
  --data-urlencode "page=1" \
  --data-urlencode "page_size=100"
```

#### 7.3.9 Thống kê quan trắc

```bash
curl -X GET "http://localhost:8000/api/observations/stats" \
  -H "Authorization: Bearer <jwt_token>"
```

### 7.4 Ghi chú tham số truy vấn

`GET /api/observations` hỗ trợ:

- `start_date`, `end_date` (ISO 8601)
- `station_id`
- `min_lat`, `max_lat`, `min_lon`, `max_lon`
- `page` (mặc định 1)
- `page_size` (mặc định 100, tối đa 5000)

## 8. Cấu trúc thư mục

```text
mekong-salinity-webgis/
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ core/
│  │  ├─ models/
│  │  ├─ repositories/
│  │  ├─ schemas/
│  │  └─ services/
│  ├─ tests/
│  ├─ Dockerfile
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ lib/
│  │  └─ types/
│  ├─ Dockerfile
│  └─ package.json
├─ database/
│  ├─ init.sql
│  └─ seed.sql
├─ k8s/
│  ├─ secrets.yaml
│  ├─ configmap.yaml
│  ├─ pvc.yaml
│  ├─ postgres-deployment.yaml
│  ├─ backend-deployment.yaml
│  ├─ frontend-deployment.yaml
│  └─ services.yaml
├─ sample_data/
│  └─ salinity_sample.csv
├─ uploads/
├─ docker-compose.yml
└─ .env.example
```

## 9. Format file upload

### 9.1 Định dạng và giới hạn

- Chấp nhận: `.csv`, `.xlsx`
- Dung lượng tối đa: `10MB`
- Khuyến nghị mã hóa CSV: UTF-8
- Sheet Excel: hệ thống đọc sheet đầu tiên

### 9.2 Cột bắt buộc

| Cột | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `timestamp` | datetime | Thời điểm quan trắc, nên dùng ISO 8601 |
| `latitude` | số thực | Vĩ độ |
| `longitude` | số thực | Kinh độ |
| `salinity` | số thực | Độ mặn, không âm |

### 9.3 Cột tùy chọn

| Cột | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `station_id` | chuỗi | Mã trạm; nếu thiếu có thể được sinh tự động theo tọa độ |
| `station_name` | chuỗi | Tên trạm |
| `ph` | số thực | Khuyến nghị trong khoảng 0-14 |
| `dissolved_oxygen` | số thực | DO |
| `temperature` | số thực | Nhiệt độ, khuyến nghị trong khoảng -10 đến 50 |

### 9.4 Tên cột tương đương được hỗ trợ

Hệ thống có map một số tên cột phổ biến về chuẩn nội bộ.

- `timestamp`: `time`, `datetime`, `date_time`, `measured_at`
- `latitude`: `lat`
- `longitude`: `lon`, `lng`
- `station_id`: `stationid`, `station`
- `station_name`: `stationname`, `name`
- `dissolved_oxygen`: `dissolvedoxygen`, `do`
- `temperature`: `temp`

### 9.5 Ví dụ file CSV hợp lệ

```csv
timestamp,latitude,longitude,salinity,station_id,station_name,pH,dissolved_oxygen,temperature
2024-01-15T10:30:00Z,10.24,106.38,15.5,BT_001,Trạm BT_001 - Bến Tre,7.2,6.5,28.5
```

## 10. Khắc phục sự cố

### 10.1 Không truy cập được frontend hoặc backend

Triệu chứng:

- Không mở được `http://localhost:3000` hoặc `http://localhost:8000`

Cách xử lý:

1. Kiểm tra container:

```bash
docker-compose ps
```

2. Kiểm tra log:

```bash
docker-compose logs -f frontend
docker-compose logs -f backend
```

3. Kiểm tra xung đột cổng 3000, 8000, 5432, 5050.

### 10.2 API trả về 401 Unauthorized

Nguyên nhân thường gặp:

- Chưa gửi header `Authorization: Bearer <token>`
- Token hết hạn
- Token không hợp lệ

Cách xử lý:

- Đăng nhập lại để lấy token mới
- Dùng đúng chuẩn header Bearer

### 10.3 Upload thất bại

Nguyên nhân thường gặp:

- Sai định dạng tệp (không phải CSV/XLSX)
- Vượt giới hạn 10MB
- Thiếu cột bắt buộc `timestamp, latitude, longitude, salinity`
- Dữ liệu số không hợp lệ

Cách xử lý:

- Chuẩn hóa cột theo mục 9
- Kiểm tra kỹ từng dòng báo lỗi trong phản hồi API

### 10.4 PostgreSQL hoặc PostGIS lỗi khi khởi động

Cách xử lý:

- Kiểm tra biến môi trường DB trong `.env`
- Xem log service db:

```bash
docker-compose logs -f db
```

- Nếu dữ liệu cũ gây lỗi, cân nhắc reset volume:

```bash
docker-compose down -v
docker-compose up -d
```

### 10.5 Deploy Kubernetes lỗi do sai tên tài nguyên

Triệu chứng:

- `configmap not found`
- `secret not found`
- `persistentvolumeclaim not found`

Cách xử lý:

- Đồng bộ tên tài nguyên giữa các file trong `k8s/` theo mục 5.2.

### 10.6 Pod backend không healthy trên Kubernetes

Nguyên nhân:

- Probe đang gọi `/health` nhưng API hiện có `/api/health`

Cách xử lý:

- Sửa `livenessProbe` và `readinessProbe` trong `k8s/backend-deployment.yaml` sang `/api/health`.

### 10.7 Frontend Kubernetes không gọi được backend

Nguyên nhân:

- Thiếu `NEXT_PUBLIC_API_URL` trong ConfigMap

Cách xử lý:

- Bổ sung key `NEXT_PUBLIC_API_URL` vào ConfigMap, ví dụ:

```yaml
NEXT_PUBLIC_API_URL: "http://backend-service:8000"
```

### 10.8 ImagePullBackOff khi deploy K8s

Nguyên nhân:

- Image chưa push lên registry hoặc sai tên image

Cách xử lý:

- Build lại image
- Push lên registry
- Cập nhật `image:` trong manifest

---

Nếu cần kiểm thử nhanh API sau khi chạy, bạn có thể dùng trực tiếp Swagger tại `http://localhost:8000/docs` hoặc dùng các lệnh `curl` ở mục 7.3.
