#!/bin/bash
# Runs once, automatically, the first time the instance boots.
# Purpose: get Docker installed and ready so the box is deploy-ready

set -euxo pipefail

apt-get update -y
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \ "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Let's the ubuntu user run docker commands without sudo
usermod -aG docker ubuntu

mkdir -p /home/ubuntu/app
chown ubuntu:ubuntu /home/ubuntu/app

# Marker file so you can confirm bootstrap completed successfully
echo "bootstrap complete: $(date)" > /home/ubuntu/bootstrap-done.txt