import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import status from './routes/status';
import empresas from './routes/empresas';
import dispositivos from './routes/dispositivos';
import sensores from './routes/sensores';
import leituras from './routes/leituras';
import limites from './routes/limites';

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'predictas-api' });
});

app.use('/status', status);
app.use('/empresas', empresas);
app.use('/dispositivos', dispositivos);
app.use('/sensores', sensores);
app.use('/leituras', leituras);
app.use('/limites', limites);

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
