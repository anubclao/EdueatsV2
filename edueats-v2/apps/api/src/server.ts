import { config } from 'dotenv';
import { createApp } from './app.js';

config();

const app = createApp();
const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`EduEats API v2 running on http://localhost:${port}`);
});
