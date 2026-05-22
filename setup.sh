#!/bin/bash
set -e

echo "Installing backend dependencies..."
cd backend && npm install && cd ..

echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo ""
echo "Setup complete! To run the app:"
echo ""
echo "  Terminal 1 (backend):  cd crm-app/backend && npm run dev"
echo "  Terminal 2 (frontend): cd crm-app/frontend && npm run dev"
echo ""
echo "Then open http://localhost:5173"
