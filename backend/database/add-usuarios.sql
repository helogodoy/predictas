/* Predictas – Tabela de usuários + seed inicial (idempotente) */
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* senha = 12345678 (bcrypt / 10 rounds) */
INSERT INTO usuarios (nome, email, senha_hash)
VALUES ('Predictas', 'predictas@email.com', '$2a$10$VNGTgSmG5m5B7m3TluDqSe6lg0Ok4k7sC1Fz7AEp.7QOvGvIKcOuu')
ON DUPLICATE KEY UPDATE
  senha_hash = VALUES(senha_hash);
