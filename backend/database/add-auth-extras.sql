-- 1) papel do usuário (admin x cliente)
ALTER TABLE usuarios
  ADD COLUMN role ENUM('admin','cliente') NOT NULL DEFAULT 'cliente';

-- torna o usuário seed um admin (ajuste o e-mail se usar outro)
UPDATE usuarios SET role='admin' WHERE email='predictas@email.com';

-- 2) tokens de reset de senha
CREATE TABLE IF NOT EXISTS password_resets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token (token),
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
