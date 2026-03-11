import React from 'react';
import { render, screen } from '@testing-library/react';
import { PersonalKanbanTablet } from '../PersonalKanbanTablet';

describe('PersonalKanbanTablet', () => {
  it('renders the default board shell with three columns', () => {
    const state = PersonalKanbanTablet.createInitialState();

    render(PersonalKanbanTablet.render(state, jest.fn()) as React.ReactElement);

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows an empty state in each default column', () => {
    const state = PersonalKanbanTablet.createInitialState();

    render(PersonalKanbanTablet.render(state, jest.fn()) as React.ReactElement);

    expect(screen.getAllByText('No cards yet')).toHaveLength(3);
    expect(screen.getAllByText('Add a card to get started')).toHaveLength(3);
  });

  it('falls back to the default board when deserializing invalid state', () => {
    const state = PersonalKanbanTablet.deserializeState('not-json');

    expect(state).toEqual(PersonalKanbanTablet.createInitialState());
  });
});
