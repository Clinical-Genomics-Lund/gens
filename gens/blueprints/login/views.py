import logging

from flask import Blueprint, current_app, render_template, request

from flask_login import login_user, logout_user

from gens.extensions import login_manager, oauth_client

from . import controllers


home_bp = Blueprint(
    "login",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/login/static",
)

login_manager.login_view = "login.login"
login_manager.login_message = "Please log in to access this page."
login_manager.login_message_category = "info"

@login_bp.route("/login", methods=["GET", "POST"])
@public_endpoint
def login():
    if "next" in request.args:
        session["next_url"] = request.args["next"]

    if current_app.config.get("GOOGLE"):
        if session.get("email"):
            user_mail = session["email"]
            session.pop("email", None)
        else:
            LOG.info("Google Login!")
            redirect_uri = url_for(".authorized", _external=True)
            try:
                return oauth_client.google.authorize_redirect(redirect_uri)
            except Exception as ex:
                flash("An error has occurred while logging user in using Google OAuth")



@login_bp.route("/authorized")
@public_endpoint
def authorized():
    """Google auth callback function"""
    token = oauth_client.google.authorize_access_token()
    google_user = oauth_client.google.parse_id_token(token, None)
    session["email"] = google_user.get("email").lower()
    session["name"] = google_user.get("name")
    session["locale"] = google_user.get("locale")

    return redirect(url_for(".login"))

@login_bp.route("/logout")
def logout():
    logout_user()
    session.pop("email", None)
    session.pop("name", None)
    session.pop("locale", None)
    flash("You have been logged out", "success")
    return redirect(url_for("public.index"))


def perform_login(user_dict):
    if login_user(user_dict, remember=True):
        flash("you logged in as: {}".format(user_dict.name), "success")
        next_url = session.pop("next_url", None)
        return redirect(request.args.get("next") or next_url or url_for("cases.index"))
    flash("Sorry, you were not logged in", "warning")
    return redirect(url_for("public.index"))


