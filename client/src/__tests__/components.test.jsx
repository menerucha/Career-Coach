import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog, CopyButton, EmptyState, ErrorAlert, QuotaBadge, ScenarioPicker, ScoreRing, TagInput, EngineBadge } from '@/components/common.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ApiError } from '@/lib/api.js';
import { cn } from '@/lib/utils';
import { fakeApi, renderApp } from './helpers.jsx';

function Tags(props) { const [v, setV] = useState(props.initial || []); return <><TagInput id="t" value={v} onChange={(x) => { setV(x); props.spy?.(x); }} {...props.extra} /><output data-testid="out">{JSON.stringify(v)}</output></>; }
const out = () => JSON.parse(screen.getByTestId('out').textContent);

describe('TagInput', () => {
  it('adds on Enter and comma, trims, de-duplicates case-insensitively', async () => {
    render(<Tags />); const input = screen.getByRole('textbox');
    await userEvent.type(input, 'SQL{Enter}'); await userEvent.type(input, ' python ,'); await userEvent.type(input, 'sql{Enter}');
    expect(out()).toEqual(['SQL', 'python']);
  });
  it('removes with the x button and with Backspace on an empty input', async () => {
    render(<Tags initial={['a', 'b', 'c']} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove b' })); expect(out()).toEqual(['a', 'c']);
    await userEvent.click(screen.getByRole('textbox')); await userEvent.keyboard('{Backspace}'); expect(out()).toEqual(['a']);
  });
  it('handles pasted lists, adds on blur, and respects max', async () => {
    render(<Tags extra={{ max: 3 }} />); const input = screen.getByRole('textbox');
    await userEvent.click(input); await userEvent.paste('one, two\nthree, four'); expect(out()).toEqual(['one', 'two', 'three']);
    await userEvent.type(input, 'five'); await userEvent.tab(); expect(out()).toHaveLength(3);
  });
});

describe('ScoreRing', () => {
  it('is accessible, clamps values and colours by band', () => {
    const { rerender, container } = render(<ScoreRing value={85} label="Overall" />);
    expect(screen.getByRole('img', { name: 'Overall: 85 out of 100' })).toBeInTheDocument(); expect(container.querySelector('.stroke-success')).toBeTruthy();
    rerender(<ScoreRing value={65} />); expect(container.querySelector('.stroke-warning')).toBeTruthy();
    rerender(<ScoreRing value={12} />); expect(container.querySelector('.stroke-destructive')).toBeTruthy();
    rerender(<ScoreRing value={250} />); expect(screen.getByRole('img')).toHaveAccessibleName('Score: 100 out of 100');
    rerender(<ScoreRing value={-5} />); expect(screen.getByRole('img')).toHaveAccessibleName('Score: 0 out of 100');
  });
});

describe('ConfirmDialog / CopyButton / ErrorAlert / badges', () => {
  it('ConfirmDialog confirms and cancels', async () => {
    const onConfirm = vi.fn(), onOpenChange = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Delete?" description="Sure?" onConfirm={onConfirm} />);
    expect(screen.getByRole('dialog', { name: 'Delete?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' })); expect(onConfirm).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it('CopyButton writes to the clipboard and confirms', async () => {
    const writeText = vi.fn(async () => {}); Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<CopyButton text="hello" />); await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('hello'); expect(await screen.findByText('Copied')).toBeInTheDocument();
  });
  it('ErrorAlert shows the message and only offers retry for retryable errors', async () => {
    const retry = vi.fn();
    const { rerender } = render(<ErrorAlert error={new ApiError(502, 'AI_UNAVAILABLE', 'AI is down')} onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('AI is down'); await userEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(retry).toHaveBeenCalled();
    rerender(<ErrorAlert error={new ApiError(429, 'DAILY_LIMIT', 'Daily limit of 25 analyses reached.')} onRetry={retry} />);
    expect(screen.getByText('Limit reached')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    rerender(<ErrorAlert error={new ApiError(400, 'BAD_REQUEST', 'Bad')} onRetry={retry} />); expect(screen.getByText('Please check your input')).toBeInTheDocument();
    rerender(<ErrorAlert error={null} />); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('QuotaBadge and EngineBadge communicate state', () => {
    const { rerender } = render(<QuotaBadge quota={{ limit: 25, used: 5, remaining: 20 }} />); expect(screen.getByText('20/25 analyses left today')).toBeInTheDocument();
    rerender(<QuotaBadge quota={{ limit: 25, used: 25, remaining: 0 }} />); expect(screen.getByText('0/25 analyses left today').className).toMatch(/destructive/);
    rerender(<EngineBadge engine="mock" />); expect(screen.getByText('Offline demo engine')).toBeInTheDocument();
    rerender(<EngineBadge engine="openai" model="gpt-4o-mini" />); expect(screen.getByText('AI · gpt-4o-mini')).toBeInTheDocument();
  });
  it('EmptyState renders title, description and action', () => { render(<EmptyState title="Nothing" description="Try later"><Button>Go</Button></EmptyState>); expect(screen.getByText('Nothing')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument(); });
});

describe('ScenarioPicker', () => {
  it('loads scenarios, toggles selection and shows the description', async () => {
    const onChange = vi.fn(); const api = fakeApi();
    function Wrap() { const [v, setV] = useState(''); return <ScenarioPicker value={v} onChange={(id, sc) => { onChange(id, sc); setV(id); }} />; }
    renderApp(<Wrap />, { api });
    const chip = await screen.findByRole('button', { name: 'Career changer' }); expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip); expect(chip).toHaveAttribute('aria-pressed', 'true'); expect(screen.getByText('Moving into a new field.')).toBeInTheDocument(); expect(onChange).toHaveBeenLastCalledWith('career-changer', expect.objectContaining({ id: 'career-changer' }));
    await userEvent.click(chip); expect(chip).toHaveAttribute('aria-pressed', 'false'); expect(onChange).toHaveBeenLastCalledWith('', expect.anything());
  });
});

describe('shadcn-style primitives', () => {
  it('cn resolves conflicting Tailwind classes', () => expect(cn('px-2 py-1', 'px-4', false && 'x', 'text-sm')).toBe('py-1 px-4 text-sm'));
  it('Button variants, disabled state and asChild', async () => {
    const onClick = vi.fn(); const { rerender } = render(<Button variant="destructive" onClick={onClick}>Go</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-destructive/); await userEvent.click(screen.getByRole('button')); expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<Button disabled onClick={onClick}>Go</Button>); await userEvent.click(screen.getByRole('button')); expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<Button asChild><a href="/x">Link</a></Button>); expect(screen.getByRole('link', { name: 'Link' })).toHaveAttribute('href', '/x');
  });
  it('Progress exposes its value; Badge/Skeleton/Separator/Alert/Select render', () => {
    render(<><Progress value={42} aria-label="p" /><Badge variant="success">ok</Badge><Skeleton data-testid="sk" /><Separator data-testid="sep" /><Alert variant="warning"><AlertDescription>careful</AlertDescription></Alert><Select aria-label="s" defaultValue="b"><option value="a">A</option><option value="b">B</option></Select></>);
    expect(screen.getByRole('progressbar', { name: 'p' })).toHaveAttribute('aria-valuenow', '42'); expect(screen.getByText('ok').className).toMatch(/success/);
    expect(screen.getByTestId('sk')).toHaveAttribute('aria-hidden', 'true'); expect(screen.getByRole('alert')).toHaveTextContent('careful'); expect(screen.getByLabelText('s')).toHaveValue('b');
  });
  it('Accordion opens and closes; Tabs switch panels', async () => {
    render(<><Accordion type="single" collapsible><AccordionItem value="a"><AccordionTrigger>Q1</AccordionTrigger><AccordionContent>Answer 1</AccordionContent></AccordionItem></Accordion>
      <Tabs defaultValue="one"><TabsList><TabsTrigger value="one">One</TabsTrigger><TabsTrigger value="two">Two</TabsTrigger></TabsList><TabsContent value="one">Panel one</TabsContent><TabsContent value="two">Panel two</TabsContent></Tabs></>);
    expect(screen.queryByText('Answer 1')).not.toBeInTheDocument(); await userEvent.click(screen.getByRole('button', { name: 'Q1' })); expect(await screen.findByText('Answer 1')).toBeInTheDocument();
    expect(screen.getByText('Panel one')).toBeInTheDocument(); await userEvent.click(screen.getByRole('tab', { name: 'Two' })); expect(await screen.findByText('Panel two')).toBeInTheDocument(); expect(screen.queryByText('Panel one')).not.toBeInTheDocument();
  });
});
