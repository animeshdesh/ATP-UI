import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import './styles.css';
import { Providers, makeQueryClient } from '@atp/core';
import { brand } from './app/brand';
import { createRouter } from './app/router';

async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKING !== 'true') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ quiet: true });
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers client={makeQueryClient()} brand={brand}>
        <RouterProvider router={createRouter()} />
      </Providers>
    </StrictMode>,
  );
});
