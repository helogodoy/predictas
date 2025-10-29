/* Predictas – Schema base (Railway friendly, sem DELIMITER/SET e SEM trigger aqui) */

-- 1) EMPRESAS
CREATE TABLE IF NOT EXISTS empresas (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  responsavel VARCHAR(120),
  telefone VARCHAR(20),
  email VARCHAR(160),
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_empresas_nome ON empresas (nome);
CREATE INDEX idx_empresas_responsavel ON empresas (responsavel);

-- 2) DISPOSITIVOS
CREATE TABLE IF NOT EXISTS dispositivos (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  empresa_id BIGINT NOT NULL,
  id_externo VARCHAR(64) UNIQUE,
  nome VARCHAR(120) NOT NULL,
  localizacao VARCHAR(120),
  status ENUM('ativo','inativo','manutencao') DEFAULT 'ativo',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dispositivos_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_dispositivos_empresa ON dispositivos (empresa_id);
CREATE INDEX idx_dispositivos_status ON dispositivos (status);

-- 3) SENSORES
CREATE TABLE IF NOT EXISTS sensores (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dispositivo_id BIGINT NOT NULL,
  tipo ENUM('temperatura','vibracao','outro') NOT NULL,
  unidade VARCHAR(16) NOT NULL,
  rotulo VARCHAR(80),
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sensores_dispositivo
    FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_sensor_dispositivo_tipo_rotulo (dispositivo_id, tipo, rotulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_sensores_dispositivo ON sensores (dispositivo_id);
CREATE INDEX idx_sensores_tipo ON sensores (tipo);

-- 4) LEITURAS
CREATE TABLE IF NOT EXISTS leituras (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sensor_id BIGINT NOT NULL,
  momento DATETIME(3) NOT NULL,
  valor DOUBLE NOT NULL,
  meta JSON NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leituras_sensor
    FOREIGN KEY (sensor_id) REFERENCES sensores(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_leituras_sensor_momento ON leituras (sensor_id, momento);
CREATE INDEX idx_leituras_momento_desc ON leituras (momento DESC);

-- 5) LIMITES
CREATE TABLE IF NOT EXISTS limites (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sensor_id BIGINT NOT NULL UNIQUE,
  valor_minimo DOUBLE NULL,
  valor_maximo DOUBLE NULL,
  atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_limites_sensor
    FOREIGN KEY (sensor_id) REFERENCES sensores(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6) ALERTAS
CREATE TABLE IF NOT EXISTS alertas (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  leitura_id BIGINT NOT NULL,
  sensor_id BIGINT NOT NULL,
  tipo ENUM('temperatura','vibracao','outro') NOT NULL,
  nivel ENUM('baixo','normal','alto','critico') NOT NULL,
  mensagem VARCHAR(255),
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alertas_leitura
    FOREIGN KEY (leitura_id) REFERENCES leituras(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_alertas_sensor
    FOREIGN KEY (sensor_id) REFERENCES sensores(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_alertas_sensor ON alertas (sensor_id);
CREATE INDEX idx_alertas_tipo ON alertas (tipo);
CREATE INDEX idx_alertas_nivel ON alertas (nivel);
CREATE INDEX idx_alertas_criado_em ON alertas (criado_em);

-- 7) VIEW: última leitura por sensor
CREATE OR REPLACE VIEW vw_ultima_leitura_por_sensor AS
SELECT l1.*
FROM leituras l1
JOIN (
  SELECT sensor_id, MAX(momento) AS max_momento
  FROM leituras
  GROUP BY sensor_id
) l2 ON l1.sensor_id = l2.sensor_id AND l1.momento = l2.max_momento;

/* OBS: o trigger será aplicado num arquivo separado (add-trigger.sql) */
