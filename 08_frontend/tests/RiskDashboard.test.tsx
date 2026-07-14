import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simulation (Mock) d'un composant Dashboard car nous voulons tester
// la logique d'alerte sur la Data Quality.
// Dans le vrai projet, on importerait `import RiskDashboard from '@/components/RiskDashboard'`
const RiskDashboard = ({ scoreResult }: { scoreResult: any }) => {
  const { pdScore, qualityBand, imputedFeaturesCount } = scoreResult;

  return (
    <div data-testid="risk-dashboard">
      <h1>Risk Analysis Result</h1>
      <p data-testid="pd-score">PD: {pdScore.toFixed(2)}%</p>
      
      {qualityBand === 'LOW' && imputedFeaturesCount > 100 && (
        <div data-testid="quality-alert" className="alert-danger">
          WARNING: High imputation burden ({imputedFeaturesCount} features).
          The model result may be unreliable.
        </div>
      )}
    </div>
  );
};

describe('RiskDashboard Component', () => {
  it('should render the PD Score correctly', () => {
    const mockData = {
      pdScore: 2.345,
      qualityBand: 'HIGH',
      imputedFeaturesCount: 5,
    };

    render(<RiskDashboard scoreResult={mockData} />);
    
    expect(screen.getByTestId('pd-score')).toHaveTextContent('PD: 2.35%');
    expect(screen.queryByTestId('quality-alert')).not.toBeInTheDocument();
  });

  it('should display a critical warning when data quality is LOW and heavily imputed', () => {
    const mockData = {
      pdScore: 4.5,
      qualityBand: 'LOW',
      imputedFeaturesCount: 125, // Above threshold
    };

    render(<RiskDashboard scoreResult={mockData} />);
    
    const alert = screen.getByTestId('quality-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('WARNING: High imputation burden (125 features)');
  });
});
