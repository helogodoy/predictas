-- Empresa
INSERT INTO empresas (nome, cnpj, responsavel, telefone, email)
VALUES ('Empresa Demo', '00.000.000/0001-00', 'Heloísa', '(11) 99999-0000', 'demo@empresa.com');
SET @empresa_id := LAST_INSERT_ID();

-- Dispositivo
INSERT INTO dispositivos (empresa_id, id_externo, nome, localizacao)
VALUES (@empresa_id, 'MOTOR-TESTE', 'Motor de Teste', 'Linha 1');
SET @disp_id := LAST_INSERT_ID();

-- Sensores (insere separadamente para capturar IDs)
INSERT INTO sensores (dispositivo_id, tipo, unidade, rotulo)
VALUES (@disp_id, 'temperatura', '°C', 'Carcaça');
SET @sensor_temp_id := LAST_INSERT_ID();

INSERT INTO sensores (dispositivo_id, tipo, unidade, rotulo)
VALUES (@disp_id, 'vibracao', 'mm/s', 'Rolamento A');
SET @sensor_vib_id := LAST_INSERT_ID();

-- Limites
INSERT INTO limites (sensor_id, valor_minimo, valor_maximo)
VALUES (@sensor_temp_id, 20.0, 80.0);

INSERT INTO limites (sensor_id, valor_minimo, valor_maximo)
VALUES (@sensor_vib_id, 0.0, 7.1);

-- Leituras: temperatura fora do limite (gera alerta), vibração normal (não gera)
INSERT INTO leituras (sensor_id, momento, valor)
VALUES (@sensor_temp_id, NOW(3), 95.2);

INSERT INTO leituras (sensor_id, momento, valor)
VALUES (@sensor_vib_id, NOW(3), 3.5);

-- Conferências
SELECT sensor_id, momento, valor
FROM vw_ultima_leitura_por_sensor
ORDER BY sensor_id;

SELECT id, leitura_id, sensor_id, tipo, nivel, mensagem, criado_em
FROM alertas
ORDER BY id DESC
LIMIT 10;
