/* ===== Seed idempotente Predictas ===== */

/* 1) EMPRESA (chave única: cnpj) */
INSERT INTO empresas (nome, cnpj, responsavel, telefone, email)
VALUES ('Empresa Demo', '00.000.000/0001-00', 'Heloísa', '(11) 99999-0000', 'demo@empresa.com')
ON DUPLICATE KEY UPDATE
  id = LAST_INSERT_ID(id),               -- pega o id existente
  nome = VALUES(nome),
  responsavel = VALUES(responsavel),
  telefone = VALUES(telefone),
  email = VALUES(email);
SET @empresa_id := LAST_INSERT_ID();

/* 2) DISPOSITIVO (chave única: id_externo) */
INSERT INTO dispositivos (empresa_id, id_externo, nome, localizacao, status)
VALUES (@empresa_id, 'MOTOR-TESTE', 'Motor de Teste', 'Linha 1', 'ativo')
ON DUPLICATE KEY UPDATE
  id = LAST_INSERT_ID(id),
  empresa_id = VALUES(empresa_id),
  nome = VALUES(nome),
  localizacao = VALUES(localizacao),
  status = VALUES(status);
SET @disp_id := LAST_INSERT_ID();

/* 3) SENSORES (chave única: uq_sensor_dispositivo_tipo_rotulo) */
INSERT INTO sensores (dispositivo_id, tipo, unidade, rotulo)
VALUES (@disp_id, 'temperatura', '°C', 'Carcaça')
ON DUPLICATE KEY UPDATE
  id = LAST_INSERT_ID(id),
  unidade = VALUES(unidade);
SET @sensor_temp_id := LAST_INSERT_ID();

INSERT INTO sensores (dispositivo_id, tipo, unidade, rotulo)
VALUES (@disp_id, 'vibracao', 'mm/s', 'Rolamento A')
ON DUPLICATE KEY UPDATE
  id = LAST_INSERT_ID(id),
  unidade = VALUES(unidade);
SET @sensor_vib_id := LAST_INSERT_ID();

/* 4) LIMITES (chave única: sensor_id) */
INSERT INTO limites (sensor_id, valor_minimo, valor_maximo)
VALUES (@sensor_temp_id, 20.0, 80.0)
ON DUPLICATE KEY UPDATE
  valor_minimo = VALUES(valor_minimo),
  valor_maximo = VALUES(valor_maximo);

INSERT INTO limites (sensor_id, valor_minimo, valor_maximo)
VALUES (@sensor_vib_id, 0.0, 7.1)
ON DUPLICATE KEY UPDATE
  valor_minimo = VALUES(valor_minimo),
  valor_maximo = VALUES(valor_maximo);

/* 5) LEITURAS (sempre insere novas) */
INSERT INTO leituras (sensor_id, momento, valor) VALUES
  (@sensor_temp_id, NOW(3), 95.2),  -- deve gerar alerta (alto/critico)
  (@sensor_vib_id,  NOW(3), 3.5);   -- normal

/* 6) Conferências */
SELECT sensor_id, momento, valor
FROM vw_ultima_leitura_por_sensor
ORDER BY sensor_id;

SELECT id, leitura_id, sensor_id, tipo, nivel, mensagem, criado_em
FROM alertas
ORDER BY id DESC
LIMIT 10;
