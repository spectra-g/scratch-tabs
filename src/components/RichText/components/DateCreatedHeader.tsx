import React from 'react';

interface DateCreatedHeaderProps {
  dateCreated: number;
  className?: string;
}

/**
 * DateCreatedHeader - Displays the creation date for a rich text document
 *
 * This component is rendered OUTSIDE of the TipTap editor to avoid complexity
 * with cursor positioning, event handling, and accidental editing/deletion.
 *
 * @param dateCreated - Unix timestamp of when the document was created
 * @param className - Optional additional CSS classes
 */
export const DateCreatedHeader: React.FC<DateCreatedHeaderProps> = ({
  dateCreated,
  className = '',
}) => {
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`text-xs text-muted py-4 px-6 font-medium tracking-wide text-center border-gray-700 ${className}`}
      data-testid="rich-text-date-created"
      role="heading"
      aria-label={`Document created on ${formatDate(dateCreated)}`}
    >
      Created {formatDate(dateCreated)}
    </div>
  );
};
