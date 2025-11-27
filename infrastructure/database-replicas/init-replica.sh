#!/bin/bash
# Initialize PostgreSQL Replica for Streaming Replication
# This script runs on replica servers during first startup

set -e

PRIMARY_HOST="${PRIMARY_HOST:-postgres-primary}"
PRIMARY_PORT="${PRIMARY_PORT:-5432}"
REPLICATION_USER="${PGUSER:-replicator}"
REPLICATION_PASSWORD="${PGPASSWORD:-replicator_secret}"

# Determine replica name based on hostname
REPLICA_NAME=$(hostname | sed 's/postgres-//')
SLOT_NAME="${REPLICA_NAME}_slot"

echo "Initializing replica: $REPLICA_NAME"
echo "Primary host: $PRIMARY_HOST:$PRIMARY_PORT"
echo "Using replication slot: $SLOT_NAME"

# Wait for primary to be ready
until pg_isready -h $PRIMARY_HOST -p $PRIMARY_PORT -U $REPLICATION_USER
do
    echo "Waiting for primary to be ready..."
    sleep 2
done

# Stop PostgreSQL if running
pg_ctl -D /var/lib/postgresql/data stop -m fast || true

# Clear data directory
rm -rf /var/lib/postgresql/data/*

# Create base backup from primary
echo "Creating base backup from primary..."
PGPASSWORD=$REPLICATION_PASSWORD pg_basebackup \
    -h $PRIMARY_HOST \
    -p $PRIMARY_PORT \
    -U $REPLICATION_USER \
    -D /var/lib/postgresql/data \
    -Fp -Xs -P -R \
    -S $SLOT_NAME

# Configure as standby
cat >> /var/lib/postgresql/data/postgresql.auto.conf <<EOF

# Replica configuration
primary_conninfo = 'host=$PRIMARY_HOST port=$PRIMARY_PORT user=$REPLICATION_USER password=$REPLICATION_PASSWORD'
primary_slot_name = '$SLOT_NAME'
hot_standby = on
EOF

# Create standby signal file
touch /var/lib/postgresql/data/standby.signal

# Set permissions
chown -R postgres:postgres /var/lib/postgresql/data
chmod 700 /var/lib/postgresql/data

echo "Replica $REPLICA_NAME initialized successfully!"
