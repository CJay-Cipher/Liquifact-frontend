import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';

// These tests mock `global.fetch` to simulate the backend health endpoint.
// They assert the loading disabled state, button label transitions, and
// JSON rendering for success and network failure outcomes.

describe('Home page API health check', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it('renders health JSON on successful fetch and toggles button label', async () => {
    const mockResponse = { status: 'ok', uptime: 12345 };
    const deferred = createDeferred();

    // Mock fetch to stay pending until the test resolves it.
    global.fetch = jest.fn(() =>
      deferred.promise.then(() => ({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })),
    );

    render(<Home />);

    const user = userEvent.setup();
    const checkButton = screen.getByRole('button', { name: /check backend health/i });

    await user.click(checkButton);

    // The button should become disabled while the fetch is pending.
    await waitFor(() => expect(checkButton).toBeDisabled());
    expect(screen.getByRole('button', { name: /checking…/i })).toBeInTheDocument();

    deferred.resolve();

    const jsonNode = await screen.findByText(/"status": "ok"/i);
    expect(jsonNode).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole('button', { name: /check backend health/i })).toBeEnabled());
  });

  it('renders error object when fetch rejects', async () => {
    const deferred = createDeferred();

    global.fetch = jest.fn(() => deferred.promise);

    render(<Home />);

    const user = userEvent.setup();
    const checkButton = screen.getByRole('button', { name: /check backend health/i });

    await user.click(checkButton);

    await waitFor(() => expect(checkButton).toBeDisabled());
    expect(screen.getByRole('button', { name: /checking…/i })).toBeInTheDocument();

    deferred.reject(new Error('network failure'));

    const errorNode = await screen.findByText(/"status": "error"/i);
    expect(errorNode).toBeInTheDocument();
    expect(errorNode).toHaveTextContent(/network failure/i);
  });
});
