FROM python:3.11.3-slim

# Set build variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1


# Create non-root user to run commands
RUN groupadd --gid 1000 worker && useradd -g worker --uid 1000 --shell /user/sbin/nologin --create-home worker

# copy project dir
WORKDIR /home/worker/app
COPY --chown=worker:worker app app/
COPY --chown=worker:worker pyproject.toml ./

# install dependancies
RUN pip install --no-cache-dir --editable .

# run app as non-root user
USER worker