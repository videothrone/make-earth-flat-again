DROP TABLE IF EXISTS signatures CASCADE;

CREATE TABLE signatures (
    id SERIAL primary key,
    signature TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL primary key,
    first VARCHAR(255) NOT NULL,
    last VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
    id SERIAL primary key,
    age INTEGER,
    city VARCHAR(100),
    url VARCHAR(300),
    user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE
);
