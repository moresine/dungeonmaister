# Dungeon Maister Quickstart

This guide will help you get the development environment running for both the frontend and backend.

## Prerequisites

- Python 3.12 or later
- Node.js and npm

## Backend Setup

The backend is a Python application.

1.  **Navigate to the project root directory:**
    ```bash
    cd /path/to/dungeonmaister
    ```

2.  **Activate the Python virtual environment.**

    On macOS/Linux:
    ```bash
    source server/venv/bin/activate
    ```

    On Windows (using PowerShell):
    ```powershell
    .\server\venv\bin\Activate.ps1
    ```
    Your command prompt should now be prefixed with `(venv)`.

3.  **Run the backend server.**
    You will need to find the main application file inside the `server/` directory (e.g., `app.py`, `main.py`) and run it.

    For example:
    ```bash
    python server/app.py
    ```

    The backend server should now be running.

## Frontend Setup

The frontend is a Node.js application.

1.  **Navigate to the project root directory:**
    ```bash
    cd /path/to/dungeonmaister
    ```

2.  **Install dependencies.**
    This will install all the necessary packages defined in `package.json`.
    ```bash
    npm install
    ```

3.  **Start the frontend development server.**
    This command is usually defined in the `scripts` section of your `package.json`.
    ```bash
    npm start
    ```
    This will typically open the application in your default web browser.