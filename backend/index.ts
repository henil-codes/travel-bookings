import { buildApp } from './src/app';

const startServer = async () => {
  const app = buildApp();

  try {
    const port = parseInt(process.env.PORT!, 10);

    if (isNaN(port)) {
      throw new Error('PORT environment variable is not set or invalid');
    }

    await app.ready(); // ensure all plugins are loaded
    console.log(app.printRoutes());

    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server is running on port ${port}`);

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.on(signal, async () => {
        try {
          await app.close();
          process.exit(0);
        } catch (error) {
          app.log.error(error);
          process.exit(1);
        }
      });
    }
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

startServer();
