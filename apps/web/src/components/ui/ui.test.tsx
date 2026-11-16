import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppLayout } from '../AppLayout';
import { t } from '../../i18n';
import { Button } from './Button';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { XpBadge } from './XpBadge';

describe('Button', () => {
  it('dispara onClick e usa variante primária por padrão', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continuar</Button>);
    const button = screen.getByRole('button', { name: 'Continuar' });
    expect(button).toHaveAttribute('data-variant', 'primary');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('desabilitado usa aria-disabled, continua focável e não dispara', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Continuar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Continuar' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.tab();
    expect(button).toHaveFocus();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading mostra texto, aria-busy e bloqueia o clique', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    );
    const button = screen.getByRole('button', { name: t('ui.loading') });
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fullWidth e variantes viram atributos', () => {
    render(
      <Button variant="ghost" fullWidth>
        X
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-full', 'true');
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'ghost');
  });
});

describe('Card', () => {
  it('flat renderiza conteúdo sem papel interativo', () => {
    render(<Card>Conteúdo</Card>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('interactive vira botão com aria-pressed e mostra selecionado com texto', async () => {
    const onClick = vi.fn();
    render(
      <Card variant="interactive" selected onClick={onClick}>
        Opção
      </Card>,
    );
    const card = screen.getByRole('button', { name: new RegExp(t('ui.selected')) });
    expect(card).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('interactive com href vira link', () => {
    render(
      <Card variant="interactive" href="/x">
        Ir
      </Card>,
    );
    expect(screen.getByRole('link', { name: 'Ir' })).toHaveAttribute('href', '/x');
  });

  it('interactive desabilitado não dispara', async () => {
    const onClick = vi.fn();
    render(
      <Card variant="interactive" disabled onClick={onClick}>
        Opção
      </Card>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('estados loading, empty e error', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<Card status="loading">x</Card>);
    expect(screen.getByRole('status')).toHaveTextContent(t('ui.loading'));
    rerender(<Card status="empty">x</Card>);
    expect(screen.getByText(t('ui.empty'))).toBeInTheDocument();
    rerender(
      <Card status="error" onRetry={onRetry}>
        x
      </Card>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(t('ui.error'));
    await userEvent.click(screen.getByRole('button', { name: t('ui.retry') }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('ProgressBar', () => {
  it('expõe progressbar com valor e limita a 0-100', () => {
    const { rerender } = render(<ProgressBar value={40} label="Lição" />);
    const bar = screen.getByRole('progressbar', { name: 'Lição' });
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(screen.queryByText(t('ui.complete'))).toBeNull();
    rerender(<ProgressBar value={250} label="Lição" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('100% mostra ícone e texto de concluído', () => {
    render(<ProgressBar value={100} label="Lição" />);
    expect(screen.getByText(t('ui.complete'))).toBeInTheDocument();
  });

  it('indeterminada não tem aria-valuenow', () => {
    render(<ProgressBar indeterminate label="Carregando" tone="unit" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('data-tone', 'unit');
  });
});

describe('XpBadge', () => {
  it('mostra valor e XP; zero é válido; sem ganho a região live fica vazia', () => {
    render(<XpBadge value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(t('ui.xp'))).toBeInTheDocument();
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('');
  });

  it('ganho anuncia por aria-live e mostra +N', () => {
    render(<XpBadge value={30} gained={10} />);
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Você ganhou 10 XP');
  });
});

describe('abertura Afinação', () => {
  const renderHome = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout />
      </MemoryRouter>,
    );

  it('toca na primeira vez da sessão e não repete', () => {
    sessionStorage.clear();
    const first = renderHome();
    expect(first.container.firstElementChild).toHaveAttribute('data-opening', 'play');
    first.unmount();
    const second = renderHome();
    expect(second.container.firstElementChild).toHaveAttribute('data-opening', 'off');
  });
});
