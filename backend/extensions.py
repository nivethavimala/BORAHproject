from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

db_orm = SQLAlchemy()
cors = CORS()
jwt_manager = JWTManager()
