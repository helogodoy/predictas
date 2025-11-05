/* Trigger Predictas – single-statement (compatível com mysql2) */
DROP TRIGGER IF EXISTS trg_leituras_after_insert_alerta;

CREATE TRIGGER trg_leituras_after_insert_alerta
AFTER INSERT ON leituras
FOR EACH ROW
INSERT INTO alertas (leitura_id, sensor_id, tipo, nivel, mensagem)
SELECT
  NEW.id,
  NEW.sensor_id,
  s.tipo,
  CASE
    WHEN l.valor_minimo IS NOT NULL AND NEW.valor < l.valor_minimo THEN 'baixo'
    WHEN l.valor_maximo IS NOT NULL AND NEW.valor > (l.valor_maximo * 1.10) THEN 'critico'
    WHEN l.valor_maximo IS NOT NULL AND NEW.valor > l.valor_maximo THEN 'alto'
    ELSE 'normal'
  END AS nivel,
  CONCAT(
    'Leitura fora do limite: valor=', NEW.valor,
    ' (min=', IFNULL(l.valor_minimo, 'NA'),
    ', max=', IFNULL(l.valor_maximo, 'NA'), ')'
  ) AS mensagem
FROM sensores s
LEFT JOIN limites l ON l.sensor_id = s.id
WHERE s.id = NEW.sensor_id
  AND (
       (l.valor_minimo IS NOT NULL AND NEW.valor < l.valor_minimo)
    OR (l.valor_maximo IS NOT NULL AND NEW.valor > l.valor_maximo)
    OR (l.valor_maximo IS NOT NULL AND NEW.valor > (l.valor_maximo * 1.10))
  );