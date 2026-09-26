# Task Management Application

A full-stack task management app for creating, organizing, and tracking daily work with login-based access control.

## Features

- Login and registration tabs
- Default demo account for quick access
- Create, update, delete, and complete tasks
- Task priority, due date, and status tracking
- Filter tasks by all, pending, and completed categories
- Real-time updates using Server-Sent Events
- Responsive interface for desktop and mobile screens

## Default login

Use the built-in demo account to log in immediately:

- Email: admin@taskmanager.com
- Password: admin123

## Tech Stack

- Node.js
- Express
- SQLite
- JWT
- Vanilla JavaScript

## Run locally

1. Install dependencies:
   npm install
2. Start the app:
   npm start
3. Open the browser:
   http://localhost:3000

## GitHub Pages support

This repository includes a static GitHub Pages version in the docs folder for deployment.

- Local backend app: Node.js + Express + SQLite
- Static Pages version: docs/ with browser-based localStorage persistence
- Deployment workflow: .github/workflows/pages.yml

To publish on GitHub Pages:
1. Push the repository to GitHub
2. Open Settings > Pages in the GitHub repo
3. Select GitHub Actions as the source
4. The workflow will deploy the app from the docs folder automatically

## Tests

Run:

npm test

## Project structure

- server.js — backend API and database setup
- public/ — local frontend for the Express app
- docs/ — static GitHub Pages version
- .github/workflows/pages.yml — deployment workflow
- tests/app.test.js — backend flow verification
