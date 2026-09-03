import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useLanguage } from './LanguageContext';

function LanguageProbe() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="label">{t('logout')}</span>
      <button type="button" onClick={() => setLanguage('en')}>
        EN
      </button>
      <button type="button" onClick={() => setLanguage('it')}>
        IT
      </button>
    </div>
  );
}

describe('LanguageProvider persistence', () => {
  it('defaults to Italian and keeps English after a remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('language')).toHaveTextContent('it');
    expect(localStorage.getItem('casazero_language')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByTestId('language')).toHaveTextContent('en');
    expect(localStorage.getItem('casazero_language')).toBe('en');
    expect(screen.getByTestId('label')).toHaveTextContent('Logout');

    unmount();

    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('language')).toHaveTextContent('en');
    expect(screen.getByTestId('label')).toHaveTextContent('Logout');
  });
});
