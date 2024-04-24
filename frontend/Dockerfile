##################
# BUILDER PYTHON #
##################

FROM python:3.8.1-slim as python-builder

# Set build variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /usr/src/app
COPY MANIFEST.in setup.py setup.cfg requirements.txt ./
COPY app app/
RUN apt-get update &&                                                     \
    apt-get upgrade -y &&                                                 \
    apt-get install -y --no-install-recommends python3-pip                \
    python3-wheel &&                                                      \
    pip install --no-cache-dir --upgrade pip &&                           \
    pip install --no-cache-dir gunicorn &&                                \
    pip wheel --no-cache-dir --no-deps --wheel-dir /usr/src/app/wheels    \
    --requirement requirements.txt

################
# BUILDER NODE #
################

FROM node:20.8.1-alpine as node-builder
WORKDIR /usr/src/app
COPY package.json package-lock.json webpack.config.js gulpfile.js ./
COPY assets assets
RUN npm install && npm run build

#########
# FINAL #
#########

FROM python:3.8.1-slim

LABEL base_image="python:3.8.1-slim"
LABEL about.home="https://github.com/Clinical-Genomics-Lund/Gens"

# Run commands as non-root user
RUN useradd -m app && mkdir -p /home/app/app
WORKDIR /home/app/app

# Copy pyhon wheels and install software
COPY --from=python-builder /usr/src/app/wheels /wheels
RUN apt-get update &&                              \
    apt-get install -y ssh sshfs &&                \
    pip install --no-cache-dir --upgrade pip &&    \
    pip install --no-cache-dir /wheels/* &&        \
    rm -rf /var/lib/apt/lists/* &&                 \
    rm -rf /wheels

# Chown all the files to the app user
COPY app app

# copy compiled web assetes
COPY --from=node-builder /usr/src/app/build/css/error.min.css gens/static/css/
COPY --from=node-builder /usr/src/app/build/css/home.min.css /usr/src/app/build/css/about.min.css gens/blueprints/home/static/
COPY --from=node-builder /usr/src/app/build/*/gens.min.* gens/blueprints/gens/static/

# make mountpoints and change ownership of app
RUN mkdir -p /access /fs1/results /fs1/results_dev && chown -R app:app /home/app/app /access /fs1
# Change the user to app
USER app
