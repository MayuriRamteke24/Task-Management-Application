# Task Management Application

A full-stack task management app for creating, organizing, and tracking tasks with login-based access control.

## Features

- User registration and login using JWT authentication
- Create, read, update, and delete tasks
- Track task status, priority, and due dates
- Filter tasks by all, pending, and completed states
- Real-time updates using Server-Sent Events
- Responsive web layout for desktop and mobile screens

## Tech Stack

- Node.js
- Express
- SQLite
- JWT
- Vanilla JavaScript frontend

## Run locally

1. Install dependencies:
   npm install
2. Start the application:
   npm start
3. Open:
   http://localhost:3000

## GitHub Pages support

This repository now includes a static Pages-ready version under the docs folder.

- Full backend app: runs locally with Node.js and Express
- GitHub Pages version: static frontend in docs/ using localStorage for task persistence
- Deployment workflow: .github/workflows/pages.yml

To publish on GitHub Pages:
1. Push this repository to GitHub
2. In GitHub, open Settings > Pages
3. Select GitHub Actions as the source
4. The workflow in .github/workflows/pages.yml will deploy the app from docs/

## Tests

npm test

## Project structure

- server.js — backend API and database setup
- public/ — frontend assets for local Node app
- docs/ — static GitHub Pages version
- .github/workflows/pages.yml — Pages deployment workflow
- tests/app.test.js — API verification tests
