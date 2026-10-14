import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { api } from '@/api';
import { Providers, makeQueryClient } from '@/app/Providers';
import { routes } from '@/app/router';
import type { RoleKey } from '@/domain/types';

/** Mock-mode sign-in before rendering. */
export const signInAs = (role: RoleKey) =>
  api.signIn({ identifier: 'dev@atp.local', password: 'x', devRole: role });

export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });
  const user = userEvent.setup();
  const utils = render(
    <Providers client={client}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...utils, user, router };
}
