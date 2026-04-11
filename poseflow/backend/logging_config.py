"""
Конфигурация логирования для PoseFlow Backend
Создает раздельные логи для:
- основного приложения (backend.log)
- ошибок (backend_error.log)
- экспорта (backend_export.log)
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

# Базовая директория для логов
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Формат сообщений
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
LOG_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# Размеры ротации (10 МБ максимум на файл)
MAX_BYTES = 10 * 1024 * 1024
BACKUP_COUNT = 3


def setup_logger(
    name: str,
    log_file: str,
    level: int = logging.INFO,
    console: bool = True
) -> logging.Logger:
    """
    Настроить логгер с файловой записью и опциональной консолью
    
    Args:
        name: Имя логгера
        log_file: Имя файла лога
        level: Уровень логирования
        console: Выводить ли в консоль
    
    Returns:
        Настроенный логгер
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Очищаем старые хендлеры
    logger.handlers.clear()

    # Форматтер
    formatter = logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT)

    # Файловый хендлер с ротацией
    file_handler = RotatingFileHandler(
        LOG_DIR / log_file,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Консольный хендлер
    if console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger


# Основной логгер приложения
app_logger = setup_logger('poseflow.backend', 'backend.log')

# Логгер для ошибок
error_logger = setup_logger('poseflow.backend.errors', 'backend_error.log', level=logging.ERROR)

# Логгер для экспорта
export_logger = setup_logger('poseflow.backend.export', 'backend_export.log')

# Логгер для pose сервиса
pose_logger = setup_logger('poseflow.backend.pose', 'backend_pose.log')


def get_logger(name: str) -> logging.Logger:
    """Получить логгер по имени"""
    return setup_logger(f'poseflow.backend.{name}', f'{name}.log')
