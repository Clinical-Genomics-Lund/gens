###########
# BUILDER #
###########

FROM python:3.8.1-slim as builder

WORKDIR /usr/src/app

# Set build variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY . /usr/src/app
RUN apt-get update &&                                                     \
    apt-get upgrade -y &&                                                 \
    apt-get install -y --no-install-recommends python3-pip                \
    python3-wheel &&                                                      \
    pip install --no-cache-dir --upgrade pip &&                           \
    pip install --no-cache-dir gunicorn &&                                \
    pip wheel --no-cache-dir --no-deps --wheel-dir /usr/src/app/wheels    \
    --requirement requirements.txt


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
COPY --from=builder /usr/src/app/wheels /wheels
RUN apt-get update &&                              \
    apt-get install -y ssh sshfs &&                \
    pip install --no-cache-dir --upgrade pip &&    \
    pip install --no-cache-dir /wheels/* &&        \
    rm -rf /var/lib/apt/lists/*

# Chown all the files to the app user
COPY . /home/app/app
RUN chown -R app:app /home/app/app
# Change the user to app
USER app
ENTRYPOINT ["./entrypoint.sh"]
