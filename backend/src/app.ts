import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { BoletoController } from './controllers/BoletoController';
import { WebhookController } from './controllers/WebhookController';
import { ConciliacaoDiariaJob } from './jobs/ConciliacaoDiariaJob';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
const router = express.Router();

router.post('/boletos', BoletoController.create);
router.get('/boletos', BoletoController.list);

router.post('/webhooks/bradesco', WebhookController.handleBradesco);

app.use('/api', router);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 3001;

// Start Jobs
ConciliacaoDiariaJob.start();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
