"""Retrieve users from scout db"""
from flask_login import UserMixin

from flask import current_app as app

from typing import Optional

class LoginUser(UserMixin):
    def __init__(self, user_data):
        """Create a new user object."""
        self.roles = []
        for key, value in user_data.items():
            setattr(self, key, value)

    def get_id(self):
        return self.email

    @property
    def is_admin(self):
        """Check if the user is admin."""
        return "admin" in self.roles


def user(email: str) -> Optional[LoginUser]:
    db = app.config["SCOUT_DB"]

    query = {}
    query["email"] = email

    user_dict = db.user.find_one(query)
    user_obj = LoginUser(user_dict) if user_dict else None

    return user_obj
