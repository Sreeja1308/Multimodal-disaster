import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the dashboard heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /command dashboard/i })).toBeInTheDocument();
  });

  it('renders a page for every navigation item', () => {
    render(<App />);
    const pages = [
      ['Disaster map', 'disaster map'],
      ['Incidents', 'incidents'],
      ['Resource allocation', 'resource allocation'],
      ['Alert center', 'alert center'],
      ['Flood prediction', 'flood prediction'],
      ['Image analysis', 'image analysis'],
      ['Emergency reports', 'emergency reports'],
      ['Model performance', 'model performance'],
      ['Settings', 'settings'],
    ];

    for (const [buttonName, headingName] of pages) {
      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      expect(screen.getByRole('heading', { name: new RegExp(headingName, 'i') })).toBeInTheDocument();
    }
  });
});
