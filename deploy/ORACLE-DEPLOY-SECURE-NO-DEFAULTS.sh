#!/bin/bash
set -e
echo "Secure Oracle deploy - no default secrets"
if [ -f .env ]; then
  if grep -q "VaultDms_Oracle_2024_Strong\|ChangeThis\|your-32-char-secret\|StrongPassword" .env; then
    echo "FAIL: .env still contains placeholder/default passwords"
    echo "Set strong unique passwords: openssl rand -base64 24"
    exit 1
  fi
fi
: "${DB_PASSWORD:?DB_PASSWORD required min 16 chars - set in .env}"
: "${REDIS_PASSWORD:?REDIS_PASSWORD required}"
: "${JWT_SECRET:?JWT_SECRET min 32 chars required}"
if [ ${#DB_PASSWORD} -lt 16 ]; then echo "DB_PASSWORD too weak"; exit 1; fi
if [ ${#JWT_SECRET} -lt 32 ]; then echo "JWT_SECRET too weak"; exit 1; fi
echo "Secrets OK - deploying with secure compose (expose, read_only, no-new-privileges)"
echo "WARNING: Do NOT expose 3000/3001 directly via iptables - use nginx reverse proxy for TLS only"
docker-compose -f docker-compose.production.fixed.yml up -d --build
