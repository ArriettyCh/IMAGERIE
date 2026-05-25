-- Database initialization script.
-- Docker Compose runs this script automatically when the MySQL volume is created.

CREATE DATABASE IF NOT EXISTS image_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE image_manager;

-- Prisma manages the application tables; this script only creates the database.

