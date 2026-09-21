FROM jenkins/jenkins:lts-jdk17

USER root

# CLI Docker uniquement (pas le daemon) : les pipelines lancent "docker
# build/push" en réutilisant le daemon Docker Desktop de l'hôte via le socket
# monté (voir docker-compose.yml, pattern "Docker outside of Docker" — le
# conteneur Jenkins ne fait pas tourner Docker lui-même, il pilote celui de
# l'hôte comme le ferait n'importe quel client Docker).
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
      > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

USER jenkins

# Plugins préinstallés à l'image : évite l'écran "choisir des plugins" au
# premier démarrage. L'assistant "unlock" (mot de passe admin) et la création
# du compte admin restent à faire une fois dans l'UI — voir RECOVERY.md.
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
