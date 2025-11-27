#!/bin/bash
# Initialize PostgreSQL Primary for Replication
# This script runs on the primary server during first startup

set -e

REPLICATION_USER="${POSTGRES_REPLICATION_USER:-replicator}"
REPLICATION_PASSWORD="${POSTGRES_REPLICATION_PASSWORD:-replicator_secret}"

echo "Configuring primary server for replication..."

# Create replication user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create replication user with necessary permissions
    CREATE USER $REPLICATION_USER WITH REPLICATION ENCRYPTED PASSWORD '$REPLICATION_PASSWORD';

    -- Create archive directory
    -- Note: In production, use a network-accessible storage
EOSQL

# Create archive directory for WAL files
mkdir -p /var/lib/postgresql/archive
chown postgres:postgres /var/lib/postgresql/archive

# Create replication slots for each replica
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create physical replication slots (prevents WAL removal before replicas catch up)
    SELECT pg_create_physical_replication_slot('replica1_slot');
    SELECT pg_create_physical_replication_slot('replica2_slot');
EOSQL

echo "Primary server configured for replication successfully!"
