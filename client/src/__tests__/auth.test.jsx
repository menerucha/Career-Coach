import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DemoAuth } from '@/lib/auth.jsx';
import { useSession } from '@/lib/session.js';
import SignInPage from '@/pages/SignInPage.jsx';
import { RequireAuth } from '@/App.jsx';
import { signedIn } from './helpers.jsx';

function Probe() { const s = useSession(); return <div><span data-testid="who">{s.isSignedIn ? s.user.name : 'anon'}</span><button onClick={s.signOut}>out</button><TokenView /></div>; }
function TokenView() { const s = useSession(); return <button onClick={async () => { document.title = (await s.getToken()) || 'none'; }}>token</button>; }

describe('demo auth', () => {
  it('signs in with a name, exposes a demo token, persists, and signs out', async () => {
    const tree = <MemoryRouter><DemoAuth><SignInPage /><Probe /></DemoAuth></MemoryRouter>;
    const { unmount } = render(tree);
    expect(screen.getByTestId('who')).toHaveTextContent('anon');
    await userEvent.type(screen.getByLabelText('Your name'), 'Alex Rivera'); await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('who')).toHaveTextContent('Alex Rivera');
    await userEvent.click(screen.getByRole('button', { name: 'token' })); expect(document.title).toBe('demo.alexrivera');
    unmount(); render(<MemoryRouter><DemoAuth><Probe /></DemoAuth></MemoryRouter>); expect(screen.getByTestId('who')).toHaveTextContent('Alex Rivera');       // persisted
    await userEvent.click(screen.getByRole('button', { name: 'out' })); await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent('anon'));
    await userEvent.click(screen.getByRole('button', { name: 'token' })); expect(document.title).toBe('none');
  });
  it('rejects names that cannot form a valid demo id', async () => {
    render(<MemoryRouter><DemoAuth><SignInPage /></DemoAuth></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Your name'), '!!'); await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/at least 3 letters or digits/)).toBeInTheDocument();
  });
  it('warns that demo sign-in is not secure', () => { render(<MemoryRouter><DemoAuth><SignInPage /></DemoAuth></MemoryRouter>); expect(screen.getByText(/not secure/i)).toBeInTheDocument(); });
});

describe('RequireAuth', () => {
  const tree = (initial) => <MemoryRouter initialEntries={[initial]}><DemoAuth><Routes><Route path="/sign-in" element={<div>SIGN IN PAGE</div>} /><Route path="/secret" element={<RequireAuth><div>SECRET</div></RequireAuth>} /></Routes></DemoAuth></MemoryRouter>;
  it('redirects signed-out visitors to sign-in', () => { render(tree('/secret')); expect(screen.getByText('SIGN IN PAGE')).toBeInTheDocument(); expect(screen.queryByText('SECRET')).not.toBeInTheDocument(); });
  it('lets signed-in users through', () => { signedIn(); render(tree('/secret')); expect(screen.getByText('SECRET')).toBeInTheDocument(); });
});
