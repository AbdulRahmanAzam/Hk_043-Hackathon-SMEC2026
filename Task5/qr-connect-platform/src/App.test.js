import { render, screen } from '@testing-library/react';
import App from './App';

// Updated to assert our app header and network indicator

test('renders app title and network status', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /QR Connect/i })).toBeInTheDocument();
  expect(screen.getByText(/Network/i)).toBeInTheDocument();
});
