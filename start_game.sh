#!/bin/bash
# His Majesty Game Launcher
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PORT=8080
# Check if port 8080 is busy, otherwise increment
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; do
    PORT=$((PORT+1))
done

echo "=========================================="
echo "  👑 HIS MAJESTY - The Divine Procession 👑"
echo "=========================================="
echo "Starting local game server on port $PORT..."
echo "Opening your default browser..."

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:$PORT"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://localhost:$PORT" || sensible-browser "http://localhost:$PORT"
fi

# Run Python HTTP Server
python3 -m http.server $PORT
