"""
Pose Service - работа со скелетом BODY_25
"""
import sys
from pathlib import Path

# Добавляем родительскую директорию в путь для импорта logging_config
sys.path.insert(0, str(Path(__file__).parent.parent))
from logging_config import pose_logger as logger

# BODY_25 keypoints
BODY_25_KEYPOINTS = [
    "nose", "neck", "right_shoulder", "right_elbow", "right_wrist",
    "left_shoulder", "left_elbow", "left_wrist", "right_hip",
    "right_knee", "right_ankle", "left_hip", "left_knee", "left_ankle",
    "right_eye", "left_eye", "right_ear", "left_ear", "left_big_toe",
    "left_small_toe", "left_heel", "right_big_toe", "right_small_toe",
    "right_heel", "background"
]

class PoseService:
    """Сервис для работы с позами"""
    
    def __init__(self):
        self.keypoints = BODY_25_KEYPOINTS
        logger.info("PoseService initialized with BODY_25 keypoints")
    
    def get_keypoints(self):
        """Получить список ключевых точек"""
        return self.keypoints
    
    def validate_pose(self, pose_data: dict) -> bool:
        """Валидировать данные позы"""
        if not pose_data:
            return False
        
        # Простая валидация
        if "keypoints" not in pose_data:
            return False
        
        return True
    
    def create_default_pose(self) -> dict:
        """Создать позу по умолчанию (T-pose)"""
        return {
            "keypoints": {kp: {"x": 0, "y": 0, "z": 0, "confidence": 0} for kp in self.keypoints},
            "format": "openpose"
        }


# Singleton
pose_service = PoseService()
