#!/bin/bash
# Runs server/test/supabase.test.js against a LOCAL Postgres + PostgREST (the same pieces Supabase is built from).
# Linux only. Needs: postgresql installed (apt install postgresql), the PostgREST binary (github.com/PostgREST/postgrest/releases),
# and root (it uses `su postgres`). Set POSTGREST=/path/to/postgrest.  Alternative: `supabase start` (Docker) and set the three
# SUPABASE_TEST_* variables yourself (see test/supabase.test.js).
set -u
PGV=$(ls /usr/lib/postgresql | head -1); BIN=/usr/lib/postgresql/$PGV/bin
D=/tmp/pgdata; su postgres -c "$BIN/pg_ctl -D $D -m immediate stop" >/dev/null 2>&1; rm -rf $D; mkdir -p $D; chown postgres:postgres $D
su postgres -c "$BIN/initdb -D $D -A trust >/dev/null" || { echo "initdb failed"; exit 1; }
su postgres -c "$BIN/pg_ctl -D $D -o '-p 54329 -k /tmp' -l /tmp/pg.log -w start >/dev/null" || { echo "pg start failed"; tail -5 /tmp/pg.log; exit 1; }
PSQL="su postgres -c \"psql -h /tmp -p 54329 -v ON_ERROR_STOP=1 -q"
su postgres -c "psql -h /tmp -p 54329 -q -c \"create role authenticator login password 'pw' noinherit; create role anon nologin; create role service_role nologin bypassrls; grant anon, service_role to authenticator;\"" || exit 1
su postgres -c "psql -h /tmp -p 54329 -q -c \"create database coach;\"" || exit 1
su postgres -c "psql -h /tmp -p 54329 -d coach -v ON_ERROR_STOP=1 -q -f $(cd "$(dirname "$0")/../.." && pwd)/supabase/migrations/001_init.sql" || { echo "MIGRATION FAILED"; exit 1; }
# same default privileges Supabase gives its roles (RLS then decides what is visible)
su postgres -c "psql -h /tmp -p 54329 -d coach -q -c \"grant usage on schema public to anon, service_role; grant all on all tables in schema public to anon, service_role; grant all on all sequences in schema public to anon, service_role;\""
SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
cat > /tmp/pgrst.conf <<CONF
db-uri = "postgres://authenticator:pw@127.0.0.1:54329/coach"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = 3300
CONF
setsid ${POSTGREST:-/tmp/postgrest} /tmp/pgrst.conf </dev/null >/tmp/pgrst.log 2>&1 & PR=$!
setsid node $(cd "$(dirname "$0")/../.." && pwd)/test/support/rest-proxy.mjs 3301 3300 </dev/null >/dev/null 2>&1 & PX=$!
for i in $(seq 1 20); do curl -s -m 1 -o /dev/null localhost:3300/ && break; sleep 0.5; done
cd $(cd "$(dirname "$0")/../.." && pwd)
KEYS=$(SECRET=$SECRET node --input-type=module -e "import {SignJWT} from 'jose'; const k=new TextEncoder().encode(process.env.SECRET); const mk=(r)=>new SignJWT({role:r}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(k); console.log(await mk('service_role'), await mk('anon'))")
export SUPABASE_TEST_SERVICE_KEY=${KEYS% *} SUPABASE_TEST_ANON_KEY=${KEYS#* } SUPABASE_TEST_URL=http://127.0.0.1:3301
timeout 150 node --test --test-reporter=spec test/supabase.test.js 2>&1 | grep -E "^(✔|✖)|ℹ (pass|fail)|Error|expected|actual|message" | cut -c1-200 | head -40
kill $PR $PX 2>/dev/null; su postgres -c "$BIN/pg_ctl -D $D -m immediate stop >/dev/null" 2>/dev/null; echo "infra stopped"
