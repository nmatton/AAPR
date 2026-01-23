import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamNameEditor } from './TeamNameEditor';

describe('TeamNameEditor Component', () => {
  const mockOnChange = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input field with current value', () => {
    render(
      <TeamNameEditor
        value="Test Team"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    expect(screen.getByDisplayValue('Test Team')).toBeInTheDocument();
  });

  it('displays character count', () => {
    render(
      <TeamNameEditor
        value="Test Team"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    expect(screen.getByText('9/50')).toBeInTheDocument();
  });

  it('calls onChange when input changes', () => {
    render(
      <TeamNameEditor
        value="Test"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Team' } });

    expect(mockOnChange).toHaveBeenCalledWith('New Team');
  });

  it('calls onSave when checkmark button clicked with valid input', () => {
    render(
      <TeamNameEditor
        value="Valid Team Name"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    const saveButton = screen.getByLabelText('Save team name');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('disables save button when name is too short', () => {
    render(
      <TeamNameEditor
        value="AB"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    const saveButton = screen.getByLabelText('Save team name');
    expect(saveButton).toBeDisabled();
  });

  it('disables save button when name exceeds 50 characters', () => {
    const longName = 'A'.repeat(51);
    render(
      <TeamNameEditor
        value={longName}
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    const saveButton = screen.getByLabelText('Save team name');
    expect(saveButton).toBeDisabled();
  });

  it('calls onCancel when X button clicked', () => {
    render(
      <TeamNameEditor
        value="Test Team"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    const cancelButton = screen.getByLabelText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onSave when Enter pressed and input is valid', () => {
    render(
      <TeamNameEditor
        value="Valid Team"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('calls onCancel when Escape pressed', () => {
    render(
      <TeamNameEditor
        value="Test Team"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables buttons while saving', () => {
    render(
      <TeamNameEditor
        value="Test Team"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={true}
      />
    );

    const saveButton = screen.getByLabelText('Save team name');
    const cancelButton = screen.getByLabelText('Cancel');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('truncates input to 50 characters on client side', () => {
    render(
      <TeamNameEditor
        value={'A'.repeat(50)}
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isSaving={false}
      />
    );

    expect(screen.getByText('50/50')).toBeInTheDocument();
  });
});
