##################
# BUILDER PYTHON #
##################

FROM python:3.11.3 as python-builder

# Set build variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /usr/src/app

RUN python -m venv /usr/app/venv
ENV PATH="/usr/app/venv/bin:$PATH"

COPY setup.py setup.cfg pyproject.toml ./
COPY app app/

RUN pip install --no-cache-dir --upgrade pip &&                 \
    pip install --no-cache-dir .

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

FROM python:3.11.3-slim

LABEL base_image="python:3.11.3-slim"
LABEL about.home="https://github.com/Clinical-Genomics-Lund/Gens"

# Run commands as non-root user
RUN useradd -m worker && mkdir -p /home/worker/app

# make mountpoints and change ownership of app
RUN mkdir -p /access /fs2/results /fs1/results_dev && chown -R worker:worker /home/worker/app /access /fs1

USER worker

# Copy pyhon wheels and install software
WORKDIR /usr/app
COPY --from=python-builder /usr/app/venv ./venv

ENV PATH="/usr/app/venv/bin:$PATH"

# Change the user to app
WORKDIR /home/worker/app

COPY app app

# copy compiled web assetes
COPY --from=node-builder /usr/src/app/build/css/error.min.css gens/static/css/
COPY --from=node-builder /usr/src/app/build/css/home.min.css /usr/src/app/build/css/about.min.css gens/blueprints/home/static/
COPY --from=node-builder /usr/src/app/build/*/gens.min.* gens/blueprints/gens/static/

CMD [ "gunicorn", "--bind", "0.0.0.0:5000", "app.app:create_app" ]