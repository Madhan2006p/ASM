from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'fallback-insecure-key')

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_celery_results',
    'django_celery_beat',
    'rest_framework_simplejwt.token_blacklist',
    # Local apps
    'authentication',
    'targets',
    'scans',
    'fuzzing',
    'vulnerabilities',
    'apk_scanner',
    'reconnaissance',
    'attacksurface',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ─── Database ─────────────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': BASE_DIR / os.getenv('DB_NAME', 'db.sqlite3'),
    }
}

# ─── REST Framework ───────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 500,
}

# ─── JWT ──────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# ─── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True

# ─── Celery ───────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'django-cache'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Kolkata'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ─── Scan tool paths (configure to actual paths) ──────────────────────────────
DIRSEARCH_PATH = 'dirsearch'
ARJUN_PATH = 'arjun'
NUCLEI_PATH = 'nuclei'
NMAP_PATH = 'nmap'
TESTSSL_PATH = 'testssl.sh'
HTTPX_PATH = 'httpx'
INQL_PATH = 'inql'
GAU_PATH = 'gau'
WAYBACKURLS_PATH = 'waybackurls'
GRPCURL_PATH = 'grpcurl'
# Reconnaissance / subdomain discovery tools
SUBFINDER_PATH = os.getenv('SUBFINDER_PATH', 'subfinder')
ASSETFINDER_PATH = os.getenv('ASSETFINDER_PATH', 'assetfinder')
FINDOMAIN_PATH = os.getenv('FINDOMAIN_PATH', 'findomain')
NAABU_PATH = os.getenv('NAABU_PATH', 'naabu')
SCAN_OUTPUT_DIR = BASE_DIR / 'scan_outputs'
SCAN_OUTPUT_DIR.mkdir(exist_ok=True)

# ─── Alerts ────────────────────────────────────────────────────────────────────
ALERT_EMAIL_ENABLED = os.getenv('ALERT_EMAIL_ENABLED', 'False').lower() == 'true'
ALERT_EMAIL_HOST = os.getenv('ALERT_EMAIL_HOST', 'smtp.gmail.com')
ALERT_EMAIL_PORT = int(os.getenv('ALERT_EMAIL_PORT', '587'))
ALERT_EMAIL_USER = os.getenv('ALERT_EMAIL_USER', '')
ALERT_EMAIL_PASSWORD = os.getenv('ALERT_EMAIL_PASSWORD', '')
ALERT_EMAIL_FROM = os.getenv('ALERT_EMAIL_FROM', 'asmm@localhost')
ALERT_EMAIL_TO = os.getenv('ALERT_EMAIL_TO', 'admin@localhost').split(',')
ALERT_SEVERITY_THRESHOLD = 'HIGH'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

