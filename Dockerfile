FROM python:3.8-slim

LABEL base_image="python:3.8-slim"
LABEL about.home="https://github.com/Clinical-Genomics-Lund/Gens"
LABEL about.license="MIT License (MIT)"

# Run commands as non-root user
RUN useradd -ms /bin/bash worker
RUN chown worker:worker -R /home/worker

WORKDIR /home/worker/app
COPY . /home/worker/app

RUN apt-get update &&                                   \
    apt-get upgrade -y &&                               \
    # Install required libs                             \
    apt-get install -y python3-pip python3-wheel &&     \
    # Install Gens                                      \
    pip install --no-cache-dir --upgrade pip            \
    pip install --no-cache-dir -r requirements.txt &&   \
    # clean up                                          \
    rm -rf /var/lib/apt/lists/*

USER worker

ENV FLASK_APP gens.py

EXPOSE 5000
