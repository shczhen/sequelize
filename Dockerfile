FROM node:16
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        default-libmysqlclient-dev \
        default-mysql-client \
        wget \
    && apt-get clean \
    && apt-get remove --purge --auto-remove -y \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/src/app

RUN wget https://go.dev/dl/go1.20.5.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.20.5.linux-amd64.tar.gz \
    && rm -rf go1.20.5.darwin-arm64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

COPY ./package.json /usr/src/app
RUN cd /usr/src/app && npm install

ARG user=jenkins
ARG group=jenkins
ARG uid=1000
ARG gid=1000

ENV HOME /home/${user}
RUN groupadd -g ${gid} ${group} \
  && useradd -d "/home/${user}" -u ${uid} -g ${gid} -m -s /bin/bash ${user}

RUN mkdir -p /home/jenkins/

USER ${user}
WORKDIR /home/${user}