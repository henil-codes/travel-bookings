import { buildApp } from './src/app';

const startServer = async () => {
  const app = buildApp();

  try {
    const port = parseInt(process.env.PORT || '4000', 10);
    await app.listen({ port });
    console.log(`Server is running on port ${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

startServer();