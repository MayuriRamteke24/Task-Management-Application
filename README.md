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

## Tests

npm test

## Project structure

- server.js — backend API and database setup
- public/ — frontend assets
- tests/app.test.js — API verification tests
