"""
Export Service - экспорт поз в различных форматах OpenPose
"""
import json
import sys
from pathlib import Path
from typing import Dict, Any, List
from PIL import Image, ImageDraw
import numpy as np

# Добавляем родительскую директорию в путь для импорта logging_config
sys.path.insert(0, str(Path(__file__).parent.parent))
from logging_config import export_logger as logger, error_logger

# BODY_25 соединения для рендеринга
BODY25_CONNECTIONS = [
    # Торс
    (1, 8, '#ff4444'),   # neck -> mid_hip
    (8, 9, '#ff4444'),   # mid_hip -> right_hip
    (8, 12, '#ff4444'),  # mid_hip -> left_hip
    (1, 2, '#ff4444'),   # neck -> right_shoulder
    (1, 5, '#ff4444'),   # neck -> left_shoulder
    
    # Руки
    (2, 3, '#4488ff'),   # right_shoulder -> right_elbow
    (3, 4, '#4488ff'),   # right_elbow -> right_wrist
    (5, 6, '#4488ff'),   # left_shoulder -> left_elbow
    (6, 7, '#4488ff'),   # left_elbow -> left_wrist
    
    # Ноги
    (9, 10, '#44cc44'),  # right_hip -> right_knee
    (10, 11, '#44cc44'), # right_knee -> right_ankle
    (12, 13, '#44cc44'), # left_hip -> left_knee
    (13, 14, '#44cc44'), # left_knee -> left_ankle
    
    # Голова
    (1, 0, '#ffcc00'),   # neck -> nose
    (0, 15, '#ffcc00'),  # nose -> right_eye
    (0, 16, '#ffcc00'),  # nose -> left_eye
    (15, 17, '#ffcc00'), # right_eye -> right_ear
    (16, 18, '#ffcc00'), # left_eye -> left_ear
    
    # Стопы
    (11, 21, '#ff8800'), # right_ankle -> right_heel
    (11, 22, '#ff8800'), # right_ankle -> right_big_toe
    (11, 23, '#ff8800'), # right_ankle -> right_small_toe
    (14, 19, '#ff8800'), # left_ankle -> left_big_toe
    (14, 20, '#ff8800'), # left_ankle -> left_small_toe
    (14, 21, '#ff8800'), # left_ankle -> left_heel
]


class ExportService:
    """Сервис для экспорта поз в форматах OpenPose"""
    
    def __init__(self):
        logger.info("ExportService initialized")
    
    def export_to_openpose_json(self, pose_data: Dict[str, Any], resolution: int = 512) -> Dict[str, Any]:
        """
        Экспорт в OpenPose JSON формат для ControlNet
        Формат: {version: 1.3, people: [{pose_keypoints_2d: [x0,y0,c0, ...]}]}
        """
        logger.info(f"Exporting to OpenPose JSON, resolution: {resolution}")
        
        # Конвертируем 3D координаты в 2D
        keypoints_2d = []
        
        for i in range(25):
            joint = pose_data.get(str(i), {})
            if not joint:
                keypoints_2d.extend([0, 0, 0])
                continue
            
            # Масштабируем к разрешению и центрируем
            x = (joint.get('x', 0) + 1) * 0.5 * resolution
            y = (1 - (joint.get('y', 0) / 2)) * resolution
            confidence = joint.get('confidence', 1)
            
            keypoints_2d.extend([
                round(x, 2),
                round(y, 2),
                confidence
            ])
        
        result = {
            "version": 1.3,
            "people": [{
                "pose_keypoints_2d": keypoints_2d
            }]
        }
        
        return result
    
    def export_to_openpose_png(
        self,
        pose_data: Dict[str, Any],
        resolution: int = 512,
        output_path: str = None
    ) -> Image.Image:
        """
        Экспорт в PNG (рендеринг скелета)
        Чёрный фон, цветные точки и линии
        """
        logger.info(f"Exporting to PNG, resolution: {resolution}")
        
        # Создаём изображение
        img = Image.new('RGB', (resolution, resolution), color='black')
        draw = ImageDraw.Draw(img)
        
        # Функция для конвертации 3D в 2D
        def to_2d(joint: Dict[str, float]) -> tuple:
            x = (joint.get('x', 0) + 1) * 0.5 * resolution
            y = (1 - (joint.get('y', 0) / 2)) * resolution
            return (x, y)
        
        # Рисуем линии (кости)
        line_width = max(2, resolution // 256)

        for from_idx, to_idx, color in BODY25_CONNECTIONS:
            from_joint = pose_data.get(str(from_idx))
            to_joint = pose_data.get(str(to_idx))

            if not from_joint or not to_joint:
                logger.debug(f"Skipping bone {from_idx}->{to_idx}: joint data missing")
                continue

            x1, y1 = to_2d(from_joint)
            x2, y2 = to_2d(to_joint)

            draw.line(
                [(x1, y1), (x2, y2)],
                fill=color,
                width=line_width
            )
        
        # Рисуем точки (суставы)
        joint_radius = max(3, resolution // 128)
        
        for i in range(25):
            joint = pose_data.get(str(i))
            if not joint:
                continue
            
            x, y = to_2d(joint)
            
            # Рисуем белый круг для видимости
            bbox = [
                x - joint_radius,
                y - joint_radius,
                x + joint_radius,
                y + joint_radius
            ]
            draw.ellipse(bbox, fill='white')
        
        if output_path:
            img.save(output_path, 'PNG')
            logger.info(f"Saved PNG to {output_path}")
        
        return img
    
    def save_json_to_file(self, data: Dict[str, Any], output_path: str) -> None:
        """Сохранить JSON в файл"""
        try:
            Path(output_path).write_text(json.dumps(data, indent=2))
            logger.info(f"Saved JSON to {output_path}")
        except Exception as e:
            error_logger.error(f"Failed to save JSON to {output_path}: {e}", exc_info=True)
            raise


# Singleton
export_service = ExportService()
