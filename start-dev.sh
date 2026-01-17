#!/bin/bash
cd /home/sprite/r4-sync-tests
exec bun run dev --port 8080 --host 0.0.0.0
