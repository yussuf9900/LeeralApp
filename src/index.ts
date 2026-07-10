import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'Leeral Facturation Multi-services' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
