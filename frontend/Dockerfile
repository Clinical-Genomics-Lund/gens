################
# BUILDER NODE #
################

FROM node:20.8.1-alpine as node-builder
WORKDIR /usr/src/app
COPY package.json package-lock.json webpack.config.js gulpfile.js ./
COPY assets assets
RUN npm install && npm run build

##################
# BUILDER PYTHON #
##################

FROM python:3.11.3 as python-builder

# Set build variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /usr/src/app

COPY pyproject.toml ./
COPY app app/

# copy compiled web assetes
COPY --from=node-builder /usr/src/app/build/css/error.min.css app/static/css/
COPY --from=node-builder /usr/src/app/build/css/home.min.css /usr/src/app/build/css/about.min.css app/blueprints/home/static/
COPY --from=node-builder /usr/src/app/build/*/gens.min.* app/blueprints/gens/static/

# build frontend wheel
RUN pip install --no-cache-dir --upgrade pip &&                 \
    pip wheel --no-cache-dir --wheel-dir /usr/src/app/wheels .

#########
# FINAL #
#########

FROM python:3.11.3-slim

LABEL base_image="python:3.11.3-slim"
LABEL about.home="https://github.com/Clinical-Genomics-Lund/Gens"

# Run commands as non-root user
RUN useradd -m worker && mkdir -p /home/worker/app

# Change the user to app
WORKDIR /home/worker

# copy application folder
COPY --chown=worker:worker app app

# copy wheels
COPY --from=python-builder /usr/src/app/wheels /wheels
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir /wheels/* &&     \ 
    rm -rf /wheels &&                           \
    rm -rf /var/lib/apt/lists/*

# make mountpoints and change ownership of app
RUN mkdir -p /access /fs2/results /fs1/results_dev && chown -R worker:worker /home/worker/app /access /fs1

# use non-root user
USER worker

CMD [ "gunicorn", "--bind", "0.0.0.0:5000", "app.app:create_app" ]
