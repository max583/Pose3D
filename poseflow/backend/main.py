from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import base64
from io import BytesIO

from services.export_service import export_service
from services.pose_service import pose_service
from logging_config import app_logger as logger, error_logger

app = FastAPI(title="PoseFlow Backend", version="0.2.0")

# CORS для локального доступа
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели данных
class PoseData(BaseModel):
    """Модель данных позы"""
    keypoints: Optional[Dict[str, Any]] = None
    format: Optional[str] = "openpose"
    
class ExportRequest(BaseModel):
    """Запрос на экспорт"""
    pose_data: Dict[str, Any]
    export_format: str = "json"  # json, png
    resolution: Optional[int] = 512


@app.get("/")
async def root():
    """Корневой эндпоинт"""
    logger.info("Root endpoint accessed")
    return {
        "message": "PoseFlow Backend API",
        "version": "0.2.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Проверка работоспособности"""
    logger.info("Health check endpoint")
    return {
        "status": "healthy",
        "service": "PoseFlow Backend"
    }


@app.post("/pose/export")
async def export_pose(request: ExportRequest):
    """Экспорт позы в указанном формате"""
    logger.info(f"Export request: format={request.export_format}")
    
    try:
        if request.export_format == "json":
            # Экспорт в OpenPose JSON
            result = export_service.export_to_openpose_json(
                request.pose_data,
                request.resolution
            )
            return {
                "status": "success",
                "format": "json",
                "data": result
            }
        
        elif request.export_format == "png":
            # Экспорт в PNG
            img = export_service.export_to_openpose_png(
                request.pose_data,
                request.resolution
            )
            
            # Конвертируем в base64
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
            
            return {
                "status": "success",
                "format": "png",
                "data": f"data:image/png;base64,{img_base64}"
            }
        
        else:
            return {
                "status": "error",
                "message": f"Unsupported format: {request.export_format}"
            }
    
    except Exception as e:
        error_logger.error(f"Export error: {e}", exc_info=True)
        return {
            "status": "error",
            "message": str(e)
        }


@app.post("/log/test")
async def test_log(message: Dict[str, str]):
    """Тестовый эндпоинт для логирования"""
    log_message = message.get("message", "No message")
    logger.info(f"[Test Log from React] {log_message}")
    return {
        "status": "ok",
        "message": "Logged successfully"
    }


if __name__ == "__main__":
    import uvicorn
    logger.info("=" * 60)
    logger.info("Starting PoseFlow Backend on http://127.0.0.1:8000")
    logger.info("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8000)
