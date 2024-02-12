from authlib.integrations.flask_client import OAuth

from flask_login import LoginManager

login_manager = LoginManager()
oauth_client = OAuth()
