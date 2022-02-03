FROM grafana/grafana:8.2.7-ubuntu

USER root

COPY . /app

RUN cp /app/docker/00_preferences /etc/apt/preferences.d/ && \
    curl -sL https://deb.nodesource.com/setup_14.x | bash - && \
    apt-get update && apt-get install -y nodejs && \
    npm -g install yarn

RUN chmod 777 /app/docker/run-build.sh

WORKDIR /plugin
VOLUME /plugin
USER grafana

ENTRYPOINT ["/app/docker/run-build.sh"]