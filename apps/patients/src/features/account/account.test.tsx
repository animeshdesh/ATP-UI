import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockPushEndpoints } from '@/api/mock/patients';
import { renderApp, signInAs } from '@/test/render';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = IPHONE_SAFARI.replace('Version/18.0', 'CriOS/130.0.0.0');
const jsdomAgent = navigator.userAgent;

function pretend(userAgent: string, standalone = false) {
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
  Object.defineProperty(navigator, 'standalone', { value: standalone, configurable: true });
}

describe('my account', () => {
  it('opens from the header avatar and changes the password', async () => {
    await signInAs('therapist');
    const { user, router } = renderApp('/patients');
    const [avatar] = await screen.findAllByRole('link', { name: 'My account' });
    await user.click(avatar!);
    expect(router.state.location.pathname).toBe('/account');

    const form = within(await screen.findByRole('region', { name: 'Password' }));
    await user.type(form.getByLabelText('Current password'), 'wrong');
    await user.type(form.getByLabelText('New password'), 'short');
    await user.click(form.getByRole('button', { name: 'Change password' }));
    expect(form.getByRole('alert')).toHaveTextContent('Use at least 8 characters.');

    await user.type(form.getByLabelText('New password'), '-and-long');
    await user.type(form.getByLabelText('Repeat new password'), 'short-and-long');
    await user.click(form.getByRole('button', { name: 'Change password' }));
    expect(await form.findByRole('alert')).toHaveTextContent('Current password is wrong.');

    await user.clear(form.getByLabelText('Current password'));
    await user.type(form.getByLabelText('Current password'), 'old-password');
    await user.click(form.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Password changed')).toBeInTheDocument();
    expect(form.getByLabelText('Current password')).toHaveValue('');
  });

  it('renames you everywhere the session name shows', async () => {
    await signInAs('frontdesk');
    const { user } = renderApp('/account');
    const name = await screen.findByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Pooja S. Shinde');
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Name saved')).toBeInTheDocument();
    // Sidebar footer and the account card.
    expect((await screen.findAllByText('Pooja S. Shinde')).length).toBeGreaterThanOrEqual(2);
  });
});

describe('install tip', () => {
  afterEach(() => pretend(jsdomAgent));

  it('shows on iPhone Safari until dismissed', async () => {
    pretend(IPHONE_SAFARI);
    const { user, unmount } = renderApp('/login');
    const tip = await screen.findByRole('note', { name: 'Install the app' });
    expect(tip).toHaveTextContent('Install ATP Patients: tap Share, then Add to Home Screen');
    await user.click(within(tip).getByRole('button', { name: 'Hide install tip' }));
    expect(screen.queryByRole('note', { name: 'Install the app' })).not.toBeInTheDocument();
    unmount();
    renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    expect(screen.queryByRole('note', { name: 'Install the app' })).not.toBeInTheDocument();
  });

  it('stays hidden when installed, in Chrome on iPhone, and on desktop', async () => {
    for (const [agent, standalone] of [
      [IPHONE_SAFARI, true],
      [IPHONE_CHROME, false],
      [jsdomAgent, false],
    ] as const) {
      pretend(agent, standalone);
      const { unmount } = renderApp('/login');
      await screen.findByRole('heading', { name: 'Sign in' });
      expect(screen.queryByRole('note', { name: 'Install the app' })).not.toBeInTheDocument();
      unmount();
    }
  });
});

/** A browser with push support: a service worker registration whose PushManager we control. */
function fakePushBrowser() {
  let current: PushSubscription | null = null;
  const sub = {
    endpoint: 'https://push.example.test/send/abc',
    toJSON: () => ({ endpoint: sub.endpoint, keys: { p256dh: 'BPk3', auth: 'aGk' } }),
    unsubscribe: async () => {
      current = null;
      return true;
    },
  } as unknown as PushSubscription;
  const reg = {
    pushManager: {
      getSubscription: async () => current,
      subscribe: async () => (current = sub),
    },
  };
  const requestPermission = vi.fn(async () => 'granted');
  Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true });
  Object.defineProperty(window, 'Notification', {
    value: { permission: 'default', requestPermission },
    configurable: true,
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve(reg), getRegistration: async () => reg },
    configurable: true,
  });
  return () => {
    for (const k of ['PushManager', 'Notification'] as const) delete (window as never)[k];
    delete (navigator as never)['serviceWorker'];
  };
}

describe('new request notifications (D-054)', () => {
  afterEach(() => pretend(jsdomAgent));

  it('turns alerts on and off for this phone, and drops them on sign-out', async () => {
    const restore = fakePushBrowser();
    try {
      await signInAs('frontdesk');
      const { user } = renderApp('/account');
      const box = within(await screen.findByRole('region', { name: 'Notifications' }));
      expect(await box.findByText('Off for this phone.')).toBeInTheDocument();
      await user.click(box.getByRole('button', { name: 'Turn on' }));
      expect(await box.findByText('On for this phone.')).toBeInTheDocument();
      expect(mockPushEndpoints()).toEqual(['https://push.example.test/send/abc']);

      await user.click(screen.getAllByRole('button', { name: 'Sign out' })[0]!);
      await screen.findByRole('heading', { name: 'Sign in' });
      expect(mockPushEndpoints()).toEqual([]);
    } finally {
      restore();
    }
  });

  it('asks iPhone users to install the app first', async () => {
    pretend(IPHONE_SAFARI);
    await signInAs('owner');
    renderApp('/account');
    const box = within(await screen.findByRole('region', { name: 'Notifications' }));
    expect(
      await box.findByText('On iPhone, notifications work only in the installed app.'),
    ).toBeInTheDocument();
    expect(box.getByText(/Then open it from the home screen/)).toBeInTheDocument();
  });

  it('is not offered to a therapist, who has no request queue', async () => {
    await signInAs('therapist');
    renderApp('/account');
    await screen.findByRole('region', { name: 'Password' });
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('nudges once on the request queue while alerts are off', async () => {
    const restore = fakePushBrowser();
    try {
      await signInAs('frontdesk');
      const { user, unmount } = renderApp('/inquiries');
      const nudge = await screen.findByRole('note', { name: 'Phone alerts' });
      await user.click(within(nudge).getByRole('button', { name: 'Not now' }));
      expect(screen.queryByRole('note', { name: 'Phone alerts' })).not.toBeInTheDocument();
      unmount();
      renderApp('/inquiries');
      await screen.findByRole('tablist', { name: 'Status' });
      expect(screen.queryByRole('note', { name: 'Phone alerts' })).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });
});
